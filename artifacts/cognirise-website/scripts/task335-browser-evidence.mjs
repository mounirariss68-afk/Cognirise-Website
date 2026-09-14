import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * Task 335 is a browser-evidence-only check.  It deliberately keeps the
 * approved public payload as the source of all legacy fields and overlays the
 * task335Summary export only in the after workflow.  Nothing is published or
 * written to the CMS by this script.
 *
 * The before figure is rendered from the committed legacy renderer:
 *   artifacts/cognirise-website/src/components/agent-authority/LegacyComparisonDiagram.tsx
 *
 * The old component is rendered to static markup in a temporary TypeScript
 * process, then installed into the public page's figure slot for the baseline
 * capture.  This keeps both workflows on the local website at port 80 while
 * making the before renderer independent from the working-tree component.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const websiteRoot = path.join(root, "artifacts/cognirise-website");
const outputDirectory = path.join(root, "screenshots/task-335");
const docsPath = path.join(root, "docs/cms/task-335-browser-evidence.md");
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const endpointPath = "/api/public/content/uae/en/framework/agent-authority-model";
const routePath = "/methodologies/agent-authority-model?market=uae&locale=en";
const timeout = 45_000;
const debuggingPort = 9400 + (process.pid % 500);
const profilePath = `/tmp/cognirise-task335-browser-${process.pid}`;
const temporaryDirectory = path.join(root, `.task335-browser-${process.pid}`);
const tsxPath = path.join(root, "scripts/node_modules/.bin/tsx");
const summarySourcePath = path.join(root, "scripts/src/cms/task-335-agent-authority-summary.ts");
const beforeComponentPath = "artifacts/cognirise-website/src/components/agent-authority/LegacyComparisonDiagram.tsx";
const textOnly = process.argv.includes("--text-200-only");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}.`);
  return response.json();
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function readTask335Summary() {
  const stdout = execFileSync(tsxPath, [summarySourcePath], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "development" },
  }).trim();
  const document = JSON.parse(stdout);
  if (!document.summary || typeof document.summary !== "object") {
    throw new Error("The task335Summary export did not produce a summary object.");
  }
  return document.summary;
}

const legacyPayload = await getJson(`${baseUrl}${endpointPath}`, "Approved public Agent Authority payload");
assert.equal(legacyPayload.kind, "framework", "The approved public payload must be a framework.");
assert.equal(legacyPayload.slug, "agent-authority-model", "The approved public payload has the wrong slug.");
assert.equal(legacyPayload.content?.template, "agent-authority", "The approved public payload has the wrong template.");
assert.ok(!Object.hasOwn(legacyPayload.content.guardrails, "summary"), "The before payload must be the approved legacy payload.");

const task335Summary = readTask335Summary();
assert.equal(task335Summary.rules?.length, 4, "task335Summary must contain exactly four rules.");
assert.equal(
  task335Summary.firstFigure?.asset,
  legacyPayload.content.guardrails.firstFigure.asset,
  "The summary fixture must retain the approved first-figure asset.",
);

const afterPayload = JSON.parse(JSON.stringify(legacyPayload));
afterPayload.content.guardrails.summary = task335Summary;

await rm(temporaryDirectory, { recursive: true, force: true });
await mkdir(temporaryDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });

const beforeSource = await readFile(path.join(root, beforeComponentPath), "utf8");
const beforeSourcePath = path.join(temporaryDirectory, "LegacyComparisonDiagram.before.tsx");
const rendererPath = path.join(temporaryDirectory, "render-before.ts");
const legacyPayloadPath = path.join(temporaryDirectory, "legacy-payload.json");
// The historical file relied on the Vite JSX transform's automatic runtime.
// tsx's standalone SSR loader uses the classic runtime, so add only the
// runtime import required to execute the committed renderer with standalone tsx.
await writeFile(beforeSourcePath, `import React from "react";\n${beforeSource}`);
await writeFile(legacyPayloadPath, JSON.stringify(legacyPayload));
await writeFile(rendererPath, `
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LegacyComparisonDiagram } from "./LegacyComparisonDiagram.before.tsx";

const payload = JSON.parse(readFileSync(process.argv[2], "utf8"));
const figure = payload.content.guardrails.firstFigure;
process.stdout.write(renderToStaticMarkup(createElement(LegacyComparisonDiagram, { figure })));
`);
const beforeMarkup = execFileSync(tsxPath, [rendererPath, legacyPayloadPath], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_ENV: "production" },
}).trim();
assert.match(beforeMarkup, /data-guardrails-comparison/, "The committed legacy component did not render a comparison figure.");

await rm(profilePath, { recursive: true, force: true });
const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--force-device-scale-factor=1",
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
      // Chromium has not exposed CDP yet.
    }
    await delay(100);
  }
  throw new Error("Chromium did not expose a page target.");
}

const target = await getTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
let afterActive = false;
let afterRequestCount = 0;
const unexpectedBrowserErrors = [];
const expectedBrowserErrors = [];

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") {
    unexpectedBrowserErrors.push(message.params.exceptionDetails.text || "Page runtime exception.");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    const text = message.params.entry.text || "Browser console error.";
    if (
      text.includes("framework/guardrails-framework")
      || text.includes("Failed to load resource")
    ) {
      expectedBrowserErrors.push(text);
    } else {
      unexpectedBrowserErrors.push(text);
    }
  }
  if (message.method === "Fetch.requestPaused") {
    void (async () => {
      const requestUrl = new URL(message.params.request.url);
      if (!afterActive || requestUrl.pathname !== endpointPath) {
        await send("Fetch.continueRequest", { requestId: message.params.requestId }).catch(() => {});
        return;
      }
      try {
        assert.equal(message.params.request.method, "GET", "The public CMS content request must remain a GET.");
        const body = JSON.stringify(afterPayload);
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
        afterRequestCount += 1;
      } catch (error) {
        unexpectedBrowserErrors.push(error instanceof Error ? error.message : String(error));
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
  socket.onopen = () => {
    clearTimeout(timer);
    resolve();
  };
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
    width,
    height,
    mobile,
    deviceScaleFactor: 1,
  });
}

async function waitForPage(after) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await evaluate(`(() => {
      const figure = document.querySelector("[data-guardrails-comparison]");
      const assessment = document.querySelector("#assessment");
      const details = document.querySelector("details");
      const summaryText = document.body?.innerText || "";
      return document.readyState === "complete"
        && Boolean(figure && assessment)
        && (${after} ? Boolean(details && summaryText.includes("Read the full explanation")) : true);
    })()`);
    if (ready) return;
    await delay(100);
  }
  throw new Error(after
    ? "The summary-fixture Agent Authority page did not become ready."
    : "The approved legacy Agent Authority page did not become ready.");
}

async function stabilize() {
  await evaluate(`(async () => {
    const style = document.createElement("style");
    style.id = "task335-browser-stabilize";
    style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
    document.head.append(style);
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

async function navigate({ width, height, mobile, after }) {
  afterActive = after;
  await setViewport(width, height, mobile);
  await send("Page.navigate", { url: `${baseUrl}${routePath}` });
  await waitForPage(after);
  await stabilize();
}

async function installBeforeRenderer() {
  const markupLiteral = JSON.stringify(beforeMarkup);
  const installed = await evaluate(`(() => {
    const current = document.querySelector("[data-guardrails-comparison]");
    if (!current) return { ok: false, reason: "current comparison figure is missing" };
    current.outerHTML = ${markupLiteral};
    document.documentElement.dataset.task335Workflow = "before-git-head-renderer";
    return {
      ok: true,
      caption: document.querySelector("[data-guardrails-comparison] figcaption")?.innerText || "",
    };
  })()`);
  assert.equal(installed.ok, true, installed.reason || "The before renderer could not be installed.");
  assert.match(installed.caption, /Guardrails govern the agent/i, "The before capture did not use the committed legacy caption.");
  await stabilize();
}

function rectangle(value) {
  return {
    x: Number(value.x.toFixed(2)),
    y: Number(value.y.toFixed(2)),
    width: Number(value.width.toFixed(2)),
    height: Number(value.height.toFixed(2)),
    right: Number(value.right.toFixed(2)),
    bottom: Number(value.bottom.toFixed(2)),
  };
}

async function collectMetrics(label) {
  const metrics = await evaluate(`(() => {
    const visible = (node) => {
      if (!node || !node.getClientRects().length) return false;
      const style = getComputedStyle(node);
      return style.visibility !== "hidden" && style.display !== "none";
    };
    const rect = (node) => node ? (() => {
      const value = node.getBoundingClientRect();
      return {
        x: value.x, y: value.y, width: value.width, height: value.height,
        right: value.right, bottom: value.bottom,
      };
    })() : null;
    const figure = document.querySelector("[data-guardrails-comparison]");
    const caption = figure?.querySelector("figcaption");
    const chart = [...document.querySelectorAll("figure")].find((node) =>
      (node.getAttribute("aria-describedby") || "").includes("legend")
      && /chart/i.test(node.getAttribute("aria-label") || ""),
    );
    const overflowContainer = (node) => node.closest(".overflow-x-auto,[role='region']");
    const outside = [...document.querySelectorAll("h1,h2,h3,h4,p,li,button,a,th,td,figcaption")]
      .filter((node) => visible(node) && !node.closest(".sr-only") && !overflowContainer(node))
      .filter((node) => {
        const value = node.getBoundingClientRect();
        return value.left < -1 || value.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2;
      })
      .slice(0, 25)
      .map((node) => {
        const value = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          text: (node.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120),
          left: Number(value.left.toFixed(2)),
          right: Number(value.right.toFixed(2)),
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
        };
      });
    const fontSelectors = {
      body: "body",
      comparison: "[data-guardrails-comparison]",
      comparisonCaption: "[data-guardrails-comparison] figcaption",
      interactionChart: "figure[aria-describedby*='legend']",
      interactionTitle: "figure[aria-describedby*='legend'] h3",
      assessmentTitle: "#assessment-title",
    };
    const fontSizes = Object.fromEntries(Object.entries(fontSelectors).map(([key, selector]) => {
      const node = document.querySelector(selector);
      return [key, node ? Number.parseFloat(getComputedStyle(node).fontSize) : null];
    }));
    return {
      label: ${JSON.stringify(label)},
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      pageFits: document.documentElement.scrollWidth <= innerWidth + 1
        && document.body.scrollWidth <= innerWidth + 1,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      comparisonFits: !figure || (
        figure.scrollWidth <= figure.clientWidth + 1
        && figure.scrollHeight >= figure.clientHeight
      ),
      guardrailsFits: (() => {
        const subsection = document.querySelector("#guardrails-and-authority")?.closest("section");
        return !subsection || subsection.scrollWidth <= subsection.clientWidth + 1;
      })(),
      outside,
      figure: rect(figure),
      caption: rect(caption),
      assessmentPresent: visible(document.querySelector("#assessment")),
      interactionChartPresent: visible(chart),
      summaryDetailsPresent: Boolean(document.querySelector("details")),
      fonts: fontSizes,
      openDetails: [...document.querySelectorAll("details")].map((node) => node.open),
    };
  })()`);
  assert.equal(metrics.pageFits, true, `${label}: document or body has horizontal overflow.`);
  assert.equal(metrics.comparisonFits, true, `${label}: comparison subsection has horizontal overflow.`);
  assert.equal(metrics.guardrailsFits, true, `${label}: guardrails subsection has horizontal overflow.`);
  assert.deepEqual(metrics.outside, [], `${label}: visible content overflows its viewport.`);
  assert.ok(metrics.figure?.height > 0, `${label}: comparison figure is empty.`);
  assert.ok(metrics.caption?.height > 0, `${label}: comparison figure caption is empty.`);
  assert.equal(metrics.assessmentPresent, true, `${label}: assessment is missing.`);
  assert.equal(metrics.interactionChartPresent, true, `${label}: InteractionChart is missing.`);
  return metrics;
}

async function captureElement(name, selector = "[data-guardrails-comparison]") {
  // A sticky site header is legitimately present in the full-page evidence,
  // but Chromium composites fixed/sticky chrome over beyond-viewport clips.
  // Hide only that chrome while taking the direct figure crop so the crop
  // begins at the figure's actual top edge.
  await evaluate(`(() => {
    for (const node of document.querySelectorAll("header,nav,[role='banner']")) {
      const style = getComputedStyle(node);
      if (style.position === "fixed" || style.position === "sticky") {
        node.dataset.task335OriginalVisibility = node.style.visibility;
        node.style.setProperty("visibility", "hidden", "important");
      }
    }
    return true;
  })()`);
  const box = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: "center", inline: "nearest" });
    const rect = element.getBoundingClientRect();
    // Page.captureScreenshot's beyond-viewport clip uses document
    // coordinates, not the post-scroll viewport coordinates.
    return { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height };
  })()`);
  try {
    assert.ok(box, `${name}: screenshot element is missing.`);
    const image = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.max(1, box.width),
        height: Math.max(1, box.height),
        scale: 1,
      },
    });
    const file = path.join(outputDirectory, `${name}.png`);
    await writeFile(file, Buffer.from(image.data, "base64"));
    return path.relative(root, file);
  } finally {
    await evaluate(`(() => {
      for (const node of document.querySelectorAll("[data-task335-original-visibility]")) {
        const original = node.dataset.task335OriginalVisibility;
        if (original) node.style.visibility = original;
        else node.style.removeProperty("visibility");
        delete node.dataset.task335OriginalVisibility;
      }
      return true;
    })()`).catch(() => {});
  }
}

async function captureFullPage(name) {
  const { contentSize } = await send("Page.getLayoutMetrics");
  const image = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    fromSurface: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.max(1, Math.ceil(contentSize.width)),
      height: Math.max(1, Math.ceil(contentSize.height)),
      scale: 1,
    },
  });
  const file = path.join(outputDirectory, `${name}.png`);
  await writeFile(file, Buffer.from(image.data, "base64"));
  return path.relative(root, file);
}

async function key(keyValue, code, keyCode) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await delay(100);
}

async function detailsKeyboardCheck() {
  const initial = await evaluate(`(() => {
    const details = document.querySelector("details");
    const summary = details?.querySelector("summary");
    summary?.focus();
    return { exists: Boolean(details && summary), open: details?.open ?? null, active: document.activeElement === summary };
  })()`);
  assert.equal(initial.exists, true, "Native summary/details controls are missing.");
  assert.equal(initial.open, false, "Native details must start closed.");
  assert.equal(initial.active, true, "Native details summary did not receive keyboard focus.");
  // Chromium's native <summary> activation is consistently exposed through
  // Space in headless CDP (Enter is reported as a key event but does not
  // toggle the disclosure in this native control).
  await key(" ", "Space", 32);
  const opened = await evaluate("document.querySelector('details')?.open === true");
  assert.equal(opened, true, "Space did not open the native details element.");
  await key(" ", "Space", 32);
  const closed = await evaluate("document.querySelector('details')?.open === false");
  assert.equal(closed, true, "Space did not close the native details element.");
  return { initial: initial.open, opened, closed };
}

async function applyTextOnlyScale() {
  await evaluate(`(() => {
    const subsection = document.querySelector("#guardrails-and-authority")?.closest("section");
    for (const details of subsection?.querySelectorAll("details") || []) details.open = true;
    return true;
  })()`);
  await stabilize();
  const before = await evaluate(`(() => {
    const subsection = document.querySelector("#guardrails-and-authority")?.closest("section");
    if (!subsection) return [];
    const visible = (node) => {
      if (!node.getClientRects().length || node.closest(".sr-only")) return false;
      const style = getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    const hasOwnText = (node) => [...node.childNodes].some((child) =>
      child.nodeType === Node.TEXT_NODE && Boolean(child.textContent?.trim()),
    );
    return [...subsection.querySelectorAll("*")]
      .filter((node) => visible(node) && hasOwnText(node))
      .map((node, index) => {
        node.dataset.task335TextSnapshot = String(index);
        return {
          index,
          tag: node.tagName,
          text: (node.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120),
          fontSize: Number.parseFloat(getComputedStyle(node).fontSize),
        };
      })
      .filter((entry) => Number.isFinite(entry.fontSize) && entry.fontSize > 0);
  })()`);
  assert.ok(before.length > 0, "200% text check found no visible guardrails-subsection text descendants.");
  await evaluate(`(() => {
    const subsection = document.querySelector("#guardrails-and-authority")?.closest("section");
    const snapshots = ${JSON.stringify(before)};
    for (const snapshot of snapshots) {
      const node = subsection?.querySelector(
        "[data-task335-text-snapshot='" + snapshot.index + "']",
      );
      node?.style.setProperty("font-size", (snapshot.fontSize * 2) + "px", "important");
    }
    document.documentElement.dataset.task335TextScale = "200-percent-fixed-pixel-snapshot";
    return true;
  })()`);
  await stabilize();
  const after = await evaluate(`(() => {
    const subsection = document.querySelector("#guardrails-and-authority")?.closest("section");
    return [...(subsection?.querySelectorAll("[data-task335-text-snapshot]") || [])]
      .map((node) => ({
        index: Number(node.dataset.task335TextSnapshot),
        fontSize: Number.parseFloat(getComputedStyle(node).fontSize),
      }))
      .filter((entry) => Number.isFinite(entry.fontSize) && entry.fontSize > 0);
  })()`);
  const afterByIndex = new Map(after.map((entry) => [entry.index, entry.fontSize]));
  const snapshots = before.map((entry) => {
    const afterFontSize = afterByIndex.get(entry.index);
    const ratio = afterFontSize ? afterFontSize / entry.fontSize : Number.NaN;
    return {
      ...entry,
      afterFontSize,
      ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(4)) : null,
    };
  });
  const ratios = snapshots
    .map((entry) => entry.ratio)
    .filter((value) => typeof value === "number");
  const minimumRatio = Math.min(...ratios);
  const maximumRatio = Math.max(...ratios);
  assert.equal(after.length, before.length, "200% text check lost visible text descendants.");
  assert.ok(minimumRatio >= 1.99, `200% text scale minimum ratio is ${minimumRatio}x.`);
  assert.ok(maximumRatio <= 2.01, `200% text scale maximum ratio is ${maximumRatio}x.`);
  return {
    mode: "fixed-pixel-descendant-snapshot",
    subsection: "#guardrails-and-authority closest section",
    descendantCount: snapshots.length,
    snapshots,
    minimumRatio,
    maximumRatio,
  };
}

let result;
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Fetch.enable", {
    patterns: [{ urlPattern: `*${endpointPath}`, requestStage: "Request" }],
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  if (textOnly) {
    const existing = JSON.parse(await readFile(path.join(outputDirectory, "task-335-browser-metrics.json"), "utf8"));
    const previousBeforeDesktop = existing.views?.beforeDesktop;
    assert.ok(previousBeforeDesktop?.figure?.height, "Text-only evidence requires the existing baseline metrics.");

    // Keep the approved baseline/mobile evidence and refresh only the current
    // summary desktop figure plus the corrected enlarged-text case.
    await navigate({ width: 1440, height: 1000, mobile: false, after: true });
    const summaryCaption = await evaluate("document.querySelector('[data-guardrails-comparison] figcaption')?.innerText || ''");
    assert.match(summaryCaption, /One common setting, or individually governed handovers/i, "The summary fixture caption was not rendered.");
    const afterDesktop = await collectMetrics("after-desktop");
    const afterDesktopScreenshot = await captureElement("task335-after-desktop");
    const afterDesktopPageScreenshot = await captureFullPage("task335-after-desktop-page");

    await navigate({ width: 1440, height: 1000, mobile: false, after: true });
    const textScale = await applyTextOnlyScale();
    const afterText200 = await collectMetrics("after-text-200-desktop");
    const afterText200Screenshot = await captureElement("task335-after-text-200-desktop");
    const afterText200PageScreenshot = await captureFullPage("task335-after-text-200-desktop-page");

    const desktopShorter = 1 - afterDesktop.figure.height / previousBeforeDesktop.figure.height;
    assert.ok(
      desktopShorter >= 0.35,
      `The desktop figure is only ${(desktopShorter * 100).toFixed(1)}% shorter; Task 335 requires at least 35%.`,
    );
    assert.deepEqual(unexpectedBrowserErrors, [], `Unexpected browser errors: ${unexpectedBrowserErrors.join("; ")}`);

    const screenshots = existing.screenshots.map((screenshot) => {
      if (screenshot.endsWith("task335-after-desktop.png")) return afterDesktopScreenshot;
      if (screenshot.endsWith("task335-after-desktop-page.png")) return afterDesktopPageScreenshot;
      if (screenshot.endsWith("task335-after-text-200-desktop.png")) return afterText200Screenshot;
      if (screenshot.endsWith("task335-after-text-200-desktop-page.png")) return afterText200PageScreenshot;
      return screenshot;
    });
    result = {
      ...existing,
      status: "passed",
      method: {
        ...existing.method,
        baseUrl,
        publicPayloadRevision: legacyPayload.revision,
        publicPayloadDigest: digest(legacyPayload),
        textScale: "Visible text descendants in the #guardrails-and-authority section were snapshotted, then each was set once to 2x its computed pixel size.",
      },
      payload: {
        ...existing.payload,
        legacyRevision: legacyPayload.revision,
        legacyDigest: digest(legacyPayload),
        summaryDigest: digest(task335Summary),
        afterFixtureDigest: digest(afterPayload),
        afterRequestCount,
      },
      figureHeight: {
        ...existing.figureHeight,
        after: {
          heightIncludingCaption: afterDesktop.figure.height,
          captionHeight: afterDesktop.caption.height,
          width: afterDesktop.figure.width,
        },
        shorterPercent: Number((desktopShorter * 100).toFixed(2)),
      },
      views: {
        ...existing.views,
        afterDesktop,
        afterText200,
      },
      textScale,
      screenshots,
      browserDiagnostics: {
        unexpectedErrors: unexpectedBrowserErrors,
        expectedErrors: expectedBrowserErrors,
      },
    };
    await writeFile(path.join(outputDirectory, "task-335-browser-metrics.json"), `${JSON.stringify(result, null, 2)}\n`);

    const format = (value) => `${Number(value).toFixed(2)}px`;
    const existingDocs = await readFile(docsPath, "utf8");
    const updatedDocs = existingDocs
      .replace(
        /(\| Desktop figure height including caption \(after\) \| )[^|]+(\|)/,
        `$1${format(afterDesktop.figure.height)} $2`,
      )
      .replace(
        /(\| Desktop reduction \| )[^|]+(\|)/,
        `$1${result.figureHeight.shorterPercent}% (asserted >= 35%) $2`,
      )
      .replace(
        /(\| Desktop caption height \(before → after\) \| )[^|]+(\|)/,
        `$1${format(previousBeforeDesktop.caption.height)} → ${format(afterDesktop.caption.height)} $2`,
      )
      .replace(
        /\| 200% [^\n]+\|[^\n]+/,
        `| 200% visible text font-size ratio | ${textScale.minimumRatio}x–${textScale.maximumRatio}x across ${textScale.descendantCount} descendants (asserted 1.99x–2.01x) |`,
      )
      .replace(
        /4\. Every snapshot waited[\s\S]*?(?:relative scaling\.|remains allowed\.)/,
        "4. Every snapshot waited for fonts/images, used reduced motion, and injected\n   transition/animation suppression. The 200% check snapshotted every visible\n   text descendant in the full #guardrails-and-authority section, then set each\n   once to 2x its computed pixel size and checked every resulting ratio. The\n   canonical chart's own horizontal scroll container remains allowed.",
      );
    await writeFile(docsPath, updatedDocs);
    console.log(`Task 335 text-only browser evidence passed; desktop figure is ${result.figureHeight.shorterPercent}% shorter.`);
  } else {
  // Before: actual approved public payload plus the committed legacy renderer.
  await navigate({ width: 1440, height: 1000, mobile: false, after: false });
  await installBeforeRenderer();
  const beforeDesktop = await collectMetrics("before-desktop");
  const beforeDesktopScreenshot = await captureElement("task335-before-desktop");
  const beforeDesktopPageScreenshot = await captureFullPage("task335-before-desktop-page");

  await navigate({ width: 390, height: 844, mobile: true, after: false });
  await installBeforeRenderer();
  const beforeMobile = await collectMetrics("before-mobile-390");
  const beforeMobileScreenshot = await captureElement("task335-before-mobile-390");
  const beforeMobilePageScreenshot = await captureFullPage("task335-before-mobile-390-page");

  // After: approved full legacy payload from the public API with only the
  // task335Summary export overlaid at the browser boundary. This is explicitly
  // a fixture render; it does not publish the staged draft.
  await navigate({ width: 1440, height: 1000, mobile: false, after: true });
  const summaryCaption = await evaluate("document.querySelector('[data-guardrails-comparison] figcaption')?.innerText || ''");
  assert.match(summaryCaption, /One common setting, or individually governed handovers/i, "The summary fixture caption was not rendered.");
  const afterDesktop = await collectMetrics("after-desktop");
  const afterDesktopScreenshot = await captureElement("task335-after-desktop");
  const afterDesktopPageScreenshot = await captureFullPage("task335-after-desktop-page");
  const details = await detailsKeyboardCheck();

  await navigate({ width: 768, height: 1024, mobile: false, after: true });
  const afterTablet = await collectMetrics("after-tablet-768");
  const afterTabletScreenshot = await captureElement("task335-after-tablet-768");
  const afterTabletPageScreenshot = await captureFullPage("task335-after-tablet-768-page");

  await navigate({ width: 390, height: 844, mobile: true, after: true });
  const afterMobile = await collectMetrics("after-mobile-390");
  const afterMobileScreenshot = await captureElement("task335-after-mobile-390");
  const afterMobilePageScreenshot = await captureFullPage("task335-after-mobile-390-page");

  await navigate({ width: 1440, height: 1000, mobile: false, after: true });
  const textScale = await applyTextOnlyScale();
  const afterText200 = await collectMetrics("after-text-200-desktop");
  const afterText200Screenshot = await captureElement("task335-after-text-200-desktop");
  const afterText200PageScreenshot = await captureFullPage("task335-after-text-200-desktop-page");

  const desktopShorter = 1 - afterDesktop.figure.height / beforeDesktop.figure.height;
  const mobileShorter = 1 - afterMobile.figure.height / beforeMobile.figure.height;
  assert.ok(
    desktopShorter >= 0.35,
    `The desktop figure is only ${(desktopShorter * 100).toFixed(1)}% shorter; Task 335 requires at least 35%.`,
  );

  result = {
    task: 335,
    status: "passed",
    method: {
      baseUrl,
      beforeSource: beforeComponentPath,
      beforeRenderer: "Temporary tsx SSR markup from the committed LegacyComparisonDiagram component, installed only into the public page figure slot.",
      publicPayload: `${baseUrl}${endpointPath}`,
      publicPayloadRevision: legacyPayload.revision,
      publicPayloadDigest: digest(legacyPayload),
      afterRenderer: "Current website route with approved public payload and task335Summary fixture fulfilled at the browser CDP boundary.",
      summarySource: "scripts/src/cms/task-335-agent-authority-summary.ts :: task335Summary",
      publication: "No CMS write, approval, publication, or preview capability was performed.",
      stabilization: "prefers-reduced-motion plus injected transition/animation suppression before each snapshot.",
      textScale: "Visible text descendants in the #guardrails-and-authority section were snapshotted, then each was set once to 2x its computed pixel size.",
      browser: browserPath,
    },
    payload: {
      legacyRevision: legacyPayload.revision,
      legacyDigest: digest(legacyPayload),
      summaryDigest: digest(task335Summary),
      afterFixtureDigest: digest(afterPayload),
      afterRequestCount,
    },
    figureHeight: {
      viewport: "1440x1000",
      before: {
        heightIncludingCaption: beforeDesktop.figure.height,
        captionHeight: beforeDesktop.caption.height,
        width: beforeDesktop.figure.width,
      },
      after: {
        heightIncludingCaption: afterDesktop.figure.height,
        captionHeight: afterDesktop.caption.height,
        width: afterDesktop.figure.width,
      },
      shorterPercent: Number((desktopShorter * 100).toFixed(2)),
    },
    mobileFigureHeight: {
      viewport: "390x844",
      before: {
        heightIncludingCaption: beforeMobile.figure.height,
        captionHeight: beforeMobile.caption.height,
        width: beforeMobile.figure.width,
      },
      after: {
        heightIncludingCaption: afterMobile.figure.height,
        captionHeight: afterMobile.caption.height,
        width: afterMobile.figure.width,
      },
      shorterPercent: Number((mobileShorter * 100).toFixed(2)),
    },
    views: {
      beforeDesktop,
      beforeMobile,
      afterDesktop,
      afterTablet,
      afterMobile,
      afterText200,
    },
    textScale,
    nativeDetails: details,
    screenshots: [
      beforeDesktopScreenshot,
      beforeDesktopPageScreenshot,
      beforeMobileScreenshot,
      beforeMobilePageScreenshot,
      afterDesktopScreenshot,
      afterDesktopPageScreenshot,
      afterTabletScreenshot,
      afterTabletPageScreenshot,
      afterMobileScreenshot,
      afterMobilePageScreenshot,
      afterText200Screenshot,
      afterText200PageScreenshot,
    ],
    browserDiagnostics: {
      unexpectedErrors: unexpectedBrowserErrors,
      expectedErrors: expectedBrowserErrors,
    },
  };

  assert.equal(afterRequestCount >= 1, true, "The after workflow did not exercise the summary fixture request.");
  assert.deepEqual(unexpectedBrowserErrors, [], `Unexpected browser errors: ${unexpectedBrowserErrors.join("; ")}`);
  await writeFile(path.join(outputDirectory, "task-335-browser-metrics.json"), `${JSON.stringify(result, null, 2)}\n`);

  const format = (value) => `${Number(value).toFixed(2)}px`;
  await writeFile(docsPath, `# Task 335 browser evidence

This evidence was captured against the local website at \`${baseUrl}\` with native
Chromium CDP. It is a browser-only fixture render; it did not write to the CMS,
approve a revision, publish content, or create a preview capability.

## Method

1. The approved UAE/English legacy payload was fetched from
   \`${baseUrl}${endpointPath}\` (revision ${legacyPayload.revision}, digest
   \`${digest(legacyPayload)}\`). No fields were reconstructed.
2. The before renderer was generated from
   the committed \`${beforeComponentPath}\`, rendered to temporary static markup,
   and installed only into the public route's comparison-figure slot. The before
   payload remained the approved public payload.
3. The after workflow loaded the current website route. CDP fulfilled only the
   Agent Authority public content request with the approved full payload plus the
   \`task335Summary\` export from
   \`scripts/src/cms/task-335-agent-authority-summary.ts\`. This is explicitly a
   local summary fixture; it is not public publishing.
4. Every snapshot waited for fonts/images, used reduced motion, and injected
   transition/animation suppression. The 200% check snapshotted every visible
   text descendant in the full #guardrails-and-authority section, then set each
   once to 2x its computed pixel size and checked every resulting ratio. The
   canonical chart's own horizontal scroll container remains allowed.

## Assertions and measurements

| Check | Result |
| --- | --- |
| Desktop figure height including caption (before) | ${format(beforeDesktop.figure.height)} |
| Desktop figure height including caption (after) | ${format(afterDesktop.figure.height)} |
| Desktop reduction | ${result.figureHeight.shorterPercent}% (asserted >= 35%) |
| Desktop caption height (before → after) | ${format(beforeDesktop.caption.height)} → ${format(afterDesktop.caption.height)} |
| Mobile figure height including caption (before → after) | ${format(beforeMobile.figure.height)} → ${format(afterMobile.figure.height)} |
| Mobile reduction | ${result.mobileFigureHeight.shorterPercent}% |
| Assessment present | desktop/tablet/mobile/200% |
| InteractionChart present | desktop/tablet/mobile/200% |
| Page-level horizontal overflow | none at all captured viewports |
| Native details keyboard | Space opened; Space closed |
| 200% visible text font-size ratio | ${textScale.minimumRatio}x–${textScale.maximumRatio}x across ${textScale.descendantCount} descendants (asserted 1.99x–2.01x) |

The full per-viewport DOM metrics, overflow offenders, computed font snapshots,
payload digests, diagnostics, and screenshot paths are in
\`screenshots/task-335/task-335-browser-metrics.json\`.

## Screenshots

The named figure crops are the direct before/after comparison at the requested
viewports. The \`-page\` companions are full-page captures:

${result.screenshots.map((screenshot) => `- \`${screenshot}\``).join("\n")}
`);
  console.log(`Task 335 browser evidence passed; desktop figure is ${result.figureHeight.shorterPercent}% shorter.`);
  }
} finally {
  socket.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
  await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => {});
}