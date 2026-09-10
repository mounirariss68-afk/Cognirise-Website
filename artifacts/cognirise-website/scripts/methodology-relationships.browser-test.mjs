import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9343;
const profilePath = `/tmp/cognirise-methodology-browser-test-${process.pid}`;

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
      const page = targets.find((candidate) => candidate.type === "page");
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

async function setViewport(width, height = 1000, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}

async function navigate(pathname, readyExpression) {
  await send("Page.navigate", { url: `${baseUrl}${pathname}` });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(`document.readyState === "complete" && location.pathname === ${JSON.stringify(pathname)} && (${readyExpression})`)) return;
    await delay(100);
  }
  const diagnostics = await evaluate(`({
    href: location.href,
    readyState: document.readyState,
    title: document.title,
    radios: document.querySelectorAll('[role="radiogroup"][aria-label="Starting situation"] [role="radio"]').length,
    body: document.body?.innerText?.slice(0, 300),
  })`);
  throw new Error(`Route did not become ready: ${pathname}\n${JSON.stringify(diagnostics, null, 2)}`);
}

async function pressKey(key, code, keyCode) {
  for (const type of ["keyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", {
      type,
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
    });
  }
  await delay(50);
}

async function assertRelationshipLayout(pathname, width) {
  await setViewport(width);
  await navigate(pathname, `Boolean(document.querySelector('[aria-label="Methodology boundaries and connections"]'))`);
  const layout = await evaluate(`(() => {
    const section = document.querySelector('[aria-label="Methodology boundaries and connections"]');
    const grid = section.querySelector('h2 + div');
    const columns = [...grid.children];
    const panels = [...columns[1].children];
    const sectionRect = section.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const panelRects = panels.map((panel) => panel.getBoundingClientRect());
    return {
      sectionScrollWidth: section.scrollWidth,
      sectionClientWidth: section.clientWidth,
      gridRight: gridRect.right,
      sectionRight: sectionRect.right,
      columnsOverlap: columns[0].getBoundingClientRect().right > columns[1].getBoundingClientRect().left + 0.5,
      panelsOverlap: panelRects[0].bottom > panelRects[1].top + 0.5,
      panelsClipped: panelRects.some((rect) => rect.left < sectionRect.left || rect.right > sectionRect.right),
    };
  })()`);
  assert.equal(layout.sectionScrollWidth, layout.sectionClientWidth, `${pathname} should not overflow at ${width}px`);
  assert.equal(layout.columnsOverlap, false, `${pathname} relationship columns should not overlap at ${width}px`);
  assert.equal(layout.panelsOverlap, false, `${pathname} relationship panels should not overlap at ${width}px`);
  assert.equal(layout.panelsClipped, false, `${pathname} relationship panels should not clip at ${width}px`);
  assert.ok(layout.gridRight <= layout.sectionRight + 1, `${pathname} relationship grid should remain inside its section at ${width}px`);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");

  await setViewport(1440);
  await navigate("/methodologies", `document.querySelectorAll('[role="radiogroup"][aria-label="Starting situation"] [role="radio"]').length === 6`);

  const firstRadio = '[role="radiogroup"][aria-label="Starting situation"] [data-route-index="0"]';
  await evaluate(`(() => {
    const group = document.querySelector('[role="radiogroup"][aria-label="Starting situation"]');
    const entry = document.createElement("button");
    entry.type = "button";
    entry.id = "route-map-test-entry";
    group.before(entry);
    entry.focus();
  })()`);
  await pressKey("Tab", "Tab", 9);
  const firstFocusState = await evaluate(`({
    activeIndex: document.activeElement?.getAttribute("data-route-index"),
    checked: document.querySelector(${JSON.stringify(firstRadio)}).getAttribute("aria-checked"),
  })`);
  assert.deepEqual(firstFocusState, { activeIndex: "0", checked: "true" });
  await evaluate(`document.getElementById("route-map-test-entry").remove(); true`);
  assert.match(await evaluate(`document.getElementById("selected-methodology-route").innerText`), /AI Value-to-Scale/);

  await evaluate(`document.querySelector('[data-route-index="2"]').click(); true`);
  await delay(50);
  assert.equal(await evaluate(`document.querySelector('[data-route-index="2"]').getAttribute("aria-checked")`), "true");
  assert.match(await evaluate(`document.getElementById("selected-methodology-route").innerText`), /Agentic Operations Readiness/);

  await evaluate(`document.querySelector('[data-route-index="2"]').focus(); true`);
  await pressKey("ArrowDown", "ArrowDown", 40);
  assert.equal(await evaluate(`document.activeElement?.getAttribute("data-route-index")`), "3");
  assert.equal(await evaluate(`document.activeElement?.getAttribute("aria-checked")`), "true");
  await pressKey("ArrowLeft", "ArrowLeft", 37);
  assert.equal(await evaluate(`document.activeElement?.getAttribute("data-route-index")`), "2");

  await evaluate(`[...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Show all routes").click(); true`);
  await delay(50);
  assert.equal(await evaluate(`document.querySelector('[role="radiogroup"][aria-label="Starting situation"] [aria-checked="true"]')`), null);
  assert.equal(await evaluate(`document.getElementById("selected-methodology-route").innerText.includes("Every situation goes directly")`), true);

  await setViewport(390, 844, true);
  await navigate("/methodologies", `document.querySelectorAll('.md\\\\:hidden a').length > 0`);
  const mobileDestinations = await evaluate(`(() => {
    const visibleLinks = [...document.querySelectorAll('.md\\\\:hidden a')].filter((link) => link.getBoundingClientRect().height > 0);
    return visibleLinks.map((link) => ({
      text: link.innerText.replace(/\\s+/g, " ").trim(),
      path: new URL(link.href).pathname,
    }));
  })()`);
  const routePaths = [
    "/methodologies/ai-value-to-scale",
    "/methodologies/ai-use-case-prioritization",
    "/methodologies/agentic-operations-readiness",
    "/methodologies/human-agent-operating-model",
    "/methodologies/agent-authority-model",
    "/methodologies/idao",
  ];
  for (const path of routePaths) {
    assert.ok(mobileDestinations.some((link) => link.path === path), `Mobile route should retain ${path}`);
  }
  const idaoAnchor = mobileDestinations.find((link) => link.text.includes("IDAO Delivery Framework"));
  const authorityAnchor = mobileDestinations.find((link) => link.text.includes("Agent Authority Model") && !link.text.includes("Situation:"));
  assert.equal(idaoAnchor?.path, "/methodologies/idao");
  assert.equal(authorityAnchor?.path, "/methodologies/agent-authority-model");

  const relationshipPaths = [
    "/methodologies/ai-value-to-scale",
    "/methodologies/ai-use-case-prioritization",
    "/methodologies/agentic-operations-readiness",
    "/methodologies/human-agent-operating-model",
  ];
  for (const width of [1440, 900]) {
    for (const path of relationshipPaths) {
      await assertRelationshipLayout(path, width);
    }
  }

  await setViewport(900);
  await navigate("/methodologies/agentic-operations-readiness", `document.body.textContent.includes("6 Conditions feed into:")`);
  const readinessBoundary = await evaluate(`(() => {
    const stop = [...document.querySelectorAll("strong")].find((node) => node.textContent?.trim() === "Stop" && node.closest("section")?.textContent.includes("6 Conditions feed into:"))?.parentElement;
    const idao = [...document.querySelectorAll('a[href="/methodologies/idao"]')].find((link) => link.innerText.includes("Deliver through IDAO"));
    const stopRect = stop.getBoundingClientRect();
    const idaoRect = idao.getBoundingClientRect();
    return {
      stopText: stop.innerText,
      separate: stopRect.bottom <= idaoRect.top || idaoRect.bottom <= stopRect.top || stopRect.right <= idaoRect.left || idaoRect.right <= stopRect.left,
      gap: idaoRect.top - stopRect.bottom,
    };
  })()`);
  assert.match(readinessBoundary.stopText, /Do not enter IDAO delivery/);
  assert.equal(readinessBoundary.separate, true, "Stop must remain visibly separate from the IDAO entry link");
  assert.ok(readinessBoundary.gap > 8, "Stop and the IDAO entry link should retain visible spacing");

  console.log("Methodology route and relationship browser regression passed");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}