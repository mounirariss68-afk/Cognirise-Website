// Viewport screenshots (desktop + mobile) of selected routes for a visual check.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const base = process.env.BASE ?? "http://localhost:4173";
const out = "scripts/redesign/shots"; mkdirSync(out, { recursive: true });
const routes = (process.env.ROUTES ?? "/").split(",");
const browser = await chromium.launch();
for (const route of routes) {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    // Scroll through the page so the reveal animation has run for every section.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    const file = `${out}/${route.replace(/[^a-z0-9]+/gi, "_") || "home"}-${name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(file, "height", height, overflow ? "HORIZONTAL OVERFLOW" : "");
    await page.close();
  }
}
await browser.close();
