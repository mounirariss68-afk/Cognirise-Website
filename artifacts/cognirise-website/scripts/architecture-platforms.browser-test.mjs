import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9337;
const profilePath = `/tmp/cognirise-architecture-browser-test-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await rm(profilePath, { recursive: true, force: true });
const browser = spawn(browserPath, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--window-size=1440,1100",
  `--remote-debugging-port=${debuggingPort}`, `--user-data-dir=${profilePath}`, "about:blank",
], { stdio: "ignore" });
const browserExited = new Promise((resolve) => browser.once("exit", resolve));

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
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function navigate(path, readyExpression) {
  await send("Page.navigate", { url: `${baseUrl}${path}` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.readyState === "complete" && Boolean(${readyExpression})`)) return;
    if (attempt === 99) throw new Error(`Page did not become ready: ${path}`);
    await delay(100);
  }
}
async function pressKey(key, code, keyCode) {
  await send("Input.dispatchKeyEvent", {
    type: key === "Enter" ? "rawKeyDown" : "keyDown",
    key,
    code,
    text: key === "Enter" ? "\r" : undefined,
    unmodifiedText: key === "Enter" ? "\r" : undefined,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await navigate(
    "/platforms/cognios?view=platform&platform=lupitor#architecture",
    `document.querySelector('[data-testid="platform-btn-lupitor"]')`,
  );

  const deepLink = await evaluate(`(() => ({
    selected: document.querySelector('[data-testid="platform-btn-lupitor"]').getAttribute("aria-pressed"),
    matches: document.querySelectorAll(".coas-layer.is-platform-match").length,
    partnerLegend: document.querySelector(".coas-platform-group.is-partner")?.innerText,
    directHref: document.querySelector(".coas-platform-summary a")?.getAttribute("href"),
  }))()`);
  assert.equal(deepLink.selected, "true");
  assert.equal(deepLink.matches, 4);
  assert.match(deepLink.partnerLegend, /PARTNER PLATFORMS/);
  assert.equal(deepLink.directHref, "/platforms/lupitor");

  await evaluate(`document.querySelector('[data-testid="platform-btn-cognidocs"]').focus(); true`);
  await pressKey("Enter", "Enter", 13);
  await delay(80);
  const keyboard = await evaluate(`({
    url: location.search,
    selected: document.querySelector('[data-testid="platform-btn-cognidocs"]').getAttribute("aria-pressed"),
    matches: document.querySelectorAll(".coas-layer.is-platform-match").length,
  })`);
  assert.match(keyboard.url, /platform=cognidocs/);
  assert.equal(keyboard.selected, "true");
  assert.equal(keyboard.matches, 3);

  const touchPoint = await evaluate(`(() => {
    const box = document.querySelector('[data-testid="platform-btn-cogniware"]').getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  })()`);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchPoint.x, y: touchPoint.y }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await delay(80);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="platform-btn-cogniware"]').getAttribute("aria-pressed")`),
    "true",
  );

  await navigate(
    "/platforms/cognios?view=platform&layer=knowledge#architecture",
    `document.querySelector('[data-testid="platforms-for-layer-knowledge"]')`,
  );
  const layerDirection = await evaluate(`(() => {
    const study = document.querySelector('[data-testid="platforms-for-layer-knowledge"]');
    return {
      links: study.querySelectorAll("a").length,
      partners: study.querySelectorAll("a.is-partner").length,
      hrefs: [...study.querySelectorAll("a")].map((link) => link.getAttribute("href")),
    };
  })()`);
  assert.equal(layerDirection.links, 6);
  assert.equal(layerDirection.partners, 3);
  assert.ok(layerDirection.hrefs.includes("/platforms/bunjee-ai"));

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await navigate(
    "/platforms/cognios?view=platform#architecture",
    `document.querySelector('[data-testid="platform-map"]')`,
  );
  const mobile = await evaluate(`(() => {
    const map = document.querySelector('[data-testid="platform-map"]');
    const lens = document.querySelector(".coas-lens-switch");
    const mapBox = map.getBoundingClientRect();
    const buttonsFit = [...document.querySelectorAll(".coas-lens-btn")]
      .every((button) => button.getBoundingClientRect().right <= lens.getBoundingClientRect().right + 1);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      groups: getComputedStyle(document.querySelector(".coas-platform-groups")).gridTemplateColumns,
      mapFits: mapBox.right <= innerWidth + 1,
      buttonsFit,
    };
  })()`);
  assert.ok(mobile.overflow <= 1, JSON.stringify(mobile));
  assert.equal(mobile.groups.split(" ").length, 1);
  assert.equal(mobile.mapFits, true);
  assert.equal(mobile.buttonsFit, true);

  await evaluate(`document.querySelector('button[aria-label="Open menu"]').click(); true`);
  await delay(50);
  await evaluate(`document.querySelector('button[aria-label="Expand Platforms"]').click(); true`);
  await delay(50);
  const mobileMenu = await evaluate(`(() => {
    const menu = document.querySelector("#mobile-menu-platforms");
    return {
      labels: [...menu.querySelectorAll("li[aria-label]")].map((item) => item.getAttribute("aria-label")),
      text: menu.innerText,
    };
  })()`);
  assert.deepEqual(mobileMenu.labels, ["Cognirise-owned platforms", "Partner platforms"]);
  assert.doesNotMatch(mobileMenu.text, /Architecture/);

  console.log("CogniOS platform architecture browser test passed");
} finally {
  socket.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2_000)]);
  if (browser.exitCode === null) {
    browser.kill("SIGKILL");
    await browserExited;
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(profilePath, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 9) throw error;
      await delay(100);
    }
  }
}