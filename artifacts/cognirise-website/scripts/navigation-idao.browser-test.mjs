import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9335;
const profilePath = `/tmp/cognirise-navigation-browser-test-${process.pid}`;

await rm(profilePath, { recursive: true, force: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--window-size=1440,900",
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

async function pressKey(key, code, keyCode, shift = false) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    modifiers: shift ? 8 : 0,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    modifiers: shift ? 8 : 0,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

async function navigate(pathname) {
  const previousHref = await evaluate("location.href");
  await send("Page.navigate", { url: `${baseUrl}${pathname}` });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(`document.readyState === "complete" && location.href !== ${JSON.stringify(previousHref)} && Boolean(document.querySelector("header nav"))`);
    if (ready) return;
    await delay(100);
  }
  throw new Error(`Navigation did not settle for ${pathname}`);
}

async function waitForServiceSection() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const reached = await evaluate(`(() => {
      const section = document.getElementById("service-lines");
      if (!section) return false;
      const rect = section.getBoundingClientRect();
      return location.hash === "#service-lines" && window.scrollY > 200 && rect.top < 180 && rect.bottom > 0;
    })()`);
    if (reached) return;
    await delay(100);
  }
  throw new Error("Service lines did not become visible");
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await navigate("/methodologies/idao");

  await evaluate("document.body.focus()");
  await pressKey("Tab", "Tab", 9);
  await pressKey("Tab", "Tab", 9);
  await pressKey("Tab", "Tab", 9);
  await delay(100);

  const desktopParent = await evaluate(`(() => {
    const active = document.activeElement;
    const popup = document.getElementById("desktop-menu-methodologies");
    const what = document.getElementById("desktop-nav-what-we-do");
    return {
      activeText: active?.textContent?.replace(/\\s+/g, " ").trim(),
      expanded: active?.getAttribute("aria-expanded"),
      current: active?.getAttribute("aria-current"),
      focusRing: getComputedStyle(active).boxShadow,
      submenu: [...(popup?.querySelectorAll("a") ?? [])].map((link) => link.textContent?.trim()),
      whatHref: new URL(what.href).pathname,
      whatHasDisclosure: what.hasAttribute("aria-expanded"),
    };
  })()`);

  assert.match(desktopParent.activeText, /How we do it/);
  assert.equal(desktopParent.expanded, "true");
  assert.equal(desktopParent.current, null);
  assert.notEqual(desktopParent.focusRing, "none");
  assert.deepEqual(desktopParent.submenu, ["IDAO", "Agent Authority Model"]);
  assert.equal(desktopParent.whatHref, "/");
  assert.equal(desktopParent.whatHasDisclosure, false);

  await pressKey("Tab", "Tab", 9);
  await delay(50);
  const firstChild = await evaluate(`({
    text: document.activeElement?.textContent?.trim(),
    current: document.activeElement?.getAttribute("aria-current"),
    focusRing: getComputedStyle(document.activeElement).boxShadow,
  })`);
  assert.equal(firstChild.text, "IDAO");
  assert.equal(firstChild.current, "page");
  assert.notEqual(firstChild.focusRing, "none");

  await pressKey("Tab", "Tab", 9);
  assert.equal(await evaluate("document.activeElement?.textContent?.trim()"), "Agent Authority Model");
  await pressKey("Escape", "Escape", 27);
  await delay(50);
  assert.match(await evaluate("document.activeElement?.textContent?.replace(/\\s+/g, ' ').trim()"), /How we do it/);
  assert.equal(await evaluate("document.activeElement?.getAttribute('aria-expanded')"), "false");

  await navigate("/what-we-do?source=navigation-test");
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const redirected = await evaluate(`location.pathname === "/" && location.hash === "#service-lines"`);
    if (redirected) break;
    await delay(100);
  }
  const redirect = await evaluate(`({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    hasTarget: Boolean(document.getElementById("service-lines")),
  })`);
  assert.equal(redirect.pathname, "/");
  assert.equal(new URLSearchParams(redirect.search).get("source"), "navigation-test");
  assert.equal(redirect.hash, "#service-lines");
  assert.equal(redirect.hasTarget, true);

  await navigate("/");
  await evaluate(`window.scrollTo({ top: 0, behavior: "auto" }); [...document.querySelectorAll("a")].find((link) => link.textContent?.includes("Explore our practice"))?.click()`);
  await waitForServiceSection();
  await evaluate(`window.scrollTo({ top: 0, behavior: "auto" }); [...document.querySelectorAll("a")].find((link) => link.textContent?.includes("Explore our practice"))?.click()`);
  await waitForServiceSection();
  await evaluate(`window.scrollTo({ top: 0, behavior: "auto" }); [...document.querySelectorAll("footer a")].find((link) => link.textContent?.trim() === "What we do")?.click()`);
  await waitForServiceSection();

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await navigate("/methodologies/idao");
  await evaluate(`document.querySelector('[aria-label="Open menu"]').click()`);
  await delay(50);
  await evaluate(`document.querySelector('[aria-label="Expand How we do it"]').click()`);
  await delay(50);

  const mobile = await evaluate(`(() => {
    const button = document.querySelector('[aria-label="Collapse How we do it"]');
    const list = document.getElementById("mobile-menu-methodologies");
    const what = [...document.querySelectorAll("nav a")].find((link) => link.textContent?.trim() === "What we do" && link.offsetParent);
    return {
      expanded: button?.getAttribute("aria-expanded"),
      controls: button?.getAttribute("aria-controls"),
      focusClass: button?.className,
      submenu: [...(list?.querySelectorAll("a") ?? [])].map((link) => link.textContent?.trim()),
      current: list?.querySelector('a[href="/methodologies/idao"]')?.getAttribute("aria-current"),
      whatHref: new URL(what.href).pathname,
      whatHasSiblingButton: Boolean(what.parentElement?.querySelector("button")),
    };
  })()`);

  assert.equal(mobile.expanded, "true");
  assert.equal(mobile.controls, "mobile-menu-methodologies");
  assert.match(mobile.focusClass, /focus-visible:ring-2/);
  assert.deepEqual(mobile.submenu, ["IDAO", "Agent Authority Model"]);
  assert.equal(mobile.current, "page");
  assert.equal(mobile.whatHref, "/");
  assert.equal(mobile.whatHasSiblingButton, false);

  console.log("Navigation, redirects, active states and keyboard disclosures passed.");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await delay(250);
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}