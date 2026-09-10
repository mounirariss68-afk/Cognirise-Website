import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { assertMethodologyPrint, routeExpectations } from "./methodology-print-check.mjs";

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
  await evaluate(`document.querySelector('[aria-label="Methodology boundaries and connections"] details').open = true`);
  const layout = await evaluate(`(() => {
    const section = document.querySelector('[aria-label="Methodology boundaries and connections"]');
    const grid = section.querySelector('details > div');
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
  assert.match(await evaluate(`document.getElementById("selected-route-output").innerText`), /AI Value-to-Scale/);

  await evaluate(`document.querySelector('[data-route-index="2"]').click(); true`);
  await delay(50);
  assert.equal(await evaluate(`document.querySelector('[data-route-index="2"]').getAttribute("aria-checked")`), "true");
  assert.match(await evaluate(`document.getElementById("selected-route-output").innerText`), /Agentic Operations Readiness/);

  await evaluate(`document.querySelector('[data-route-index="2"]').focus(); true`);
  await pressKey("ArrowDown", "ArrowDown", 40);
  assert.equal(await evaluate(`document.activeElement?.getAttribute("data-route-index")`), "3");
  assert.equal(await evaluate(`document.activeElement?.getAttribute("aria-checked")`), "true");
  await pressKey("ArrowLeft", "ArrowLeft", 37);
  assert.equal(await evaluate(`document.activeElement?.getAttribute("data-route-index")`), "2");

  const screenRoutes = [];
  for (const width of [1440, 390]) {
    await setViewport(width, width === 390 ? 844 : 1000, width === 390);
    for (const [index, expected] of routeExpectations.entries()) {
      await evaluate(`document.querySelector('[data-route-index="${index}"]').click(); true`);
      await delay(50);
      const route = await evaluate(`(() => {
        const panel = document.getElementById("selected-route-output");
        return {
          method: panel.querySelector('[data-testid="route-detail-method"]').textContent.trim(),
          copy: ['route-detail-decision', 'route-detail-output', 'route-anchor-idao', 'route-anchor-authority']
            .map(id => panel.querySelector('[data-testid="' + id + '"] p').textContent.trim()),
          destinations: [...panel.querySelectorAll('[data-testid="route-actions"] a')].map(link => link.getAttribute('href')),
          anchors: [...panel.querySelectorAll('[data-testid^="route-anchor-"] a')].map(link => link.getAttribute('href')),
        };
      })()`);
      assert.equal(route.method, expected.method, `${width}px route ${index} method`);
      assert.deepEqual(route.destinations, expected.destinations, `${width}px route ${index} destinations`);
      assert.deepEqual(route.anchors, ["/methodologies/idao", "/methodologies/agent-authority-model"]);
      if (width === 1440) screenRoutes.push(route);
    }
  }

  // Both viewport origins must print every route, not just the selected/restored one.
  for (const width of [1440, 390]) {
    await setViewport(width, 1000, width === 390);
    await assertMethodologyPrint({ send, evaluate, screenRoutes, width, outputDir: profilePath });
  }

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
    const idao = [...document.querySelectorAll('strong')].find((node) => node.textContent?.trim() === "Separate Agent Authority decision")?.parentElement;
    const stopRect = stop.getBoundingClientRect();
    const idaoRect = idao.getBoundingClientRect();
    return {
      stopText: stop.innerText,
      separate: stopRect.bottom <= idaoRect.top || idaoRect.bottom <= stopRect.top || stopRect.right <= idaoRect.left || idaoRect.right <= stopRect.left,
      gap: idaoRect.top - stopRect.bottom,
    };
  })()`);
  assert.match(readinessBoundary.stopText, /Do not enter IDAO delivery/);
  assert.equal(readinessBoundary.separate, true, "Stop must remain visibly separate from the Agent Authority decision");
  assert.ok(readinessBoundary.gap > 8, "Stop and the Agent Authority decision should retain visible spacing");

  console.log("Methodology route and relationship browser regression passed");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}