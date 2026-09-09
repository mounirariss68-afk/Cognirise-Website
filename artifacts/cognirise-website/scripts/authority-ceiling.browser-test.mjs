import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9334;
const profilePath = "/tmp/cognirise-authority-ceiling-browser-test";

await rm(profilePath, { recursive: true, force: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--window-size=1440,1000",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profilePath}`,
  "about:blank",
], { stdio: "ignore" });
const browserExited = new Promise((resolve) => browser.once("exit", resolve));

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

async function waitForDiagram() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(
      `document.readyState === "complete" && document.querySelectorAll("[data-authority-score]").length === 9`,
    );
    if (ready) return;
    await delay(100);
  }
  throw new Error("Authority ceiling diagram did not become ready");
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
  await send("Page.navigate", {
    url: `${baseUrl}/methodologies/agent-authority-model#authority-ceiling`,
  });
  await waitForDiagram();

  const diagramCount = await evaluate(`document.querySelectorAll("#authority-diagram").length`);
  assert.equal(diagramCount, 1, "The authority model should render as one integrated diagram");

  await evaluate(`document.querySelector('[data-authority-score="h2"]').focus(); true`);
  await pressKey("ArrowRight", "ArrowRight", 39);
  await delay(80);

  const keyboardState = await evaluate(`(() => ({
    focused: document.activeElement?.getAttribute("data-authority-score"),
    pressed: document.querySelector('[data-authority-score="h3"]')?.getAttribute("aria-pressed"),
    readout: document.querySelector('[aria-live="polite"]')?.innerText,
    selectedBand: document.querySelector("[data-selected-band]")?.getAttribute("data-selected-band"),
  }))()`);
  assert.equal(keyboardState.focused, "h3");
  assert.equal(keyboardState.pressed, "true");
  assert.match(keyboardState.readout, /R3\s*\+\s*H3\s*→\s*E3/);
  assert.equal(keyboardState.selectedBand, "e3");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await delay(100);

  const mobileLayout = await evaluate(`(() => {
    const canvas = document.querySelector("[data-authority-chart-scroll]");
    const diagram = document.querySelector("#authority-diagram");
    const diagramRect = diagram.getBoundingClientRect();
    return {
      pageFits: document.documentElement.scrollWidth <= window.innerWidth + 1,
      canvasScrolls: canvas.scrollWidth > canvas.clientWidth,
      diagramFits: diagramRect.left >= 0 && diagramRect.right <= window.innerWidth,
    };
  })()`);
  assert.deepEqual(mobileLayout, {
    pageFits: true,
    canvasScrolls: true,
    diagramFits: true,
  });

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const reducedMotion = await evaluate(`(() => {
    const cell = document.querySelector('[data-authority-score="h3"]');
    return {
      preference: matchMedia("(prefers-reduced-motion: reduce)").matches,
      transitionDuration: getComputedStyle(cell).transitionDuration,
    };
  })()`);
  assert.equal(reducedMotion.preference, true);
  assert.equal(
    Number.parseFloat(reducedMotion.transitionDuration) <= 0.001,
    true,
    `Reduced-motion transition was not effectively disabled: ${reducedMotion.transitionDuration}`,
  );

  console.log("Authority ceiling browser regression passed");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  await rm(profilePath, { recursive: true, force: true }).catch(() => {
    // Chromium child processes can briefly retain profile files after the tested page has closed.
  });
}