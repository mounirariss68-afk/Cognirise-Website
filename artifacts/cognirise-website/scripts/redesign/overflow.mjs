import { chromium } from "playwright";
const base = process.env.BASE ?? "http://localhost:4173";
const routes = (process.env.ROUTES ?? "/").split(",");
const browser = await chromium.launch();
for (const route of routes) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > w + 1 && r.width > 0) {
          const desc = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${[...el.classList].slice(0, 4).join(".")}`;
          bad.push(`${desc} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
        }
      }
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: w, bad: bad.slice(0, 12) };
    });
    console.log(route, viewport.width, result.scrollWidth > result.clientWidth ? "OVERFLOW" : "ok", result.scrollWidth, result.clientWidth);
    if (result.scrollWidth > result.clientWidth) for (const b of result.bad) console.log("   ", b);
    await page.close();
  }
}
await browser.close();
