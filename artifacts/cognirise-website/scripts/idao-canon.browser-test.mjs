import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const outputDir = process.env.CANON_SCREENSHOT_DIR || "/tmp/cognirise-idao-canon";
const port = 9351;
const profile = `/tmp/cognirise-idao-canon-browser-${process.pid}`;
const expectedSources = [
  "idao-canon-governed-lifecycle-v2.jpg",
  "idao-canon-reusable-intelligence-v2.jpg",
  "idao-canon-traceable-execution-v2.jpg",
  "idao-canon-human-decision-gates-v2.jpg",
  "idao-canon-assurance-by-design-v2.jpg",
];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await mkdir(outputDir, { recursive: true });
const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const exited = new Promise((resolve) => browser.once("exit", resolve));
let socket;

try {
  let target;
  for (let attempt = 0; attempt < 60 && !target; attempt += 1) {
    try {
      target = (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()))
        .find((candidate) => candidate.type === "page");
    } catch { /* Chromium is starting. */ }
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
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  for (const width of [390, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width, height: 1000, deviceScaleFactor: 1, mobile: width < 768,
    });
    await send("Page.navigate", { url: `${baseUrl}/methodologies/idao` });
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      ready = await evaluate(`document.readyState === "complete" && document.querySelectorAll("[data-idao-canon-image]").length === 5`);
      if (ready) break;
      await delay(100);
    }
    assert.ok(ready, `${width}px canon must render`);
    const result = await evaluate(`(async () => {
      const frames = [...document.querySelectorAll("[data-idao-canon-image]")];
      const sources = frames.map((frame) => getComputedStyle(frame).backgroundImage.match(/url\\(["']?(.*?)["']?\\)/)?.[1]);
      const images = await Promise.all(sources.map((source) => new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({source, width: image.naturalWidth, height: image.naturalHeight});
        image.onerror = () => resolve({source, width: 0, height: 0});
        image.src = source;
      })));
      const firstButton = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Expand +"));
      const firstFrame = frames[0].getBoundingClientRect();
      const section = frames[0].closest("section");
      section.scrollIntoView({block: "start", behavior: "instant"});
      return {
        images,
        alts: frames.map((frame) => frame.getAttribute("aria-label")),
        ratios: frames.map((frame) => {
          const rect = frame.getBoundingClientRect();
          return rect.width / rect.height;
        }),
        sectionTop: section.getBoundingClientRect().top,
        sectionHeight: section.getBoundingClientRect().height,
        pageY: window.scrollY + section.getBoundingClientRect().top,
        firstFrameWidth: firstFrame.width,
      };
    })()`);
    await evaluate(`([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Expand +"))).click()`);
    await delay(50);
    const disclosure = await evaluate(`(() => {
      const button = [...document.querySelectorAll("button")].find((candidate) => candidate.getAttribute("aria-controls")?.startsWith("canon-examples-"));
      return {
        expanded: button.getAttribute("aria-expanded"),
        panelHidden: document.getElementById(button.getAttribute("aria-controls")).hidden,
      };
    })()`);
    assert.deepEqual(result.images.map(({ source }) => source.split("/").at(-1)), expectedSources);
    assert.ok(result.images.every(({ width: imageWidth, height }) => imageWidth > 0 && height > 0), `${width}px images load`);
    assert.ok(result.alts.every(Boolean), `${width}px images retain descriptions`);
    assert.ok(result.ratios.every((ratio) => Math.abs(ratio - 4 / 3) < 0.02), `${width}px frames retain 4:3 crop`);
    assert.equal(disclosure.expanded, "true", `${width}px disclosure remains operable`);
    assert.equal(disclosure.panelHidden, false, `${width}px disclosure content remains visible`);
    await delay(150);
    const clip = {
      x: 0,
      y: Math.max(0, result.pageY),
      width,
      height: Math.min(1000, result.sectionHeight),
      scale: 1,
    };
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 88, clip });
    await writeFile(`${outputDir}/idao-canon-${width}.jpg`, Buffer.from(shot.data, "base64"));
    console.log(`PASS IDAO canon at ${width}px`);
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  for (const market of ["uae", "ksa", "turkiye", "europe"]) {
    await send("Page.navigate", { url: `${baseUrl}/methodologies/idao?market=${market}` });
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      ready = await evaluate(`document.readyState === "complete" && document.querySelectorAll("[data-idao-stage-image]").length === 4`);
      if (ready) break;
      await delay(100);
    }
    assert.ok(ready, `${market} lifecycle media must render`);
    const lifecycle = await evaluate(`(async () => {
      const frames = [...document.querySelectorAll("[data-idao-stage-image]")];
      return Promise.all(frames.map((frame) => {
        const source = frame.querySelector("img").src;
        return new Promise((resolve) => {
          const image = new Image();
          image.onload = () => resolve({
            stage: frame.getAttribute("data-idao-stage-image"),
            source,
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
          image.onerror = () => resolve({
            stage: frame.getAttribute("data-idao-stage-image"),
            source,
            width: 0,
            height: 0,
          });
          image.src = source;
        });
      }));
    })()`);
    const expectedPrefix = market === "uae"
      ? "/images/cognirise/blueprint-"
      : `/images/cognirise/idao/${market}/`;
    assert.ok(
      lifecycle.every(({ source }) => new URL(source).pathname.includes(expectedPrefix)),
      `${market} must use its own lifecycle image family`,
    );
    assert.ok(
      lifecycle.every(({ width: imageWidth, height }) => imageWidth > 0 && height > 0),
      `${market} lifecycle images must load`,
    );
    console.log(`PASS IDAO lifecycle media for ${market}`);
  }
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await exited;
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}