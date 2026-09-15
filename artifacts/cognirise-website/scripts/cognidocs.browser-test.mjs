import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9346;
const profilePath = `/tmp/cognirise-cognidocs-browser-test-${process.pid}`;
const scenarioTabSelector = '[role="tablist"][aria-label="Extraction demonstrations"] > [role="tab"]';
const fieldTabSelector = '[role="group"][aria-label^="Extraction fields"] > button';
const viewports = [
  { label: "desktop", width: 1440, height: 1000, mobile: false },
  { label: "tablet", width: 768, height: 1024, mobile: false },
  { label: "mobile", width: 390, height: 844, mobile: true },
];
const consoleErrors = [];
const negligibleMotion = (duration) => duration.split(",").every((value) => {
  const milliseconds = parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
  return milliseconds <= 0.011;
});

await rm(profilePath, { recursive: true, force: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
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
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text || "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    const entry = message.params.entry;
    // The existing contact page falls back to its published/default email when
    // no contact configuration exists. Report this separate-page 404 explicitly.
    if (entry.url?.includes("/api/public/contact-configuration") && entry.text.includes("404")) {
      console.warn(`Existing contact configuration unavailable: ${entry.url}`);
    } else consoleErrors.push(`${entry.text || "Console error"} ${entry.url || ""}`);
  }
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

async function setViewport(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
}

async function waitForPage(pathname = "/platforms/cognidocs") {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await evaluate(`document.readyState === "complete"
      && location.pathname === ${JSON.stringify(pathname)}
      && document.body?.innerText?.includes("CogniDocs")
      && document.querySelector(${JSON.stringify(scenarioTabSelector)}) !== null`);
    if (ready) return;
    await delay(100);
  }
  const diagnostics = await evaluate(`({
    href: location.href,
    readyState: document.readyState,
    title: document.title,
    body: document.body?.innerText?.slice(0, 500),
    scenarioTabs: document.querySelectorAll(${JSON.stringify(scenarioTabSelector)}).length,
    fieldTabs: document.querySelectorAll(${JSON.stringify(fieldTabSelector)}).length,
  })`);
  throw new Error(`CogniDocs did not become ready: ${JSON.stringify(diagnostics)}`);
}

async function navigate(pathname, search = "") {
  await send("Page.navigate", { url: `${baseUrl}${pathname}${search}` });
  await waitForPage(pathname);
}

async function waitForPath(pathname) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.readyState === "complete" && location.pathname === ${JSON.stringify(pathname)}`)) return;
    await delay(100);
  }
  throw new Error(`Browser did not reach ${pathname}; current URL was ${await evaluate("location.href")}`);
}

function assertNoHorizontalOverflow(layout, label) {
  assert.ok(
    layout.documentScrollWidth <= layout.viewportWidth + 1,
    `${label}: document overflows horizontally (${JSON.stringify(layout)})`,
  );
  assert.ok(
    layout.bodyScrollWidth <= layout.viewportWidth + 1,
    `${label}: body overflows horizontally (${JSON.stringify(layout)})`,
  );
}

async function getLayout() {
  return evaluate(`(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    scenarioTabs: [...document.querySelectorAll(${JSON.stringify(scenarioTabSelector)})].map((tab) => ({
      text: tab.textContent.trim(),
      selected: tab.getAttribute("aria-selected"),
      controls: tab.getAttribute("aria-controls"),
    })),
    fieldTabs: [...document.querySelectorAll(${JSON.stringify(fieldTabSelector)})].map((tab) => ({
      text: tab.textContent.trim(),
      selected: tab.getAttribute("aria-pressed"),
    })),
    panels: [...document.querySelectorAll('[role="tabpanel"]')].map((panel) => ({
      id: panel.id,
      hidden: panel.hidden,
      text: panel.innerText,
    })),
  }))()`);
}

async function clickTab(textPattern, selector) {
  const clicked = await evaluate(`(() => {
    const tab = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find((candidate) => ${textPattern}.test(candidate.textContent || ""));
    if (!tab) return false;
    tab.click();
    return true;
  })()`);
  assert.equal(clicked, true, `Could not find demonstration tab matching ${textPattern}`);
  await delay(60);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  for (const viewport of viewports) {
    await setViewport(viewport);
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    await navigate("/platforms/cognidocs");

    const initialLayout = await getLayout();
    assertNoHorizontalOverflow(initialLayout, viewport.label);
    assert.equal(initialLayout.scenarioTabs.length, 2, `${viewport.label}: expected Finance and Engineering tabs`);
    assert.equal(initialLayout.scenarioTabs.filter((tab) => tab.selected === "true").length, 1);
    assert.equal(initialLayout.fieldTabs.length, 2, `${viewport.label}: expected two finance source fields`);
    assert.equal(initialLayout.fieldTabs.filter((tab) => tab.selected === "true").length, 1);
    assert.equal(initialLayout.panels.filter((panel) => !panel.hidden).length, 1);

    const initialPanel = initialLayout.panels.find((panel) => !panel.hidden);
    assert.match(initialPanel?.text || "", /CRM\*CAREEM RIDES DXB 8842/);
    assert.match(initialPanel?.text || "", /Row 2, Description Column \(Page 1\)/);
    assert.match(initialPanel?.text || "", /Careem Rides/);
    assert.match(initialPanel?.text || "", /Pattern match against known transport providers\./);
    assert.match(initialPanel?.text || "", /Reviewer Note/i);
    const initialSourceState = await evaluate(`(() => {
      const source = (text) => [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === text);
      const highlighted = (node) => Boolean(node && node.className.includes("ring-1"));
      return {
        merchant: highlighted(source("CRM*CAREEM RIDES DXB 8842")),
        amount: highlighted(source("45.50 CR")),
      };
    })()`);
    assert.deepEqual(initialSourceState, { merchant: true, amount: false }, `${viewport.label}: selected source is not highlighted`);

    await clickTab("/Credit Amount/i", fieldTabSelector);
    const amount = await getLayout();
    assertNoHorizontalOverflow(amount, `${viewport.label} after finance source switch`);
    assert.equal(amount.fieldTabs.find((tab) => /Credit Amount/i.test(tab.text))?.selected, "true");
    const amountPanel = amount.panels.find((panel) => !panel.hidden);
    assert.match(amountPanel?.text || "", /45\.50 \(AED\)/);
    assert.match(amountPanel?.text || "", /Row 2, Credit Column \(Page 1\)/);
    assert.match(amountPanel?.text || "", /Value identified in 'CR' \/ Credit proximity with valid currency locale\./);
    const amountSourceState = await evaluate(`(() => {
      const source = (text) => [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === text);
      const highlighted = (node) => Boolean(node && node.className.includes("ring-1"));
      return {
        merchant: highlighted(source("CRM*CAREEM RIDES DXB 8842")),
        amount: highlighted(source("45.50 CR")),
      };
    })()`);
    assert.deepEqual(amountSourceState, { merchant: false, amount: true }, `${viewport.label}: source switch did not follow selected field`);

    await clickTab("/Engineering/i", scenarioTabSelector);
    const engineering = await getLayout();
    assertNoHorizontalOverflow(engineering, `${viewport.label} after manual example switch`);
    assert.equal(engineering.scenarioTabs.find((tab) => /Engineering/i.test(tab.text))?.selected, "true");
    assert.equal(engineering.fieldTabs.length, 3, `${viewport.label}: expected three engineering source fields`);
    const engineeringPanel = engineering.panels.find((panel) => !panel.hidden);
    assert.match(engineeringPanel?.text || "", /\|<-- 4500mm -->\|/);
    assert.match(engineeringPanel?.text || "", /Detail A: Pump Assembly/);
    assert.match(engineeringPanel?.text || "", /Printed dimension extracted directly; geometry marked 'Not to Scale'\./);
    assert.match(engineeringPanel?.text || "", /Reviewer Note/i);
    const engineeringSourceState = await evaluate(`(() => {
      const source = [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === "|<-- 4500mm -->|");
      return Boolean(source && source.className.includes("ring-1"));
    })()`);
    assert.equal(engineeringSourceState, true, `${viewport.label}: engineering source is not highlighted`);

    await clickTab("/Quantity Revision/i", fieldTabSelector);
    const quantity = await getLayout();
    assertNoHorizontalOverflow(quantity, `${viewport.label} after engineering source switch`);
    assert.equal(quantity.fieldTabs.find((tab) => /Quantity Revision/i.test(tab.text))?.selected, "true");
    const quantityPanel = quantity.panels.find((panel) => !panel.hidden);
    assert.match(quantityPanel?.text || "", /14 units/);
    assert.match(quantityPanel?.text || "", /Requires Review/i);
    assert.match(quantityPanel?.text || "", /Title Block: Revision/);
    assert.match(quantityPanel?.text || "", /Requires manual cross-check with original Revision B sheet\./);
    const quantitySourceState = await evaluate(`(() => {
      const source = [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === "Cloud Rev B (14 units)");
      return Boolean(source && source.className.includes("ring-1"));
    })()`);
    assert.equal(quantitySourceState, true, `${viewport.label}: engineering review source is not highlighted`);

    await evaluate(`(() => {
      const tab = [...document.querySelectorAll(${JSON.stringify(scenarioTabSelector)})]
        .find((candidate) => /Engineering/i.test(candidate.textContent || ""));
      tab.focus();
      return document.activeElement === tab;
    })()`);
    await pressKey("ArrowLeft", "ArrowLeft", 37);
    const keyboard = await getLayout();
    assert.equal(keyboard.scenarioTabs.find((tab) => /Financial/i.test(tab.text))?.selected, "true");
    assert.equal(keyboard.fieldTabs.find((tab) => /Merchant Classification/i.test(tab.text))?.selected, "true");
    assert.match(keyboard.panels.find((panel) => !panel.hidden)?.text || "", /CRM\*CAREEM RIDES DXB 8842/);
    assert.match(keyboard.panels.find((panel) => !panel.hidden)?.text || "", /Reviewer Note/i);
  }

  await setViewport(viewports[0]);
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate("/platforms/cognidocs");
  const reducedMotion = await evaluate(`(() => {
    const page = document.querySelector('[data-testid="cognidocs-page"]') || document.querySelector("main");
    const activePanel = document.querySelector('[role="tabpanel"]:not([hidden])');
    const styles = page ? getComputedStyle(page) : null;
    const panelStyles = activePanel ? getComputedStyle(activePanel) : null;
    const motionNodes = [...(page?.querySelectorAll("[data-pulse-reveal], [data-pulse-image], [role='tabpanel']") ?? [])]
      .map((node) => {
        const computed = getComputedStyle(node);
        return {
          animationDuration: computed.animationDuration,
          transitionDuration: computed.transitionDuration,
          opacity: computed.opacity,
          transform: computed.transform,
        };
      });
    return {
      preference: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      pageAnimation: styles?.animationDuration,
      pageTransition: styles?.transitionDuration,
      panelAnimation: panelStyles?.animationDuration,
      panelTransition: panelStyles?.transitionDuration,
      motionNodes,
    };
  })()`);
  assert.equal(reducedMotion.preference, true);
  assert.ok(
    negligibleMotion(reducedMotion.pageAnimation),
    `reduced-motion page animation remained active: ${JSON.stringify(reducedMotion)}`,
  );
  assert.ok(
    negligibleMotion(reducedMotion.panelAnimation) && negligibleMotion(reducedMotion.panelTransition),
    `reduced-motion demo animation remained active: ${JSON.stringify(reducedMotion)}`,
  );
  assert.ok(
    reducedMotion.motionNodes.every((node) =>
      negligibleMotion(node.animationDuration) && negligibleMotion(node.transitionDuration)
    ),
    `reduced-motion descendants retained motion: ${JSON.stringify(reducedMotion.motionNodes)}`,
  );

  const contactHref = await evaluate(`document.querySelector('a[href="/contact"]')?.getAttribute("href")`);
  assert.equal(contactHref, "/contact", "CogniDocs enquiry CTA must link to /contact");
  await evaluate(`document.querySelector('a[href="/contact"]').click(); true`);
  await waitForPath("/contact");
  assert.equal(await evaluate("location.pathname"), "/contact");
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await evaluate(`Boolean(document.querySelector('a[href^="mailto:"]'))`)) break;
    await delay(100);
  }
  assert.match(await evaluate(`document.querySelector('a[href^="mailto:"]')?.getAttribute("href") || ""`), /^mailto:[^@]+@[^@]+$/);

  await send("Page.navigate", { url: `${baseUrl}/cognidocs?from=legacy&utm_source=regression` });
  await waitForPage("/platforms/cognidocs");
  const legacy = await evaluate(`({ pathname: location.pathname, search: location.search })`);
  assert.equal(legacy.pathname, "/platforms/cognidocs");
  const legacySearch = new URLSearchParams(legacy.search);
  assert.equal(legacySearch.get("from"), "legacy");
  assert.equal(legacySearch.get("utm_source"), "regression");
  assert.equal(legacySearch.get("market"), "uae");

  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(" | ")}`);
  console.log("CogniDocs browser regression passed");
} finally {
  socket.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2_000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}