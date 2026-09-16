import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

/*
 * Public-delivery evidence for Set, Prove & Hold.
 * This harness deliberately does not intercept requests, accept fixture input,
 * or navigate a preview capability. It verifies the public CMS-backed route
 * exactly as a visitor receives it. Start the target outside this script.
 */
const args = process.argv.slice(2);
if (args.length || process.env.PULSE_GUARDRAILS_PREVIEW_PATH) {
  throw new Error("This public-delivery check accepts no fixture, preview, or interception options.");
}

const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const route = "/methodologies/guardrails-framework";
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const debugPort = Number(process.env.PULSE_GUARDRAILS_BROWSER_DEBUG_PORT || 9352);
const profilePath = `/tmp/cognirise-guardrails-public-${process.pid}`;
const outputDirectory = new URL("../../../screenshots/guardrails/set-prove-hold/", import.meta.url);
const timeout = 45_000;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await rm(profilePath, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
const browser = spawn(browserPath, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--window-size=1440,1000",
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profilePath}`, "about:blank",
], { stdio: "ignore" });

let socket;
let commandId = 0;
const pending = new Map();
const browserExit = new Promise((resolve) => browser.once("exit", resolve));

async function pageTarget() {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      const target = targets.find((entry) => entry.type === "page");
      if (target) return target;
    } catch {
      // Chromium is still starting.
    }
    await pause(100);
  }
  throw new Error("Chromium did not expose a page target.");
}

function send(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP command timed out: ${method}`));
    }, timeout);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Page evaluation failed.");
  return result.result.value;
}

async function waitForPage() {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await evaluate(`(() => {
      const page = document.querySelector("[data-guardrails-page], article.guardrails-page");
      return document.readyState === "complete"
        && Boolean(page?.querySelector("[data-guardrails-tool='action-map']"))
        && Boolean(page?.querySelector("[data-guardrails-tool='four-layer-comparison']"))
        && Boolean(page?.querySelector("[data-guardrails-tool='lifecycle-matrix']"));
    })()`);
    if (ready) return;
    await pause(100);
  }
  throw new Error("The public Guardrails route did not render Set, Prove & Hold.");
}

async function waitForCondition(expression, description) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await pause(25);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function capture(name) {
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(new URL(`${name}.png`, outputDirectory), Buffer.from(screenshot.data, "base64"));
}

async function inspect(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width, height: viewport.height, mobile: viewport.mobile, deviceScaleFactor: 1,
  });
  // Verify deep linking hash evaluation
  await send("Page.navigate", { url: `${baseUrl}${route}#guardrails-phase-prove` });
  await waitForPage();
  await evaluate(`(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  })()`);

  const result = await evaluate(`(() => {
    const page = document.querySelector("[data-guardrails-page], article.guardrails-page");
    const actions = [...page.querySelectorAll("[data-guardrails-action]")];
    const layers = [...page.querySelectorAll("[data-guardrails-layer]")];
    const cells = [...page.querySelectorAll("[data-guardrails-matrix-cell]")];
    const text = page.innerText.replace(/\\s+/g, " ").trim();
    return {
      title: document.title,
      publicContent: !/not currently published|protected draft preview/i.test(text),
      actionCount: actions.length,
      layerCount: layers.length,
      matrixCount: cells.length,
      actionSelected: actions.filter((node) => node.getAttribute("aria-pressed") === "true").length,
      layerSelected: layers.filter((node) => node.getAttribute("aria-selected") === "true").length,
      matrixSelected: cells.filter((node) => node.getAttribute("aria-pressed") === "true").length,
      actionDetail: page.querySelector("#guardrails-action-detail")?.textContent || "",
      matrixDetail: page.querySelector("#guardrails-matrix-detail")?.textContent || "",
      dataflow: page.querySelector("#guardrails-dataflow-title")?.parentElement?.textContent || "",
      pageFits: document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1,
      tables: page.querySelectorAll("table").length,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      activeAnimations: document.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running" || animation.pending).length,
      referencesAbsent: !/What this is built from/i.test(text),
      navLinks: page.querySelectorAll("nav a[href^='#']").length,
      activeNav: page.querySelector("nav a[href='#guardrails-phase-prove']")?.className || "",
    };
  })()`);

  assert.equal(result.publicContent, true, `${viewport.label}: public route did not deliver published content.`);
  assert.equal(result.actionCount, 12, `${viewport.label}: all twelve actions must remain visible.`);
  assert.equal(result.layerCount, 4, `${viewport.label}: four layers must be selectable.`);
  assert.equal(result.matrixCount, 12, `${viewport.label}: matrix must expose 4 × 3 cells.`);
  assert.equal(result.actionSelected, 1, `${viewport.label}: action map needs one persistent selection.`);
  assert.equal(result.layerSelected, 1, `${viewport.label}: layer comparison needs one persistent selection.`);
  assert.equal(result.matrixSelected, 0, `${viewport.label}: lifecycle matrix must not have interactive selection.`);
  assert.equal(result.matrixDetail, "", `${viewport.label}: lifecycle matrix must not duplicate detail.`);
  assert.equal(result.referencesAbsent, true, `${viewport.label}: references block must be completely absent.`);
  assert.ok(result.navLinks >= 6, `${viewport.label}: section navigator is missing or incomplete.`);
  assert.ok(/text-\[var\(--gf-ink\)\]/.test(result.activeNav), `${viewport.label}: initial hash deep link did not correctly set active navigator state.`);

  assert.ok(/Owner|Failure condition|Output|Cadence/i.test(result.actionDetail), `${viewport.label}: selected action detail is incomplete.`);
  assert.ok(/AI model|runtime gate|What reaches AI/i.test(result.dataflow), `${viewport.label}: data-flow explanation is missing.`);
  assert.ok(result.tables >= 1, `${viewport.label}: native comparison tables are missing.`);
  assert.equal(result.pageFits, true, `${viewport.label}: the page has whole-page horizontal overflow.`);
  assert.equal(result.reducedMotion, true, `${viewport.label}: reduced-motion emulation is not active.`);
  assert.equal(result.activeAnimations, 0, `${viewport.label}: animations are running with reduced motion enabled.`);

  // The three phase columns share one vertical row on desktop, so scroll
  // tracking treats them as Overview while direct phase hashes stay selectable.
  for (const id of ["layers", "lifecycle", "overview"]) {
    await evaluate(`document.querySelector("#${id}")?.scrollIntoView({block:"start"})`);
    await waitForCondition(
      `document.querySelector("nav a[href='#${id}']")?.getAttribute("aria-current") === "location"`,
      `${viewport.label} scroll-driven ${id} navigation state`,
    );
  }

  // Exercise real keyboard activation and pointer/touch hit targets, not only DOM clicks.
  await evaluate(`document.querySelector("[data-guardrails-action='set-name']").focus()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight" });
  await waitForCondition(
    `document.querySelector("[data-guardrails-action='set-build']")?.getAttribute("aria-pressed") === "true"`,
    `${viewport.label} keyboard action navigation`,
  );

  for (const selector of ["[data-guardrails-layer='prompt']"]) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:"center",inline:"center"})`);
    const point = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    if (viewport.mobile) {
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, radiusX: 1, radiusY: 1 }] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
    }
    await waitForCondition(`document.querySelector(${JSON.stringify(selector)}).getAttribute("aria-selected")==="true"`, `${viewport.label} pointer selection`);
  }

  for (const id of await evaluate(`[...document.querySelectorAll("[data-guardrails-action]")].map(n=>n.dataset.guardrailsAction)`)) {
    await evaluate(`document.querySelector("[data-guardrails-action='${id}']").click()`);
    await waitForCondition(`document.querySelector("[data-guardrails-action-detail='${id}']") !== null`, `${viewport.label} ${id} working detail`);
  }

  await evaluate(`document.querySelector("[data-guardrails-layer='runtime']")?.click(); true`);
  await waitForCondition(
    `document.querySelector("[data-guardrails-layer='runtime']")?.getAttribute("aria-selected") === "true"`,
    `${viewport.label} runtime-layer selection`,
  );
  const runtimeFlow = await evaluate(`document.querySelector("#guardrails-dataflow-title")?.parentElement?.textContent || ""`);
  assert.match(runtimeFlow, /after the model.*before delivery/i, `${viewport.label}: runtime gate is not shown after the model.`);

  // Select the last action and layer through their public controls.
  await evaluate(`(() => {
    const click = (selector) => document.querySelectorAll(selector).item(document.querySelectorAll(selector).length - 1)?.click();
    click("[data-guardrails-action]");
    click("[data-guardrails-layer]");
  })()`);
  await waitForCondition(
    `document.querySelector("[data-guardrails-action][aria-pressed='true']")?.getAttribute("data-guardrails-action") === "hold-report"
      && document.querySelector("[data-guardrails-layer][aria-selected='true']")?.getAttribute("data-guardrails-layer") === "architecture"`,
    `${viewport.label} selected-detail state`,
  );

  const changed = await evaluate(`(() => ({
      action: document.querySelector("[data-guardrails-action][aria-pressed='true']")?.getAttribute("data-guardrails-action"),
      layer: document.querySelector("[data-guardrails-layer][aria-selected='true']")?.getAttribute("data-guardrails-layer"),
      detail: document.querySelector("#guardrails-action-detail")?.textContent || "",
      flow: document.querySelector("#guardrails-dataflow-title")?.parentElement?.textContent || "",
    }))()`);
  assert.equal(changed.action, "hold-report", `${viewport.label}: action selection did not update.`);
  assert.equal(changed.layer, "architecture", `${viewport.label}: layer selection did not update.`);
  assert.match(changed.detail, /Report how strong they are/i, `${viewport.label}: selected action detail did not update.`);
  assert.match(changed.flow, /authorised.*task-needed.*records|task-needed.*authorised.*records/i, `${viewport.label}: selected layer data flow did not update.`);

  // Verify manual hash change updates navigator
  await evaluate(`window.location.hash = '#layers'`);
  await waitForCondition(
    `document.querySelector("nav a[href='#layers']")?.className.includes("text-[var(--gf-ink)]")`,
    `${viewport.label} hash change observation`
  );

  await capture(`guardrails-public-${viewport.label}-selected-reduced-motion`);
  await evaluate(`(() => {
    const page = document.querySelector("[data-guardrails-page]");
    const style = document.createElement("style");
    style.textContent = "[data-guardrails-page], [data-guardrails-page] * {transition:none!important;animation:none!important}";
    document.head.append(style);
    const nodes = [...page.querySelectorAll("*")].filter(n=>[...n.childNodes].some(c=>c.nodeType===3 && c.textContent.trim()));
    const sizes = nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));
    nodes.forEach((n,i)=>n.style.fontSize=(sizes[i]*2)+"px");
  })()`);
  await waitForCondition(
    `document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1`,
    `${viewport.label} text-enlarged layout`,
  );
  await capture(`guardrails-public-${viewport.label}-selected-text-200`);
  return result;
}

try {
  const target = await pageTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(request.timer);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", {
    media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const results = {};
  for (const viewport of [
    { label: "390", width: 390, height: 844, mobile: true },
    { label: "768", width: 768, height: 1024, mobile: false },
    { label: "1440", width: 1440, height: 1000, mobile: false },
  ]) results[viewport.label] = await inspect(viewport);
  await writeFile(new URL("guardrails-public-evidence.json", outputDirectory), `${JSON.stringify({ route, publicDelivery: true, results }, null, 2)}\n`);
  console.log("Guardrails public Set, Prove & Hold checks passed.");
} finally {
  for (const request of pending.values()) request.reject(new Error("Browser check stopped."));
  socket?.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExit, pause(5_000)]);
  await rm(profilePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
