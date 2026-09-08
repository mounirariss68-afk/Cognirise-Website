import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9333;
const profilePath = "/tmp/cognirise-pulse-browser-test";

await rm(profilePath, { recursive: true, force: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--window-size=1440,1100",
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

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", {
    url: `${baseUrl}/what-we-do?market=uae#services`,
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(
      `document.readyState === "complete" && document.querySelectorAll('[data-testid^="service-trigger-"]').length === 3`,
    );
    if (ready) break;
    if (attempt === 79) {
      const diagnostic = await evaluate(`({
        url: location.href,
        title: document.title,
        readyState: document.readyState,
        serviceTriggers: document.querySelectorAll('[data-testid^="service-trigger-"]').length,
        rootChildren: document.querySelector("#root")?.children.length ?? -1,
        bodyText: document.body.innerText.slice(0, 180),
      })`);
      throw new Error(`Service disclosure did not become ready: ${JSON.stringify(diagnostic)}`);
    }
    await delay(100);
  }

  const initial = await evaluate(`(() => {
    const triggers = [...document.querySelectorAll('[data-testid^="service-trigger-"]')];
    const controls = triggers.map((trigger) => trigger.getAttribute("aria-controls"));
    return {
      count: triggers.length,
      allButtons: triggers.every((trigger) => trigger.tagName === "BUTTON"),
      hasTabSemantics: triggers.some((trigger) => trigger.getAttribute("role") === "tab"),
      allCollapsed: triggers.every((trigger) => trigger.getAttribute("aria-expanded") === "false"),
      uniqueControls: new Set(controls).size,
      controlsResolveOnce: controls.every((id) => id && document.querySelectorAll(\`#\${CSS.escape(id)}\`).length === 1),
      panelsHiddenAndInert: controls.every((id) => {
        const panel = document.getElementById(id);
        return panel?.getAttribute("aria-hidden") === "true" && panel?.hasAttribute("inert");
      }),
      destinationCounts: controls.map((id) => document.getElementById(id)?.querySelectorAll("a").length ?? 0),
    };
  })()`);

  assert.equal(initial.count, 3);
  assert.equal(initial.allButtons, true);
  assert.equal(initial.hasTabSemantics, false);
  assert.equal(initial.allCollapsed, true);
  assert.equal(initial.uniqueControls, 3);
  assert.equal(initial.controlsResolveOnce, true);
  assert.equal(initial.panelsHiddenAndInert, true);
  assert.deepEqual(initial.destinationCounts, [3, 1, 5]);

  await evaluate(`(() => {
    document.querySelectorAll(".cps-tile-visual")[2].click();
    return true;
  })()`);
  await delay(50);
  const imageClickSelection = await evaluate(
    `document.querySelectorAll('[data-testid^="service-trigger-"]')[2].getAttribute("aria-expanded")`,
  );
  assert.equal(imageClickSelection, "true", "Clicking the image region did not activate its service card");
  await evaluate(`document.querySelectorAll(".cps-tile-visual")[2].click(); true`);
  await delay(50);

  await evaluate("document.activeElement?.blur(); true");
  let reachedServiceTrigger = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await pressKey("Tab", "Tab", 9);
    reachedServiceTrigger = await evaluate(
      `document.activeElement?.dataset?.testid?.startsWith("service-trigger-") === true`,
    );
    if (reachedServiceTrigger) break;
  }
  assert.equal(reachedServiceTrigger, true, "Tab navigation did not reach a service trigger");
  await delay(50);
  const focusPreview = await evaluate(`(() => {
    const trigger = document.querySelector('[data-testid^="service-trigger-"]');
    const panel = document.getElementById(trigger.getAttribute("aria-controls"));
    return {
      focused: document.activeElement === trigger,
      expanded: trigger.getAttribute("aria-expanded"),
      panelHidden: panel.getAttribute("aria-hidden"),
      panelInert: panel.hasAttribute("inert"),
      preview: trigger.getAttribute("data-preview"),
    };
  })()`);

  assert.equal(focusPreview.focused, true);
  assert.equal(focusPreview.expanded, "true");
  assert.equal(focusPreview.panelHidden, "false");
  assert.equal(focusPreview.panelInert, false);
  assert.equal(focusPreview.preview, "true", JSON.stringify(focusPreview));

  await evaluate(`(() => {
    const triggers = [...document.querySelectorAll('[data-testid^="service-trigger-"]')];
    triggers[0].click();
    document.querySelectorAll(".cps-tile-visual")[1]
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    return true;
  })()`);
  await delay(120);
  const selected = await evaluate(`(() => {
    const triggers = [...document.querySelectorAll('[data-testid^="service-trigger-"]')];
    const firstPanel = document.getElementById(triggers[0].getAttribute("aria-controls"));
    const secondPanel = document.getElementById(triggers[1].getAttribute("aria-controls"));
    return {
      firstExpanded: triggers[0].getAttribute("aria-expanded"),
      firstPanelHidden: firstPanel.getAttribute("aria-hidden"),
      firstPanelInert: firstPanel.hasAttribute("inert"),
      firstActive: triggers[0].getAttribute("data-state"),
      secondExpanded: triggers[1].getAttribute("aria-expanded"),
      secondPanelHidden: secondPanel.getAttribute("aria-hidden"),
      secondActive: triggers[1].getAttribute("data-state"),
    };
  })()`);

  assert.equal(selected.firstExpanded, "false");
  assert.equal(selected.firstPanelHidden, "true");
  assert.equal(selected.firstPanelInert, true);
  assert.equal(selected.firstActive, "inactive");
  assert.equal(selected.secondExpanded, "true");
  assert.equal(selected.secondPanelHidden, "false");
  assert.equal(selected.secondActive, "active");

  await evaluate(`(() => {
    const trigger = document.querySelector('[data-testid^="service-trigger-"]');
    const root = trigger.closest("[data-spatial-disclosure]");
    root.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
    return true;
  })()`);
  await delay(120);
  const restoredSelection = await evaluate(`(() => {
    const trigger = document.querySelector('[data-testid^="service-trigger-"]');
    const panel = document.getElementById(trigger.getAttribute("aria-controls"));
    return {
      expanded: trigger.getAttribute("aria-expanded"),
      panelHidden: panel.getAttribute("aria-hidden"),
      active: trigger.getAttribute("data-state"),
    };
  })()`);
  assert.equal(restoredSelection.expanded, "true");
  assert.equal(restoredSelection.panelHidden, "false");
  assert.equal(restoredSelection.active, "active");

  await pressKey("Escape", "Escape", 27);
  await delay(50);
  const collapsedAfterEscape = await evaluate(
    `document.querySelector('[data-testid^="service-trigger-"]').getAttribute("aria-expanded") === "false"`,
  );
  await pressKey("ArrowRight", "ArrowRight", 39);
  await delay(50);
  const keyboard = await evaluate(`(() => {
    const triggers = [...document.querySelectorAll('[data-testid^="service-trigger-"]')];
    return {
      collapsedAfterEscape: ${JSON.stringify(true)},
      focusMoved: document.activeElement === triggers[1],
      focusStable: triggers.includes(document.activeElement),
    };
  })()`);

  assert.equal(collapsedAfterEscape, true);
  assert.equal(keyboard.focusMoved, true);
  assert.equal(keyboard.focusStable, true);

  await send("Page.navigate", {
    url: `${baseUrl}/#home-industries`,
  });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(
      `document.readyState === "complete" && document.querySelectorAll('[data-testid^="home-industry-trigger-"]').length === 6`,
    );
    if (ready) break;
    if (attempt === 79) throw new Error("Homepage industry disclosure did not become ready");
    await delay(100);
  }

  const homeInitial = await evaluate(`(() => {
    const triggers = [...document.querySelectorAll('[data-testid^="home-industry-trigger-"]')];
    return {
      count: triggers.length,
      allCollapsed: triggers.every((trigger) => trigger.getAttribute("aria-expanded") === "false"),
      panelsHiddenAndInert: triggers.every((trigger) => {
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        return panel?.getAttribute("aria-hidden") === "true" && panel?.hasAttribute("inert");
      }),
      imageCount: document.querySelectorAll(".home-industry-visual img").length,
      rowSizes: [...document.querySelectorAll(".home-industry-row")]
        .map((row) => row.querySelectorAll(".home-industry-item").length),
      publicSectorHref: document.querySelector('[data-testid="home-industry-panel-05"] a')?.getAttribute("href"),
      serviceDestinationCounts: [...document.querySelectorAll('[data-testid^="service-trigger-"]')]
        .map((trigger) => document.getElementById(trigger.getAttribute("aria-controls"))?.querySelectorAll("a").length ?? 0),
    };
  })()`);
  assert.equal(homeInitial.count, 6);
  assert.equal(homeInitial.allCollapsed, true);
  assert.equal(homeInitial.panelsHiddenAndInert, true);
  assert.equal(homeInitial.imageCount, 6);
  assert.deepEqual(homeInitial.rowSizes, [3, 3]);
  assert.equal(homeInitial.publicSectorHref, "/industries/public-sector");
  assert.deepEqual(homeInitial.serviceDestinationCounts, [3, 1, 5]);

  await evaluate(`document.querySelector('[data-testid="home-industry-trigger-01"]').click(); true`);
  await delay(800);
  const selectedWidths = await evaluate(`(() => {
    const first = document.querySelector('[data-testid="home-industry-trigger-01"]').closest(".home-industry-item");
    const second = document.querySelector('[data-testid="home-industry-trigger-02"]').closest(".home-industry-item");
    return { first: first.getBoundingClientRect().width, second: second.getBoundingClientRect().width };
  })()`);
  assert.ok(selectedWidths.first > selectedWidths.second, JSON.stringify(selectedWidths));

  await evaluate(`(() => {
    document.querySelector('[data-testid="home-industry-trigger-02"]')
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    return true;
  })()`);
  const widthStart = await evaluate(`document.querySelector('[data-testid="home-industry-trigger-02"]').closest(".home-industry-item").getBoundingClientRect().width`);
  await delay(180);
  const widthMid = await evaluate(`document.querySelector('[data-testid="home-industry-trigger-02"]').closest(".home-industry-item").getBoundingClientRect().width`);
  await delay(700);
  const homePreview = await evaluate(`(() => {
    const firstTrigger = document.querySelector('[data-testid="home-industry-trigger-01"]');
    const secondTrigger = document.querySelector('[data-testid="home-industry-trigger-02"]');
    const firstPanel = document.querySelector('[data-testid="home-industry-panel-01"]');
    const secondPanel = document.querySelector('[data-testid="home-industry-panel-02"]');
    return {
      firstExpanded: firstTrigger.getAttribute("aria-expanded"),
      firstPanelHidden: firstPanel.getAttribute("aria-hidden"),
      secondExpanded: secondTrigger.getAttribute("aria-expanded"),
      secondPanelHidden: secondPanel.getAttribute("aria-hidden"),
      firstWidth: firstTrigger.closest(".home-industry-item").getBoundingClientRect().width,
      secondWidth: secondTrigger.closest(".home-industry-item").getBoundingClientRect().width,
    };
  })()`);
  assert.ok(widthMid > widthStart, JSON.stringify({ widthStart, widthMid }));
  assert.equal(homePreview.firstExpanded, "false");
  assert.equal(homePreview.firstPanelHidden, "true");
  assert.equal(homePreview.secondExpanded, "true");
  assert.equal(homePreview.secondPanelHidden, "false");
  assert.ok(homePreview.secondWidth > homePreview.firstWidth, JSON.stringify(homePreview));

  if (process.env.PULSE_BROWSER_SCREENSHOT) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const capture = await send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
    await mkdir(new URL("../evidence", import.meta.url), { recursive: true });
    await writeFile(
      new URL("../evidence/home-industries-cinematic-active.jpg", import.meta.url),
      Buffer.from(capture.data, "base64"),
    );
  }

  await evaluate(`(() => {
    const trigger = document.querySelector('[data-testid="home-industry-trigger-01"]');
    trigger.closest("[data-spatial-disclosure]")
      .dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
    return true;
  })()`);
  await delay(750);
  const restoredHomeSelection = await evaluate(
    `document.querySelector('[data-testid="home-industry-trigger-01"]').getAttribute("aria-expanded")`,
  );
  assert.equal(restoredHomeSelection, "true");

  await evaluate(`document.querySelector('[data-testid="home-industry-trigger-06"]').click(); true`);
  await delay(50);
  const education = await evaluate(`(() => {
    const trigger = document.querySelector('[data-testid="home-industry-trigger-06"]');
    const panel = document.querySelector('[data-testid="home-industry-panel-06"]');
    const link = panel.querySelector("a");
    return {
      expanded: trigger.getAttribute("aria-expanded"),
      panelHidden: panel.getAttribute("aria-hidden"),
      panelInert: panel.hasAttribute("inert"),
      href: link.getAttribute("href"),
    };
  })()`);
  assert.equal(education.expanded, "true");
  assert.equal(education.panelHidden, "false");
  assert.equal(education.panelInert, false);
  assert.equal(education.href, "/industries/education");

  console.log("Pulse spatial disclosure browser test passed");
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