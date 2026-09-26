import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const port = 9346;
const profile = `/tmp/cognirise-public-edges-${process.pid}`;
const routeManifest = [
  ["/", ".home-layout-frame"],
  ["/methodologies", ".public-hero-shell"],
  ["/platforms", ".public-hero-shell", "#matrix"],
  ["/platforms/cognios", ".co-frame"],
  ["/platforms/cognibase", ".cb-hero.cb-frame"],
  ["/industries", ".io-hero"],
  ["/industries/financial-services", ".ind-hero"],
  ["/insights", ".ie-hero"],
  ["/about", ".public-hero-shell", 'section[aria-labelledby="leadership-team"]'],
  ["/contact", ".public-hero-shell"],
  ["/what-we-do/data-ai-foundations", ".public-hero-shell", ".fluid-page-rule"],
];
const routes = routeManifest.filter(([path]) =>
  !process.env.PULSE_EDGE_ROUTES || process.env.PULSE_EDGE_ROUTES.split(",").includes(path));
// Run each width in a fresh browser process when checking the full viewport matrix.
const viewports = (process.env.PULSE_EDGE_WIDTHS || "1280")
  .split(",").map(Number);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await rm(profile, { recursive: true, force: true });
const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

let socket;
try {
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      target = pages.find((page) => page.type === "page" && page.url === "about:blank");
      if (target) break;
    } catch {
      // Browser is starting.
    }
    await sleep(100);
  }
  assert.ok(target, "Chromium did not expose the blank page");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map();
  let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  for (const width of viewports) {
    await send("Emulation.setDeviceMetricsOverride", {
      width, height: width < 1000 ? 900 : 1050, deviceScaleFactor: 1, mobile: width === 390,
    });
    for (const [route, selector, railSelector] of routes) {
      await send("Page.navigate", { url: `${baseUrl}${route}?market=uae` });
      let result;
      for (let attempt = 0; attempt < 80; attempt++) {
        result = await evaluate(`(() => {
          const hero = document.querySelector(${JSON.stringify(selector)});
          const header = document.querySelector("header .home-layout-frame");
          const footer = document.querySelector("footer .home-layout-frame");
          if (!hero || !header || !footer || !document.querySelector("h1")) return null;
          const box = (element) => {
            const rect = element.getBoundingClientRect();
            const styles = getComputedStyle(element);
            return { left: rect.left, right: rect.right, width: rect.width,
              paddingLeft: parseFloat(styles.paddingLeft), paddingRight: parseFloat(styles.paddingRight) };
          };
          return { hero: box(hero), header: box(header), footer: box(footer),
            rail: ${JSON.stringify(railSelector)} ? box(document.querySelector(${JSON.stringify(railSelector)})) : null,
            screen: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
            heading: document.querySelector("h1").textContent?.trim().slice(0, 70),
            path: location.pathname };
        })()`);
        if (result && result.path === route) break;
        await sleep(100);
      }
      assert.ok(result && result.path === route, `${width}px ${route}: page not ready; ${JSON.stringify(await evaluate(`({href:location.href, body:document.body.innerText.slice(0,200), ready:document.readyState})`))}`);
      const { hero, header, footer } = result;
      const expected = width * 0.048;
      if (width >= 1024) {
        for (const [name, box] of [["header", header], ["footer", footer], ["hero", hero], ...(result.rail ? [["section", result.rail]] : [])]) {
          assert.ok(Math.abs(box.left + box.paddingLeft - expected) < 3,
            `${width}px ${route}: ${name} left edge ${box.left + box.paddingLeft} != ${expected}; ${JSON.stringify(result)}`);
          assert.ok(Math.abs(result.screen - box.right + box.paddingRight - expected) < 3,
            `${width}px ${route}: ${name} right edge ${result.screen - box.right + box.paddingRight} != ${expected}; ${JSON.stringify(result)}`);
        }
      } else {
        assert.ok(Math.abs(header.left + header.paddingLeft - (width === 390 ? 24 : 48)) < 2,
          `${width}px ${route}: tablet/mobile header edge shifted`);
      }
      console.log(`${width} ${route}: ${result.heading} (${Math.round(hero.left + hero.paddingLeft)}px edge${result.scroll > result.screen + 2 ? `; horizontal overflow ${result.scroll - result.screen}px` : ""})`);
    }
  }
} finally {
  socket?.close();
  const exited = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill();
  await exited;
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
}