// app/api/screenshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import playwright from "playwright-core";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const width = Number(req.nextUrl.searchParams.get("w") || 1200);
  if (!url) return new NextResponse("Missing url", { status: 400 });

  let browser;
  try {
    browser = await playwright.chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      headless: true,
    });
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" , timeout: 30000 });
    const buf = await page.screenshot({ type: "png", fullPage: true });
    await ctx.close();
    return new NextResponse(buf, {
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  } catch (e: any) {
    return new NextResponse(`Screenshot error: ${e?.message || e}`, { status: 500 });
  } finally {
    await browser?.close();
  }
}
