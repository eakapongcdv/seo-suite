// app/api/screenshot/route.ts
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ===== Tunables ===== */
const CFG = {
  viewport: { width: 1200, height: 800 },
  overlap: { xRatio: 0.08, yRatio: 0.14, maxPx: 220 },
  settlePerTileMs: 140,
  maxTiles: 14_000,

  prewarm: {
    stepPx: 1200,
    stepWaitMs: 100,
    bottomExtraWaitMs: 700,
    topExtraWaitMs: 200,
    maxLoops: 7000,
  },

  softIdle: { quietMs: 600, maxInflight: 2, maxWindowMs: 10_000 },

  cssFreeze: `
    * { animation: none !important; transition: none !important; }
    * { background-attachment: initial !important; will-change: auto !important; }
    * { caret-color: transparent !important; }
    ::selection { background: transparent !important; }
    html, body { scroll-behavior: auto !important; overscroll-behavior: none !important; }
    ::-webkit-scrollbar { display: none !important; width:0 !important; height:0 !important; }
    html { scrollbar-width: none !important; }
    *:hover, *:focus, *:active { outline: none !important; }
    * { pointer-events: none !important; }
  `,

  mediaFlags: {
    pauseVideo: true,
    freezeGif: true,
    stopLottie: true,
    stopAnimatedSvg: true,
  },
};

/** ==== helpers: request tracker for soft-idle ==== */
function attachRequestTracker(page: any) {
  let inflight = 0;
  const inc = () => (inflight++);
  const dec = () => (inflight = Math.max(0, inflight - 1));
  page.on("request", inc);
  page.on("requestfinished", dec);
  page.on("requestfailed", dec);
  return {
    getInflight: () => inflight,
    detach: () => {
      page.off("request", inc);
      page.off("requestfinished", dec);
      page.off("requestfailed", dec);
    },
  };
}
async function waitForSoftIdle(page: any) {
  const { quietMs, maxInflight, maxWindowMs } = CFG.softIdle;
  const started = Date.now();
  let windowStart = Date.now();
  const tracker = attachRequestTracker(page);
  try {
    while (Date.now() - started < maxWindowMs) {
      if (tracker.getInflight() <= maxInflight) {
        if (Date.now() - windowStart >= quietMs) return;
      } else {
        windowStart = Date.now();
      }
      await page.waitForTimeout(60);
    }
  } finally {
    tracker.detach();
  }
}

/** ==== page prep ==== */
async function normalizeMediaAndFonts(page: any) {
  try { await page.emulateMedia({ reducedMotion: "no-preference", media: "screen" }); } catch {}
  try {
    await page.evaluate(async () => {
      // @ts-ignore
      if (document?.fonts?.ready && typeof document.fonts.ready.then === "function") {
        // @ts-ignore
        await document.fonts.ready;
      }
    });
  } catch {}
}
async function freezeMotionMedia(page: any) {
  await page.evaluate(async (flags: typeof CFG.mediaFlags) => {
    try {
      if (flags.pauseVideo) {
        document.querySelectorAll("video").forEach(v => { try { v.pause(); v.muted = true; v.currentTime = v.currentTime; } catch {} });
      }
      if (flags.stopLottie) {
        // @ts-ignore
        (window as any).lottie?.web?.animations?.forEach?.((a:any)=>a?.pause?.());
        document.querySelectorAll<HTMLElement>("[data-lottie], lottie-player").forEach((n:any)=>{ try{ n.pause?.(); }catch{} });
      }
      if (flags.stopAnimatedSvg) {
        document.querySelectorAll("svg").forEach(svg => {
          try {
            const clone = svg.cloneNode(true) as SVGElement;
            clone.querySelectorAll('animate,animateTransform,animateMotion,set').forEach(n=>n.remove());
            svg.replaceWith(clone);
          } catch {}
        });
      }
      if (flags.freezeGif) {
        const imgs = Array.from(document.images).filter(img => /\.gif(\?|$)/i.test(img.src));
        await Promise.all(imgs.map(async (img) => {
          try {
            const c = document.createElement("canvas");
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            c.width = w; c.height = h;
            const ctx = c.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, w, h);
            const dataURL = c.toDataURL("image/png");
            img.srcset = "";
            img.src = dataURL;
          } catch {}
        }));
      }
    } catch {}
  }, CFG.mediaFlags);
}
async function prewarmPage(page: any) {
  const P = CFG.prewarm;
  try { await page.addStyleTag({ content: `html,body{scroll-behavior:auto !important;}` }); } catch {}
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(P.topExtraWaitMs);

  let loops = 0;
  while (loops++ < P.maxLoops) {
    const { y, h, totalH } = await page.evaluate(() => ({
      y: window.scrollY,
      h: window.innerHeight,
      totalH: Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      ),
    }));
    if (y + h >= totalH) break;
    const nextY = Math.min(y + P.stepPx, totalH - h);
    await page.evaluate((p: { y: number }) => window.scrollTo(0, p.y), { y: nextY });
    await page.waitForTimeout(P.stepWaitMs);
  }

  await page.waitForTimeout(P.bottomExtraWaitMs);
  await waitForSoftIdle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(P.topExtraWaitMs);
}

/** ==== overlay controls (แก้ header ซ้ำใน tile ล่าง) ==== */
async function markHideableOverlays(page: any) {
  await page.evaluate(() => {
    const CANDIDATE = [
      "header",
      ".mui-fixed",
      ".MuiAppBar-root",
      ".navbar-absolute",
      '[class*="AppBar"]',
      '[class*="Navbar"]',
      '[class*="Header"]',
      '[class*="Topbar"]',
    ];
    const isHideable = (el: Element) => {
      const s = getComputedStyle(el as HTMLElement);
      if (!s) return false;
      const pos = s.position;
      if (pos !== "fixed" && pos !== "sticky") return false;
      const rect = (el as HTMLElement).getBoundingClientRect();
      const nearTop = rect.top <= 120; // ปรับได้
      const visible = rect.width > 40 && rect.height > 20;
      return nearTop && visible;
    };

    const set = new Set<HTMLElement>();
    CANDIDATE.forEach(sel => document.querySelectorAll<HTMLElement>(sel).forEach(n => set.add(n)));
    document.querySelectorAll<HTMLElement>("*").forEach(n => { try { if (isHideable(n)) set.add(n); } catch {} });

    [...set].forEach(n => n.setAttribute("data-ss-hideable", "1"));
  });
}
async function setOverlaysHidden(page: any, hidden: boolean) {
  await page.evaluate((flag: boolean) => {
    document.querySelectorAll<HTMLElement>('[data-ss-hideable="1"]').forEach(el => {
      if (flag) {
        if (!el.hasAttribute("data-ss-prev-style")) {
          el.setAttribute("data-ss-prev-style", el.getAttribute("style") || "");
        }
        el.style.setProperty("visibility", "hidden", "important");
      } else {
        const prev = el.getAttribute("data-ss-prev-style");
        if (prev !== null) {
          if (prev) el.setAttribute("style", prev); else el.removeAttribute("style");
        } else {
          el.style.removeProperty("visibility");
        }
        el.removeAttribute("data-ss-prev-style");
      }
    });
  }, hidden);
}
async function clearOverlayMarks(page: any) {
  await page.evaluate(() => {
    document
      .querySelectorAll('[data-ss-hideable], [data-ss-prev-style]')
      .forEach(el => {
        el.removeAttribute("data-ss-hideable");
        el.removeAttribute("data-ss-prev-style");
      });
  });
}

/** ==== capture helpers ==== */
async function attemptScreenshot(page: any): Promise<Buffer> {
  let err: unknown = null;
  for (let i = 0; i < 2; i++) {
    try {
      return await page.screenshot({ type: "png", fullPage: false });
    } catch (e) {
      err = e;
      await page.waitForTimeout(220 * (i + 1));
    }
  }
  throw err ?? new Error("Unknown screenshot failure");
}

/** สร้างแผนที่ tile สำหรับ scrollWidth × scrollHeight */
async function planTiles(page: any) {
  const metrics = await page.evaluate(() => ({
    vw: window.innerWidth,
    vh: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    contentW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    contentH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  }));
  const overlapX = Math.min(CFG.overlap.maxPx, Math.floor(metrics.vw * CFG.overlap.xRatio));
  const overlapY = Math.min(CFG.overlap.maxPx, Math.floor(metrics.vh * CFG.overlap.yRatio));
  const stepX = Math.max(1, metrics.vw - overlapX);
  const stepY = Math.max(1, metrics.vh - overlapY);

  const xs: number[] = [];
  for (let x = 0; x < metrics.contentW; x += stepX) {
    const nx = (x + metrics.vw > metrics.contentW) ? Math.max(0, metrics.contentW - metrics.vw) : x;
    if (xs.length === 0 || xs[xs.length - 1] !== nx) xs.push(nx);
    if (xs.length * 1 > CFG.maxTiles) break;
    if (nx + metrics.vw >= metrics.contentW) break;
  }
  if (xs.length === 0) xs.push(0);

  const ys: number[] = [];
  for (let y = 0; y < metrics.contentH; y += stepY) {
    const ny = (y + metrics.vh > metrics.contentH) ? Math.max(0, metrics.contentH - metrics.vh) : y;
    if (ys.length === 0 || ys[ys.length - 1] !== ny) ys.push(ny);
    if (ys.length * xs.length > CFG.maxTiles) break;
    if (ny + metrics.vh >= metrics.contentH) break;
  }
  if (ys.length === 0) ys.push(0);

  // probe เพื่อรู้ขนาด tile จริงในพิกเซลเอาต์พุต (DPR)
  const probe = await attemptScreenshot(page);
  const meta0 = await sharp(probe).metadata();
  const tileW = meta0.width || Math.round(metrics.vw * metrics.dpr);
  const tileH = meta0.height || Math.round(metrics.vh * metrics.dpr);

  const canvasW = Math.max(Math.round(metrics.contentW * metrics.dpr), tileW);
  const canvasH = Math.max(Math.round(metrics.contentH * metrics.dpr), tileH);

  return { xs, ys, metrics, tileW, tileH, canvasW, canvasH };
}

async function captureGridAndStitch(page: any): Promise<Buffer> {
  const { xs, ys, metrics, canvasW, canvasH } = await planTiles(page);

  // เริ่มบนสุดเสมอ
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(Math.max(120, CFG.settlePerTileMs));

  // แช่ motion และ CSS freeze
  try { await page.addStyleTag({ content: CFG.cssFreeze }); } catch {}
  await freezeMotionMedia(page);

  // ✅ ทำเครื่องหมาย overlay ที่จะซ่อนใน tile ถัดๆ ไป
  await markHideableOverlays(page);

  const composites: sharp.OverlayOptions[] = [];
  let count = 0;

  for (const y of ys) {
    // ✅ แถวแรก (y==0) แสดง header; แถวถัดไปซ่อน
    await setOverlaysHidden(page, y > 0);

    for (const x of xs) {
      await page.evaluate((p: { x: number; y: number }) => window.scrollTo(p.x, p.y), { x, y });
      await page.waitForTimeout(CFG.settlePerTileMs);

      const buf = await attemptScreenshot(page);
      composites.push({
        input: buf,
        left: Math.round(x * metrics.dpr),
        top: Math.round(y * metrics.dpr),
      });

      count++;
      if (count >= CFG.maxTiles) break;
    }
    if (count >= CFG.maxTiles) break;
  }

  // คืนสภาพ overlay และล้าง mark
  await setOverlaysHidden(page, false);
  await clearOverlayMarks(page);

  // ประกอบเป็นผืนเดียว
  let canvas = sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  }).composite(composites);

  // คำนวณขนาดเนื้อหาจริงหลังสกอลล์ (กันหน้าเปลี่ยน)
  const after = await page.evaluate(() => ({
    w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    dpr: window.devicePixelRatio || 1,
  }));

  const finalW = Math.min(Math.round(after.w * after.dpr), canvasW);
  const finalH = Math.min(Math.round(after.h * after.dpr), canvasH);

  return await canvas.extract({ left: 0, top: 0, width: finalW, height: finalH }).png().toBuffer();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const w = Number(searchParams.get("w") ?? CFG.viewport.width);
  const h = Number(searchParams.get("h") ?? CFG.viewport.height);

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // ใช้ playwright-core
  let chromium: any;
  try {
    const pwc = await import("playwright-core");
    chromium = pwc.chromium;
  } catch (e) {
    console.error("[screenshot] playwright-core import failed:", e);
    return NextResponse.json(
      { error: "playwright-core is not available on this server." },
      { status: 500 }
    );
  }

  const browser = await chromium.launch({
    headless: true,
    // args: ["--no-sandbox","--disable-setuid-sandbox"], // เปิดถ้าจำเป็น
  });

  try {
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();

    const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
    try { await page.waitForLoadState("networkidle", { timeout: 10_000 }); } catch {}

    await normalizeMediaAndFonts(page);
    await waitForSoftIdle(page);
    await prewarmPage(page);
    await waitForSoftIdle(page);

    const stitched = await captureGridAndStitch(page);

    await context.close();

    return new NextResponse(new Uint8Array(stitched), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-HTTP-Status": String(resp?.status() ?? ""),
      },
    });
  } catch (err) {
    console.error("[screenshot] capture failed:", err);
    return NextResponse.json({ error: "Capture failed" }, { status: 500 });
  } finally {
    try { await browser.close(); } catch {}
  }
}
