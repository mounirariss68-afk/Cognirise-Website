// Render every public route with Playwright and extract what the audit measures.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const base = process.env.BASE ?? "http://localhost:4173";
const out = process.env.OUT ?? "scripts/redesign/out";
mkdirSync(out, { recursive: true });

const routes = process.env.ROUTES ? process.env.ROUTES.split(",") : [
  "/", "/what-we-do", "/how-we-work", "/industries",
  "/industries/financial-services", "/industries/telecoms", "/industries/energy-resources", "/industries/travel-hospitality", "/industries/education", "/industries/manufacturing",
  "/industries/public-sector?market=uae", "/industries/public-sector?market=ksa", "/industries/public-sector?market=turkiye", "/industries/public-sector?market=europe",
  "/platforms/cognios", "/case-studies", "/methodologies", "/about", "/value-scan", "/privacy", "/about/core-values",
  "/this-page-does-not-exist",
  ...(process.env.ALL ? ["/methodologies/idao", "/methodologies/agent-authority-model", "/methodologies/guardrails-framework", "/methodologies/human-agent-operating-model", "/methodologies/ai-value-to-scale", "/methodologies/ai-use-case-prioritization", "/methodologies/agentic-operations-readiness", "/industries/public-sector/point-of-view?market=uae", "/industries/public-sector/point-of-view?market=ksa", "/industries/public-sector/point-of-view?market=turkiye", "/industries/public-sector/point-of-view?market=europe"] : []),
];

const browser = await chromium.launch();
const results = [];
for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const data = await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const mains = document.querySelectorAll("main").length;
    const walk = (node) => {
      let text = "";
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) text += child.textContent;
        else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child;
          if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue;
          if (el.getAttribute("aria-hidden") === "true") continue;
          const block = /^(P|DIV|SECTION|ARTICLE|H[1-6]|LI|TR|TD|TH|DT|DD|UL|OL|TABLE|FIGURE|FIGCAPTION|HEADER|FOOTER|NAV|BUTTON|A|SPAN|LABEL|STRONG|EM|B|I|SUMMARY|DETAILS|BLOCKQUOTE|CAPTION)$/.test(el.tagName);
          const inline = /^(A|SPAN|STRONG|EM|B|I|LABEL)$/.test(el.tagName);
          text += (inline ? "" : "\n") + walk(el) + (inline ? "" : "\n");
        }
      }
      return text;
    };
    const text = walk(main).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
    const headings = [...main.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim(), hidden: h.offsetParent === null && !h.closest(".sr-only") ? h.getClientRects().length === 0 : false }));
    const images = [...document.querySelectorAll("img")].map((img) => ({ src: img.getAttribute("src"), alt: img.getAttribute("alt") }));
    const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    const buttons = [...main.querySelectorAll("a.pulse-action, button.pulse-action")].map((b) => b.textContent.trim());
    return {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
      robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
      mains,
      h1Count: main.querySelectorAll("h1").length,
      headings,
      text,
      images,
      links,
      buttons,
      finalUrl: location.pathname + location.search + location.hash,
    };
  });
  await page.screenshot({ path: `${out}/${route.replace(/[^a-z0-9]+/gi, "_") || "home"}.png`, fullPage: true });
  results.push({ route, errors, ...data });
  await page.close();
}
await browser.close();
writeFileSync(`${out}/render.json`, JSON.stringify(results, null, 1));
console.log(`rendered ${results.length} routes`);
