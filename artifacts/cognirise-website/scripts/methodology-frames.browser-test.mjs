import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

// Use the managed proxy: the website and API workflows must both be running.
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const outputDir = process.env.FRAME_SCREENSHOT_DIR || "/tmp/cognirise-methodology-frames";
const caseFilter = new RegExp(process.env.FRAME_CASE_FILTER || ".");
const port = 9349;
const profile = `/tmp/cognirise-frame-browser-${process.pid}`;
const routes = [
  "",
  "/idao",
  "/ai-value-to-scale",
  "/agentic-operations-readiness",
  "/ai-use-case-prioritization",
  "/human-agent-operating-model",
  "/agent-authority-model",
];
const approvedShape = "polygon(10% 0px, 100% 0px, 100% 91%, 0px 100%, 0px 12%)";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(outputDir, { recursive: true });
const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const exited = new Promise((resolve) => browser.once("exit", resolve));
let socket;
const results = [];

try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      target = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()))
        .find((item) => item.type === "page");
    } catch { /* Browser is starting. */ }
    if (!target) await delay(100);
  }
  assert.ok(target, "Chromium must expose a page target");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  };
  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out: ${method}`));
      }, 30000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await send("Page.enable");
  await send("Runtime.enable");
  for (const motion of ["no-preference", "reduce"]) {
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: motion }] });
    for (const width of [390, 820, 1440]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width, height: 1000, deviceScaleFactor: 1, mobile: width < 768,
      });
      for (const suffix of routes) {
        const path = `/methodologies${suffix}`;
        const label = `${suffix.slice(1) || "portfolio"}-${width}-${motion}`;
        if (!caseFilter.test(label)) continue;
        await send("Page.navigate", { url: `${baseUrl}${path}` });
        let ready = false;
        for (let i = 0; i < 150; i++) {
          ready = await evaluate(`location.pathname === ${JSON.stringify(path)}
            && document.readyState === "complete"
            && !!document.querySelector('[data-methodology-hero-frame] img')`);
          if (ready) break;
          await delay(100);
        }
        assert.ok(ready, `${label}: hero must load`);
        await evaluate(`(async () => {
          await document.fonts.ready;
          const frame = document.querySelector('[data-methodology-hero-frame]');
          await frame.querySelector('img').decode();
          frame.scrollIntoView({block: "center", behavior: "instant"});
        })()`);
        // Allow both the hero arrival and any image reveal to settle.
        await delay(1200);
        const geometry = await evaluate(`(() => {
          const frame = document.querySelector('[data-methodology-hero-frame]');
          const rect = frame.getBoundingClientRect();
          const image = frame.querySelector('img');
          const caption = frame.querySelector('figcaption');
          const ancestors = [];
          for (let el = frame.parentElement; el; el = el.parentElement) {
            const style = getComputedStyle(el);
            ancestors.push({clip: style.clipPath, opacity: style.opacity});
          }
          const cr = caption?.getBoundingClientRect();
          return {
            count: document.querySelectorAll('[data-methodology-hero-frame]').length,
            clip: getComputedStyle(frame).clipPath,
            inlineClip: frame.style.clipPath,
            opacity: getComputedStyle(frame).opacity,
            left: rect.left, right: rect.right, width: rect.width, height: rect.height,
            loaded: image.complete && image.naturalWidth > 0,
            alt: image.alt,
            caption: cr ? {
              left: (cr.left - rect.left) / rect.width,
              right: (cr.right - rect.left) / rect.width,
              top: (cr.top - rect.top) / rect.height,
              bottom: (cr.bottom - rect.top) / rect.height,
            } : null,
            ancestors,
          };
        })()`);
        await writeFile(`${outputDir}/${label}.json`, JSON.stringify(geometry, null, 2));
        assert.equal(geometry.count, 1, `${label}: exactly one hero`);
        assert.equal(geometry.clip, approvedShape, `${label}: final five-point silhouette`);
        assert.equal(geometry.inlineClip, "", `${label}: no inline override of shared silhouette`);
        assert.equal(Number(geometry.opacity), 1, `${label}: visible frame`);
        assert.ok(geometry.loaded && geometry.alt, `${label}: original accessible image loaded`);
        assert.ok(geometry.left >= -1 && geometry.right <= width + 1, `${label}: frame fits viewport`);
        const authority = suffix === "/agent-authority-model";
        const height = width >= 1024 ? (authority ? 650 : 620) : (width >= 768 && !authority ? 520 : 430);
        assert.equal(geometry.height, height, `${label}: responsive height preserved`);
        for (const ancestor of geometry.ancestors) {
          assert.equal(Number(ancestor.opacity), 1, `${label}: reveal ancestor visible`);
          assert.ok(["none", "inset(0px)", "inset(0px 0px 0px 0px)"].includes(ancestor.clip),
            `${label}: ancestor reveal must be fully open, got ${ancestor.clip}`);
        }
        if (geometry.caption) {
          const { left, right, top, bottom } = geometry.caption;
          // All four caption corners must be inside the approved convex polygon.
          for (const x of [left, right]) {
            for (const y of [top, bottom]) {
              assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1 - 0.09 * x
                && (x >= 0.1 || y >= 0.12 - 1.2 * x), `${label}: caption must be inside frame`);
            }
          }
        }
        const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 85 });
        await writeFile(`${outputDir}/${label}.jpg`, Buffer.from(shot.data, "base64"));
        results.push({ label, ...geometry });
        console.log(`PASS ${label}`);
      }
    }
  }
  await writeFile(`${outputDir}/geometry.json`, JSON.stringify(results, null, 2));
  console.log(`Verified ${results.length} hero states; screenshots: ${outputDir}`);
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await exited;
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}