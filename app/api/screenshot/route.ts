// app/api/screenshot/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const w = Number(searchParams.get("w") ?? 1200);
  const h = Number(searchParams.get("h") ?? 800);

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

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
    // ถ้ารันในบางโฮสท์/CI อาจต้องเปิด args ด้านล่าง
    // args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const buffer = await page.screenshot({ type: "png", fullPage: true });
    await context.close();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[screenshot] capture failed:", err);
    return NextResponse.json({ error: "Capture failed" }, { status: 500 });
  } finally {
    await browser.close();
  }
}
