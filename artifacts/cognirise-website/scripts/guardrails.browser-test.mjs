import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

// This test deliberately uses the authorized, short-lived CMS preview supplied
// by the runner. It never reconstructs a payload, intercepts preview requests,
// or writes the capability path to disk or stdout.
const previewPath = process.env.PULSE_GUARDRAILS_PREVIEW_PATH;
const fixtureMode = process.argv.includes("--fixture-render");
const connectorsOnly = process.argv.includes("--connectors-only");
const fixturePath = process.env.PULSE_GUARDRAILS_FIXTURE_PATH;
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const outputDirectory = new URL("../../../screenshots/guardrails/", import.meta.url);
const profilePath = `/tmp/cognirise-guardrails-browser-smoke-${process.pid}`;
const debuggingPort = 9351;
const timeout = 45_000;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const fixtureToken = "guardrails-fixture-render";
const fixtureRoute = `/preview/${fixtureToken}`;
const fixtureEndpoint = `/api/preview/${fixtureToken}`;
const fixtureNavigation = Object.freeze({
  market: "uae",
  locale: "en",
  items: Object.freeze([]),
  pages: Object.freeze([]),
});

if (!fixtureMode && (!previewPath || !previewPath.startsWith("/") || previewPath.includes("://"))) {
  throw new Error("An authorized Guardrails preview path is required.");
}
if (fixtureMode && (!fixturePath || !fixturePath.startsWith("/"))) {
  throw new Error("Fixture-render mode requires a final Guardrails fixture JSON path.");
}

const fixtureDocument = fixtureMode ? JSON.parse(await readFile(fixturePath, "utf8")) : null;
if (fixtureMode && (
  !fixtureDocument || typeof fixtureDocument !== "object" || Array.isArray(fixtureDocument)
  || fixtureDocument.slug !== "guardrails-framework"
  || fixtureDocument.content?.template !== "guardrails"
)) {
  throw new Error("Fixture-render mode requires the final Guardrails framework snapshot.");
}
const fixtureEnvelope = fixtureMode ? Object.freeze({
  kind: "framework",
  document: fixtureDocument,
  market: "uae",
  locale: "en",
  requestedMarket: "uae",
  requestedLocale: "en",
  revisionId: "fixture-guardrails-review-stage",
  revisionNumber: 1,
  usedFallback: false,
  media: [],
  missingMediaIds: [],
  validationWarnings: [],
  navigation: fixtureNavigation,
}) : null;

await rm(profilePath, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

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

async function getTarget() {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page");
      if (target) return target;
    } catch {
      // Chromium has not opened its CDP endpoint yet.
    }
    await delay(100);
  }
  throw new Error("Chromium did not expose a page target.");
}

const target = await getTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
let browserError;
let fixtureRequestCount = 0;

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") {
    browserError = new Error(message.params.exceptionDetails.text || "Page runtime exception.");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    browserError = new Error(message.params.entry.text);
  }
  if (message.method === "Fetch.requestPaused") {
    void (async () => {
      const pathname = new URL(message.params.request.url).pathname;
      if (!fixtureMode || pathname !== fixtureEndpoint) {
        await send("Fetch.continueRequest", { requestId: message.params.requestId }).catch(() => {});
        return;
      }
      try {
        assert.equal(message.params.request.method, "GET", "Fixture render must exercise the CMS preview GET request.");
        const body = JSON.stringify(fixtureEnvelope);
        await send("Fetch.fulfillRequest", {
          requestId: message.params.requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "Content-Type", value: "application/json; charset=utf-8" },
            { name: "Content-Length", value: String(Buffer.byteLength(body)) },
            { name: "Cache-Control", value: "no-store" },
          ],
          body: Buffer.from(body).toString("base64"),
        });
        fixtureRequestCount += 1;
      } catch (error) {
        browserError = error instanceof Error ? error : new Error(String(error));
        await send("Fetch.continueRequest", { requestId: message.params.requestId }).catch(() => {});
      }
    })();
  }
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  clearTimeout(request.timer);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
};

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("CDP websocket did not open.")), timeout);
  socket.onopen = () => { clearTimeout(timer); resolve(); };
  socket.onerror = reject;
});

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

async function setViewport(width, height, mobile) {
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, mobile, deviceScaleFactor: 1,
  });
}

async function waitForPage() {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (browserError) throw browserError;
    const ready = await evaluate(
      `document.readyState === "complete" && Boolean(document.querySelector(".guardrails-page h1"))`,
    );
    if (ready) return;
    await delay(100);
  }
  throw new Error("The authorized Guardrails preview did not become ready.");
}

async function waitForLayout() {
  await evaluate(`(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(async (image) => {
      if (!image.complete) await new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 12000);
      });
      try { await image.decode(); } catch {}
    }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return true;
  })()`);
}

async function screenshot(name) {
  const { contentSize } = await send("Page.getLayoutMetrics");
  const image = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.ceil(contentSize.width),
      height: Math.ceil(contentSize.height),
      scale: 1,
    },
  });
  await writeFile(new URL(`${name}.png`, outputDirectory), Buffer.from(image.data, "base64"));
}

async function navigate(viewport) {
  await setViewport(viewport.width, viewport.height, viewport.mobile);
  // Keep the opaque capability out of diagnostics. The page itself receives it
  // only as the supplied browser navigation target.
  await send("Page.navigate", { url: `${baseUrl}${fixtureMode ? fixtureRoute : previewPath}` });
  await waitForPage();
  await waitForLayout();
}

async function assertViewport(viewport) {
  const result = await evaluate(`(() => {
    const root = document.querySelector(".guardrails-page");
    const headings = [...root.querySelectorAll("h1,h2,h3,h4")]
      .map((heading) => heading.textContent.replace(/\\s+/g, " ").trim())
      .filter(Boolean);
    const outside = [...root.querySelectorAll("h1,h2,h3,h4,p,li,button,a,th,td")]
      .filter((node) => {
        if (!node.getClientRects().length || node.closest(".sr-only")) return false;
        const rect = node.getBoundingClientRect();
        return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2;
      })
      .map((node) => ({ tag: node.tagName, text: node.textContent.slice(0, 100), width: node.clientWidth, scrollWidth: node.scrollWidth }));
    return {
      pageFits: document.documentElement.scrollWidth <= innerWidth + 1
        && document.body.scrollWidth <= innerWidth + 1,
      outside,
      headings,
      text: root.innerText.replace(/\\s+/g, " ").trim(),
    };
  })()`);
  assert.equal(result.pageFits, true, `${viewport.label}: page has horizontal overflow.`);
  assert.deepEqual(result.outside, [], `${viewport.label}: visible content overflows its viewport.`);
  assert.ok(result.headings.length >= 8, `${viewport.label}: required heading structure is missing.`);
  assert.ok(result.headings.some((value) => value.includes("guardrail")), `${viewport.label}: Guardrails heading is absent.`);
  assert.ok(result.text.includes("Agent Authority"), `${viewport.label}: required related methodology content is absent.`);
  const typeMetrics = await evaluate(`(() => {
    const root = document.querySelector(".guardrails-page");
    return {
      h1: Number.parseFloat(getComputedStyle(root.querySelector("h1")).fontSize),
      h2: Number.parseFloat(getComputedStyle(root.querySelector("h2")).fontSize),
    };
  })()`);
  if (viewport.label === "desktop") {
    assert.ok(Math.abs(typeMetrics.h1 - 98) <= 1, `desktop: h1 must render at approximately 98px, received ${typeMetrics.h1}px.`);
  }
  if (viewport.label === "mobile-390") {
    assert.ok(Math.abs(typeMetrics.h1 - 50) <= 1, `mobile: h1 must render at approximately 50px, received ${typeMetrics.h1}px.`);
  }
  assert.ok(typeMetrics.h2 >= 32, `${viewport.label}: primary section heading is unexpectedly small (${typeMetrics.h2}px).`);
  await screenshot(`guardrails-preview-${viewport.label}`);
  const sections = await evaluate(`(() => [...document.querySelectorAll(".guardrails-page > header, .guardrails-page > section")].map((node) => {
    const rect = node.getBoundingClientRect();
    return { title: node.querySelector("h1,h2")?.textContent, x: rect.left, y: rect.top + scrollY, width: rect.width, height: rect.height };
  }))()`);
  await writeFile(new URL(`guardrails-sections-${viewport.label}.json`, outputDirectory), JSON.stringify(sections, null, 2));
}

async function assertConnectorAlignment(viewport) {
  const routes = await evaluate(`(() => {
    const svg = document.querySelector('svg[viewBox="0 0 100 100"]');
    if (!svg) return { error: "B connector SVG is missing.", routes: [] };
    const map = svg.parentElement?.parentElement;
    if (!map) return { error: "B connector map is missing.", routes: [] };
    const toScreen = (point) => {
      const svgPoint = svg.createSVGPoint();
      svgPoint.x = point.x;
      svgPoint.y = point.y;
      const matrix = svg.getScreenCTM();
      return matrix ? svgPoint.matrixTransform(matrix) : null;
    };
    const routes = [...svg.querySelectorAll("[data-guardrails-connector]")].map((path) => {
      const id = path.getAttribute("data-guardrails-connector");
      const source = map.querySelector('[data-guardrails-band="' + id + '"]');
      const destinationId = {
        "internal-reversible": "prompt",
        "reversible-cost": "runtime",
        "irreversible-customer": "runtime",
        "regulator-public-safety": "architecture",
        "above-ceiling": "architecture",
      }[id];
      const destination = map.querySelector('[data-guardrails-destination="' + destinationId + '"]');
      const start = toScreen(path.getPointAtLength(0));
      const end = toScreen(path.getPointAtLength(path.getTotalLength()));
      const sourceRect = source?.getBoundingClientRect();
      const destinationRect = destination?.getBoundingClientRect();
      return {
        id,
        startDelta: start && sourceRect ? Math.abs(start.y - (sourceRect.top + sourceRect.height / 2)) : Infinity,
        endDelta: end && destinationRect ? Math.abs(end.y - (destinationRect.top + destinationRect.height / 2)) : Infinity,
      };
    });
    return { error: null, routes };
  })()`);
  assert.equal(routes.error, null, `${viewport.label}: ${routes.error}`);
  assert.equal(routes.routes.length, 5, `${viewport.label}: B must render five connector paths.`);
  for (const route of routes.routes) {
    assert.ok(route.startDelta <= 2, `${viewport.label}: ${route.id} source endpoint is ${route.startDelta}px from its band centre.`);
    assert.ok(route.endDelta <= 2, `${viewport.label}: ${route.id} destination endpoint is ${route.endDelta}px from its destination centre.`);
  }
}

async function pointFor(expression) {
  return evaluate(`(() => {
    const element = (${expression});
    if (!element) return null;
    element.scrollIntoView({ block: "center", inline: "center" });
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 24) };
  })()`);
}

async function hover(expression) {
  const point = await pointFor(expression);
  assert.ok(point, "Required Guardrails interaction control is missing.");
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await delay(80);
}

async function click(expression) {
  const point = await pointFor(expression);
  assert.ok(point, "Required Guardrails interaction control is missing.");
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  await delay(80);
}

async function touch(expression) {
  const point = await pointFor(expression);
  assert.ok(point, "Required Guardrails touch control is missing.");
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await delay(80);
}

async function key(key, code, keyCode) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  await delay(80);
}

const visibleControl = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.checkVisibility())`;

async function assertInteractions() {
  // A — enforcement layers: hover, click-to-pin, keyboard reset.
  const runtimeLayer = visibleControl("[data-guardrails-layer='runtime']");
  const runtimeInitial = await evaluate(`(${runtimeLayer})?.className`);
  await hover(runtimeLayer);
  assert.notEqual(await evaluate(`(${runtimeLayer})?.className`), runtimeInitial, "A: hover did not expose the Runtime layer.");
  await click(runtimeLayer);
  assert.equal(await evaluate(`(${runtimeLayer})?.getAttribute("aria-pressed")`), "true", "A: click did not pin the Runtime layer.");
  assert.ok((await evaluate(`(${runtimeLayer})?.innerText`)).includes("Reliable against opportunistic misuse"), "A: exact Runtime addition is missing.");
  await evaluate(`(${runtimeLayer})?.focus(); true`);
  await key(" ", "Space", 32);
  assert.equal(await evaluate(`(${runtimeLayer})?.getAttribute("aria-pressed")`), "false", "A: keyboard reset did not restore the overview.");

  // B — exposure sufficiency: hover, pin E3, then use the explicit reset.
  const staticRelationships = await evaluate(`(() => [...document.querySelectorAll("[data-guardrails-relationship]")].map((node) => node.innerText.replace(/\\s+/g, " ").trim()))()`);
  assert.deepEqual(staticRelationships, [
    "Undone at will, internal only → Prompt, with monitoring",
    "Reversible at a cost, one customer → Runtime",
    "Irreversible, one customer → Runtime, + architectural scoping of the data and tools reached",
    "Regulator-visible, public, or safety → Architecture, + an independent second control",
    "Running above its exposure ceiling → Architecture, + a named artefact that carries the authority",
  ], "B: all five reviewed exposure relationships and additions must remain visible before selection.");
  const e3 = visibleControl("[data-guardrails-band='irreversible-customer']");
  const e3Initial = await evaluate(`(${e3})?.className`);
  await hover(e3);
  assert.notEqual(await evaluate(`(${e3})?.className`), e3Initial, "B: hover did not expose E3.");
  await click(e3);
  assert.equal(await evaluate(`(${e3})?.getAttribute("aria-pressed")`), "true", "B: click did not pin E3.");
  const expectedE3Addition = "+ architectural scoping of the data and tools reached";
  assert.equal(
    await evaluate(`document.querySelector("[data-guardrails-live-summary]")?.innerText.trim()`),
    "Irreversible, one customer → Runtime, + architectural scoping of the data and tools reached",
    "B: pin did not update the exact live relationship summary.",
  );
  assert.ok(staticRelationships[2].includes(expectedE3Addition), "B: reviewed E3 addition changed.");
  await click(visibleControl("[data-guardrails-reset='exposure']"));
  assert.equal(await evaluate(`document.querySelector("[data-guardrails-live-summary]")?.innerText.trim()`), "", "B: reset did not clear the live selection summary.");
  assert.deepEqual(
    await evaluate(`(() => [...document.querySelectorAll("[data-guardrails-relationship]")].map((node) => node.innerText.replace(/\\s+/g, " ").trim()))()`),
    staticRelationships,
    "B: reset must preserve every static relationship and addition.",
  );

  // C — control questions: hover, pin, keyboard reset. The body remains
  // readable while the card's selected visual state changes.
  const evidence = visibleControl("[data-guardrails-question='afterwards']");
  const questionInitial = await evaluate(`(${evidence})?.className`);
  await hover(evidence);
  assert.notEqual(await evaluate(`(${evidence})?.className`), questionInitial, "C: hover did not focus the evidence question.");
  await click(evidence);
  assert.equal(await evaluate(`(${evidence})?.getAttribute("aria-pressed")`), "true", "C: click did not pin the evidence question.");
  assert.ok((await evaluate(`(${evidence})?.closest("[role=listitem]")?.innerText`)).includes("What is logged, what is monitored"), "C: exact evidence explanation is missing.");
  await evaluate(`(${evidence})?.focus(); true`);
  await key(" ", "Space", 32);
  assert.equal(await evaluate(`(${evidence})?.getAttribute("aria-pressed")`), "false", "C: keyboard reset did not restore the question overview.");

  // D — method rail: it is a keyboard-operable pinned interaction, not only a
  // mouse-hover affordance. A regression here must fail the smoke test.
  const prove = visibleControl("[data-guardrails-method='prove']");
  const methodInitial = await evaluate(`(${prove})?.closest("h3")?.className`);
  await hover(prove);
  assert.notEqual(await evaluate(`(${prove})?.closest("h3")?.className`), methodInitial, "D: hover did not focus the PROVE phase.");
  await click(prove);
  assert.equal(await evaluate(`(${prove})?.getAttribute("aria-pressed")`), "true", "D: click did not pin the PROVE phase.");
  assert.ok((await evaluate(`(${prove})?.parentElement?.parentElement?.innerText`)).includes("Attack each control directly"), "D: exact PROVE method addition is missing.");
  await evaluate(`(${prove})?.focus(); true`);
  await key(" ", "Space", 32);
  assert.equal(await evaluate(`(${prove})?.getAttribute("aria-pressed")`), "false", "D: keyboard reset did not restore the pinned method phase.");
}

async function assertMobileTouchInteractions() {
  const runtimeLayer = visibleControl("[data-guardrails-layer='runtime']");
  await touch(runtimeLayer);
  assert.equal(await evaluate(`(${runtimeLayer})?.getAttribute("aria-pressed")`), "true", "A mobile: touch did not pin Runtime.");
  await touch(runtimeLayer);
  assert.equal(await evaluate(`(${runtimeLayer})?.getAttribute("aria-pressed")`), "false", "A mobile: second touch did not reset Runtime.");

  const e3 = visibleControl("[data-guardrails-band='irreversible-customer']");
  await touch(e3);
  assert.equal(await evaluate(`(${e3})?.getAttribute("aria-pressed")`), "true", "B mobile: touch did not pin E3.");
  assert.equal(
    await evaluate(`document.querySelector("[data-guardrails-live-summary]")?.innerText.trim()`),
    "Irreversible, one customer → Runtime, + architectural scoping of the data and tools reached",
    "B mobile: touch did not retain the exact E3 relationship addition.",
  );
  await touch(visibleControl("[data-guardrails-reset='exposure']"));
  assert.equal(await evaluate(`document.querySelector("[data-guardrails-live-summary]")?.innerText.trim()`), "", "B mobile: reset did not clear the summary.");

  const evidence = visibleControl("[data-guardrails-question='afterwards']");
  await touch(evidence);
  assert.equal(await evaluate(`(${evidence})?.getAttribute("aria-pressed")`), "true", "C mobile: touch did not pin the evidence question.");
  await touch(evidence);
  assert.equal(await evaluate(`(${evidence})?.getAttribute("aria-pressed")`), "false", "C mobile: second touch did not reset the evidence question.");

  const prove = visibleControl("[data-guardrails-method='prove']");
  await touch(prove);
  assert.equal(await evaluate(`(${prove})?.getAttribute("aria-pressed")`), "true", "D mobile: touch did not pin PROVE.");
  await touch(prove);
  assert.equal(await evaluate(`(${prove})?.getAttribute("aria-pressed")`), "false", "D mobile: second touch did not reset PROVE.");
}

async function assertMobilePrint() {
  await setViewport(390, 844, true);
  await send("Emulation.setEmulatedMedia", { media: "print" });
  try {
    const print = await evaluate(`(() => ({
      print: matchMedia("print").matches,
      fits: document.documentElement.scrollWidth <= innerWidth + 1,
      headings: [...document.querySelectorAll(".guardrails-page h1,h2,h3,h4")].filter((node) => node.checkVisibility()).length,
    }))()`);
    assert.equal(print.print, true, "Mobile print emulation was not enabled.");
    assert.equal(print.fits, true, "Mobile print layout overflows.");
    assert.ok(print.headings >= 8, "Mobile print drops Guardrails headings.");
    const pdf = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    await writeFile(new URL("guardrails-preview-mobile-print.pdf", outputDirectory), Buffer.from(pdf.data, "base64"));
  } finally {
    await send("Emulation.setEmulatedMedia", { media: "screen" });
  }
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  if (fixtureMode) {
    await send("Fetch.enable", {
      patterns: [{ urlPattern: `*${fixtureEndpoint}`, requestStage: "Request" }],
    });
  }
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  for (const viewport of (connectorsOnly ? [
    { label: "desktop", width: 1440, height: 1000, mobile: false },
    { label: "tablet-768", width: 768, height: 1024, mobile: false },
  ] : [
    { label: "desktop", width: 1440, height: 1000, mobile: false },
    { label: "tablet-768", width: 768, height: 1024, mobile: false },
    { label: "mobile-390", width: 390, height: 844, mobile: true },
  ])) {
    await navigate(viewport);
    await assertViewport(viewport);
    if (connectorsOnly) await assertConnectorAlignment(viewport);
  }

  if (!connectorsOnly) {
    await navigate({ label: "desktop", width: 1440, height: 1000, mobile: false });
    await assertInteractions();
    await navigate({ label: "mobile-390", width: 390, height: 844, mobile: true });
    await assertMobileTouchInteractions();
    await assertMobilePrint();
  }
  if (fixtureMode) assert.ok(fixtureRequestCount >= 1, "Fixture render did not reach the fixed preview endpoint.");
  assert.equal(browserError, undefined, `Browser error: ${browserError?.message}`);
  console.log(fixtureMode
    ? "Guardrails fixture-render browser smoke test passed."
    : "Guardrails authorized-preview browser smoke test passed.");
} finally {
  socket.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}