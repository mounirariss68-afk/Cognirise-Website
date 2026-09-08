import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9334;
const profilePath = "/tmp/cognirise-autodata-browser-test";

await rm(profilePath, { recursive: true, force: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profilePath}`,
  "about:blank",
], { stdio: "ignore" });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getDebugTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      // Chromium is still starting.
    }
    await delay(100);
  }
  throw new Error("Chromium did not expose a page target");
}

const target = await getDebugTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
};

await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

function send(method, params = {}) {
  commandId += 1;
  return new Promise((resolve, reject) => {
    pending.set(commandId, { resolve, reject });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function pressKey(key, code, keyCode) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

async function tap(selector) {
  await evaluate(`(() => {
    document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center", behavior: "instant" });
    return true;
  })()`);
  await delay(50);
  const point = await evaluate(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 1, radiusY: 1, force: 1 }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function waitForReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(`document.readyState === "complete" && document.querySelectorAll('[data-testid^="tab-stage-"]').length === 8`);
    if (ready) return;
    await delay(100);
  }
  throw new Error("AutoData pipeline did not become ready");
}

async function navigate() {
  await send("Page.navigate", { url: `${baseUrl}/platforms/datatoolpack#pipeline` });
  await waitForReady();
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await navigate();

  const desktop = await evaluate(`(() => {
    const interactive = document.querySelector(".autodata-pipeline-interactive");
    const linear = document.querySelector(".autodata-pipeline-linear");
    const first = document.querySelector('[data-testid="tab-stage-harmonization"]');
    first.focus();
    return {
      interactiveDisplay: getComputedStyle(interactive).display,
      linearDisplay: getComputedStyle(linear).display,
      selected: first.getAttribute("aria-selected"),
      tabs: document.querySelectorAll('[data-testid^="tab-stage-"]').length,
      sources: document.querySelectorAll('[data-testid^="text-source-interactive-"]').length,
      invalidControls: [...document.querySelectorAll('[data-testid^="tab-stage-"]')]
        .filter((tab) => !document.getElementById(tab.getAttribute("aria-controls"))).length,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  })()`);
  assert.notEqual(desktop.interactiveDisplay, "none");
  assert.equal(desktop.linearDisplay, "none");
  assert.equal(desktop.selected, "true");
  assert.equal(desktop.tabs, 8);
  assert.equal(desktop.sources, 8);
  assert.equal(desktop.invalidControls, 0);
  assert.match(desktop.title, /Datatoolpack AutoData Model-Readiness Layer/);
  assert.match(desktop.description, /eight-stage pipeline/);
  assert.match(desktop.ogImage, /^https?:\/\//);
  assert.equal(desktop.overflow, false);

  await pressKey("ArrowDown", "ArrowDown", 40);
  const afterArrow = await evaluate(`({
    selected: document.querySelector('[data-testid="tab-stage-completion"]').getAttribute("aria-selected"),
    focused: document.activeElement?.getAttribute("data-testid"),
    panel: document.querySelector('[role="tabpanel"]:not([hidden])').innerText,
  })`);
  assert.equal(afterArrow.selected, "true");
  assert.equal(afterArrow.focused, "tab-stage-completion");
  assert.match(afterArrow.panel, /Completion & validation/);
  assert.match(afterArrow.panel, /Persisted metadata/i);
  const metadataAfterInteraction = await evaluate(`({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
  })`);
  assert.deepEqual(metadataAfterInteraction, {
    title: desktop.title,
    description: desktop.description,
    ogImage: desktop.ogImage,
  });

  await pressKey("End", "End", 35);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="tab-stage-synthetic-data"]').getAttribute("aria-selected")`),
    "true",
  );

  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await tap('[data-testid="tab-stage-text-cleaning"]');
  await delay(50);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="tab-stage-text-cleaning"]').getAttribute("aria-selected")`),
    "true",
  );

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate();
  const mobile = await evaluate(`(() => ({
    interactiveDisplay: getComputedStyle(document.querySelector(".autodata-pipeline-interactive")).display,
    linearDisplay: getComputedStyle(document.querySelector(".autodata-pipeline-linear")).display,
    stages: document.querySelectorAll('[data-testid^="card-stage-linear-"]').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))()`);
  assert.equal(mobile.interactiveDisplay, "none");
  assert.notEqual(mobile.linearDisplay, "none");
  assert.equal(mobile.stages, 8);
  assert.equal(mobile.overflow, false);

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate();
  const reduced = await evaluate(`({
    interactiveDisplay: getComputedStyle(document.querySelector(".autodata-pipeline-interactive")).display,
    linearDisplay: getComputedStyle(document.querySelector(".autodata-pipeline-linear")).display,
  })`);
  assert.equal(reduced.interactiveDisplay, "none");
  assert.notEqual(reduced.linearDisplay, "none");

  console.log("AutoData browser interaction checks passed");
} finally {
  socket.close();
  browser.kill("SIGTERM");
}