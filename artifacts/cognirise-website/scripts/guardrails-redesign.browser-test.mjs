import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { promisify } from "node:util";
import { extname, resolve as resolvePath } from "node:path";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";

/*
 * Focused evidence harness for the Guardrails redesign.
 *
 * There are deliberately two delivery modes:
 *   authentic (default): navigate with the short-lived, authorized preview
 *   capability supplied by the runner. No request is mocked in this mode.
 *   fixture (--fixture-render): intercept only the named synthetic preview
 *   endpoint and its named synthetic hero-media URL. This makes a local,
 *   immutable snapshot and local hero bytes usable without bypassing auth.
 *
 * This file is a browser evidence harness, not application code. Selectors
 * prefer data-* hooks so a renderer can coordinate with this harness without
 * coupling the evidence to Tailwind classes. The semantic fallbacks keep the
 * harness useful while those hooks are being added to the redesign.
 */

const execFile = promisify(execFileCallback);
const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const argumentValue = (...names) => {
  for (const name of names) {
    const index = args.indexOf(name);
    if (index >= 0) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
      return value;
    }
  }
  return undefined;
};

if (hasFlag("--help")) {
  console.log([
    "Guardrails redesign browser evidence",
    "",
    "Authentic preview (never intercepted):",
    "  PULSE_GUARDRAILS_PREVIEW_PATH=/preview/<capability> node scripts/guardrails-redesign.browser-test.mjs",
    "",
    "Synthetic fixture (only the synthetic preview/media URLs are intercepted):",
    "  node scripts/guardrails-redesign.browser-test.mjs --fixture-render",
    "    --snapshot-json /absolute/path/snapshot.json",
    "    --hero-bytes /absolute/path/hero.jpg",
    "",
    "Optional baseline renderer URL for before/after DOM word comparison:",
    "  --baseline-url http://127.0.0.1:<port>/preview/guardrails-redesign-fixture",
    "Or use an exact git HEAD baseline snapshot for a temporary SSR baseline:",
    "  --baseline-snapshot-json /absolute/path/guardrails-baseline.json",
    "",
    "Targeted final follow-up (screenshots/words/overflow/print only; no interactions):",
    "  --targeted-final --fixture-render --snapshot-json ... --hero-bytes ...",
    "",
    "The harness does not start an application server. Run it only after the",
    "runner has explicitly made the browser target ready.",
  ].join("\n"));
  process.exit(0);
}

const fixtureMode = hasFlag("--fixture-render");
const targetedFinal = hasFlag("--targeted-final");
const snapshotPathInput = argumentValue("--snapshot-json", "--snapshot")
  || process.env.PULSE_GUARDRAILS_REDESIGN_SNAPSHOT_PATH;
const heroBytesPathInput = argumentValue("--hero-bytes", "--hero")
  || process.env.PULSE_GUARDRAILS_REDESIGN_HERO_BYTES_PATH;
const baselineSnapshotPathInput = argumentValue("--baseline-snapshot-json", "--baseline-snapshot")
  || process.env.PULSE_GUARDRAILS_REDESIGN_BASELINE_SNAPSHOT_PATH;
const snapshotPath = snapshotPathInput ? resolvePath(snapshotPathInput) : undefined;
const heroBytesPath = heroBytesPathInput ? resolvePath(heroBytesPathInput) : undefined;
const baselineSnapshotPath = baselineSnapshotPathInput ? resolvePath(baselineSnapshotPathInput) : undefined;
const baselineUrl = argumentValue("--baseline-url")
  || process.env.PULSE_GUARDRAILS_REDESIGN_BASELINE_URL;
const previewPath = process.env.PULSE_GUARDRAILS_PREVIEW_PATH;
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const outputDirectory = new URL("../../../screenshots/guardrails/redesign/", import.meta.url);
const sourceFileUrl = new URL("../src/pages/GuardrailsFramework.tsx", import.meta.url);
const profilePath = `/tmp/cognirise-guardrails-redesign-browser-${process.pid}`;
const debuggingPort = Number(process.env.PULSE_GUARDRAILS_REDESIGN_DEBUG_PORT || 9352);
const timeout = 45_000;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const normalized = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const fixtureRoute = "/preview/guardrails-redesign-fixture";
const fixtureEndpoint = "/api/preview/guardrails-redesign-fixture";
const fixtureMediaPath = "/__guardrails-redesign-fixture__/hero";
const sourceRelativePath = "artifacts/cognirise-website/src/pages/GuardrailsFramework.tsx";
const olderBeforeScreenshots = [
  "screenshots/guardrails/authority-before-desktop.jpg",
  "screenshots/guardrails/authority-before-mobile.jpg",
];

if (fixtureMode && (previewPath || !snapshotPath || !heroBytesPath)) {
  throw new Error(
    "Fixture mode requires --snapshot-json and --hero-bytes, and must not receive an authorized preview path.",
  );
}
if (!fixtureMode && (snapshotPath || heroBytesPath)) {
  throw new Error("Snapshot and hero bytes are accepted only with explicit --fixture-render.");
}
if (!fixtureMode && (!previewPath || !previewPath.startsWith("/") || previewPath.includes("://"))) {
  throw new Error("An authorized Guardrails preview path is required in authentic mode.");
}
if (baselineUrl && !/^https?:\/\//.test(baselineUrl)) {
  throw new Error("--baseline-url must be an absolute HTTP(S) URL.");
}
for (const [label, path] of [
  ["snapshot JSON", snapshotPathInput],
  ["hero bytes", heroBytesPathInput],
  ["baseline snapshot JSON", baselineSnapshotPathInput],
]) {
  if (path && path.includes("://")) {
    throw new Error(`${label} must be a local path, not a URL.`);
  }
}
if (baselineSnapshotPath && !fixtureMode) {
  throw new Error("--baseline-snapshot-json is accepted only with explicit --fixture-render.");
}

const fixtureNavigation = Object.freeze({
  market: "uae",
  locale: "en",
  items: Object.freeze([]),
  pages: Object.freeze([]),
});

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unwrapSnapshot(raw) {
  if (isRecord(raw.document) && raw.document.content) return { document: raw.document, envelope: raw };
  if (isRecord(raw.payload) && raw.payload.content) return { document: raw.payload, envelope: raw };
  return { document: raw, envelope: raw };
}

function mediaTypeFor(path) {
  const fromEnvironment = process.env.PULSE_GUARDRAILS_REDESIGN_HERO_MIME;
  if (fromEnvironment) return fromEnvironment;
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  }[extname(path).toLowerCase()] || "image/jpeg";
}

let fixtureDocument;
let fixtureEnvelope;
let heroBytes;
let heroMimeType;
let heroDigest;
let headRendererSource = "";

if (fixtureMode) {
  const rawSnapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  const unwrapped = unwrapSnapshot(rawSnapshot);
  fixtureDocument = clone(unwrapped.document);
  assert.ok(isRecord(fixtureDocument), "Snapshot must contain a CMS document object.");
  assert.equal(fixtureDocument.slug, "guardrails-framework", "Snapshot document.slug must be guardrails-framework.");
  assert.equal(
    fixtureDocument.content?.template,
    "guardrails",
    "Snapshot document.content.template must be guardrails.",
  );

  heroBytes = await readFile(heroBytesPath);
  assert.ok(heroBytes.length > 0, "Hero bytes file must not be empty.");
  heroMimeType = mediaTypeFor(heroBytesPath);
  assert.ok(heroMimeType.startsWith("image/"), `Hero bytes must be an image, received ${heroMimeType}.`);
  heroDigest = createHash("sha256").update(heroBytes).digest("hex");

  const media = Array.isArray(unwrapped.envelope.media)
    ? clone(unwrapped.envelope.media)
    : Array.isArray(fixtureDocument.media) ? clone(fixtureDocument.media) : [];
  const content = fixtureDocument.content;
  const existingReference = isRecord(content.heroMedia)
    && typeof content.heroMedia.mediaId === "string"
    && typeof content.heroMedia.mediaVersionId === "string"
    ? content.heroMedia
    : null;
  const legacyMediaId = typeof content.heroMediaId === "string" ? content.heroMediaId : null;
  const existingMedia = existingReference
    ? media.find((item) => item?.id === existingReference.mediaId && item?.versionId === existingReference.mediaVersionId)
    : legacyMediaId ? media.find((item) => item?.id === legacyMediaId) : null;
  const heroReference = existingReference || {
    mediaId: existingMedia?.id || "guardrails-redesign-fixture-hero",
    mediaVersionId: existingMedia?.versionId || "fixture-v1",
    altText: "Guardrails framework hero",
  };
  content.heroMedia = heroReference;
  delete content.heroMediaId;

  const heroMedia = {
    ...(existingMedia || {}),
    id: heroReference.mediaId,
    versionId: heroReference.mediaVersionId,
    url: fixtureMediaPath,
    mimeType: heroMimeType,
    width: existingMedia?.width || null,
    height: existingMedia?.height || null,
    altText: heroReference.altText || existingMedia?.altText || "Guardrails framework hero",
  };
  const mediaIndex = media.findIndex((item) => item?.id === heroMedia.id && item?.versionId === heroMedia.versionId);
  if (mediaIndex >= 0) media[mediaIndex] = heroMedia;
  else media.push(heroMedia);

  fixtureEnvelope = Object.freeze({
    kind: "framework",
    document: fixtureDocument,
    market: typeof unwrapped.envelope.market === "string" ? unwrapped.envelope.market : "uae",
    locale: typeof unwrapped.envelope.locale === "string" ? unwrapped.envelope.locale : "en",
    requestedMarket: typeof unwrapped.envelope.requestedMarket === "string" ? unwrapped.envelope.requestedMarket : "uae",
    requestedLocale: typeof unwrapped.envelope.requestedLocale === "string" ? unwrapped.envelope.requestedLocale : "en",
    revisionId: typeof unwrapped.envelope.revisionId === "string"
      ? unwrapped.envelope.revisionId
      : "fixture-guardrails-redesign-review",
    revisionNumber: Number.isFinite(Number(unwrapped.envelope.revisionNumber))
      ? Number(unwrapped.envelope.revisionNumber)
      : 1,
    usedFallback: false,
    media,
    missingMediaIds: [],
    validationWarnings: [],
    navigation: isRecord(unwrapped.envelope.navigation) ? unwrapped.envelope.navigation : fixtureNavigation,
  });
}

await rm(profilePath, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
let priorEvidence;
const evidencePath = new URL("guardrails-redesign-evidence.json", outputDirectory);
if (targetedFinal) {
  try {
    priorEvidence = JSON.parse(await readFile(evidencePath, "utf8"));
    const initialEvidencePath = new URL("guardrails-redesign-evidence-initial.json", outputDirectory);
    try {
      await readFile(initialEvidencePath, "utf8");
    } catch {
      await writeFile(initialEvidencePath, `${JSON.stringify(priorEvidence, null, 2)}\n`);
    }
  } catch {
    priorEvidence = undefined;
  }
}

async function captureRendererSources() {
  const currentSource = await readFile(sourceFileUrl, "utf8");
  const currentHash = createHash("sha256").update(currentSource).digest("hex");
  let gitRoot;
  let headRevision;
  let headSource;
  try {
    gitRoot = (await execFile("git", ["rev-parse", "--show-toplevel"])).stdout.trim();
    headRevision = (await execFile("git", ["-C", gitRoot, "rev-parse", "HEAD"])).stdout.trim();
    headSource = (await execFile("git", [
      "-C", gitRoot, "show", `HEAD:${sourceRelativePath}`,
    ])).stdout;
  } catch {
    // Source metadata remains useful even when this runner is not inside git.
  }
  const headHash = headSource
    ? createHash("sha256").update(headSource).digest("hex")
    : null;
  headRendererSource = headSource || "";
  await writeFile(new URL("renderer-before-head.tsx", outputDirectory), headSource || "");
  await writeFile(new URL("renderer-after-working-tree.tsx", outputDirectory), currentSource);
  return {
    path: sourceRelativePath,
    before: {
      source: "git HEAD",
      revision: headRevision || null,
      sha256: headHash,
      captured: Boolean(headSource),
    },
    after: {
      source: "working tree at browser run",
      sha256: currentHash,
      captured: true,
    },
    note: "These files are source captures only; the harness never edits application source.",
  };
}

const rendererSource = await captureRendererSources();
let baselineStaticHtml;
let baselineTempPath;

async function renderGitHeadBaseline(snapshotFile) {
  if (!headRendererSource) {
    throw new Error("Cannot prepare a git HEAD baseline: GuardrailsFramework.tsx was not available from git HEAD.");
  }
  const tempPath = `/tmp/cognirise-guardrails-redesign-head-${process.pid}`;
  baselineTempPath = tempPath;
  await rm(tempPath, { recursive: true, force: true });
  await mkdir(tempPath, { recursive: true });
  await writeFile(`${tempPath}/GuardrailsFramework.tsx`, headRendererSource);
  await writeFile(`${tempPath}/tsconfig.json`, JSON.stringify({
    compilerOptions: {
      jsx: "react-jsx",
      module: "ESNext",
      moduleResolution: "Bundler",
      baseUrl: ".",
      paths: { "@/*": [`${process.cwd()}/artifacts/cognirise-website/src/*`] },
    },
  }));
  await symlink(
    new URL("../node_modules", import.meta.url).pathname,
    `${tempPath}/node_modules`,
    "junction",
  );
  const renderScript = `
    import React from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { readFile } from "node:fs/promises";
    globalThis.location = { pathname: "/preview/guardrails-redesign-fixture" };
    (async () => {
      const { GuardrailsLayout } = await import("./GuardrailsFramework.tsx");
      const source = JSON.parse(await readFile(${JSON.stringify(snapshotFile)}, "utf8"));
      const framework = {
        ...source.content,
        id: "guardrails-head-baseline",
        slug: source.slug,
        title: source.title,
        summary: source.summary ?? null,
        media: [],
        seo: source.seo ?? {},
        publishedAt: "",
        updatedAt: "",
        market: "uae",
        requestedMarket: "uae",
        requestedLocale: "en",
        usedFallback: false,
      };
      const html = renderToStaticMarkup(
        React.createElement(GuardrailsLayout, { framework, renderPolicy: "cms", preview: true }),
      );
      process.stdout.write(JSON.stringify({ html }));
    })();
  `;
  await writeFile(`${tempPath}/render-baseline.mts`, renderScript);
  const tsxPath = new URL("../node_modules/.bin/tsx", import.meta.url).pathname;
  const result = await execFile(tsxPath, [`${tempPath}/render-baseline.mts`], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: `${tempPath}/tsconfig.json`,
    },
    maxBuffer: 20 * 1024 * 1024,
  });
  const rendered = JSON.parse(result.stdout).html;
  assert.ok(rendered.includes('class="guardrails-page'), "git HEAD baseline SSR did not render the Guardrails article.");
  return rendered;
}

if (fixtureMode && baselineSnapshotPath && !baselineUrl) {
  baselineStaticHtml = await renderGitHeadBaseline(baselineSnapshotPath);
  await writeFile(new URL("guardrails-redesign-baseline-head.html", outputDirectory), baselineStaticHtml);
}

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
const sleep = delay;
let browserError;
let commandId = 0;
let fixtureRequestCount = 0;
let fixtureMediaRequestCount = 0;
let interceptedPaths = [];
let socket;
const pending = new Map();
let previewWaiter;

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
    await sleep(100);
  }
  throw new Error("Chromium did not expose a page target.");
}

const target = await getTarget();
socket = new WebSocket(target.webSocketDebuggerUrl);

function rejectPending(error) {
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.reject(error);
  }
  pending.clear();
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

async function fulfill(requestId, body, contentType) {
  const encoded = Buffer.isBuffer(body) ? body.toString("base64") : Buffer.from(body).toString("base64");
  await send("Fetch.fulfillRequest", {
    requestId,
    responseCode: 200,
    responseHeaders: [
      { name: "Content-Type", value: contentType },
      { name: "Content-Length", value: String(Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body)) },
      { name: "Cache-Control", value: "no-store" },
    ],
    body: encoded,
  });
}

async function handlePausedRequest(params) {
  const pathname = new URL(params.request.url).pathname;
  if (!fixtureMode || (pathname !== fixtureEndpoint && pathname !== fixtureMediaPath)) {
    // In authentic mode Fetch is not enabled. In fixture mode this branch is
    // an explicit fail-safe: never fulfill a non-synthetic request.
    await send("Fetch.continueRequest", { requestId: params.requestId }).catch(() => {});
    return;
  }
  try {
    assert.equal(params.request.method, "GET", `Synthetic fixture request must use GET (${pathname}).`);
    interceptedPaths.push(pathname);
    if (pathname === fixtureEndpoint) {
      await fulfill(params.requestId, JSON.stringify(fixtureEnvelope), "application/json; charset=utf-8");
      fixtureRequestCount += 1;
      if (previewWaiter) {
        const waiter = previewWaiter;
        previewWaiter = undefined;
        clearTimeout(waiter.timer);
        waiter.resolve();
      }
    } else {
      await fulfill(params.requestId, heroBytes, heroMimeType);
      fixtureMediaRequestCount += 1;
    }
  } catch (error) {
    browserError = error instanceof Error ? error : new Error(String(error));
    if (previewWaiter) {
      const waiter = previewWaiter;
      previewWaiter = undefined;
      clearTimeout(waiter.timer);
      waiter.reject(browserError);
    }
    await send("Fetch.continueRequest", { requestId: params.requestId }).catch(() => {});
  }
}

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") {
    browserError = new Error(message.params.exceptionDetails.text || "Page runtime exception.");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    browserError = new Error(message.params.entry.text);
  }
  if (message.method === "Fetch.requestPaused") {
    void handlePausedRequest(message.params);
    return;
  }
  if (!message.id || !pending.has(message.id)) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  clearTimeout(request.timer);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
};
socket.onerror = (error) => {
  const failure = new Error(`CDP websocket error: ${String(error)}`);
  browserError = failure;
  rejectPending(failure);
};

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("CDP websocket did not open.")), timeout);
  socket.onopen = () => {
    clearTimeout(timer);
    resolve();
  };
  socket.onerror = reject;
});

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

async function setViewport(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    mobile: viewport.mobile,
    deviceScaleFactor: 1,
  });
}

async function waitForFixtureRequest() {
  if (!fixtureMode) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      previewWaiter = undefined;
      reject(new Error("Synthetic preview request did not arrive."));
    }, timeout);
    previewWaiter = { resolve, reject, timer };
  });
}

async function waitForPage() {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (browserError) throw browserError;
    const ready = await evaluate(`(() => {
      const root = document.querySelector("[data-guardrails-page], article.guardrails-page, .guardrails-page");
      const sections = root
        ? [...root.children].filter((node) => node.tagName === "SECTION")
        : [];
      return document.readyState === "complete"
        && Boolean(root?.querySelector("h1"))
        && sections.length >= 6;
    })()`);
    if (ready) return;
    await sleep(100);
  }
  throw new Error("Guardrails renderer did not become ready.");
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

async function collectRuntimeStylesheet() {
  return evaluate(`(() => [...document.styleSheets].flatMap((sheet) => {
    try { return [...sheet.cssRules].map((rule) => rule.cssText); } catch { return []; }
  }).join("\\n"))()`);
}

async function setStaticDocument(html) {
  const frameTree = await send("Page.getFrameTree");
  const frameId = frameTree.frameTree.frame.id;
  const withStyles = html.replace(
    "</head>",
    `<style data-guardrails-redesign-baseline-runtime>${runtimeStylesheet}</style></head>`,
  );
  await send("Page.setDocumentContent", { frameId, html: withStyles });
}

function captureUrl(capture) {
  if (capture.url.startsWith("http")) return capture.url;
  return `${baseUrl}${capture.url}`;
}

let runtimeStylesheet = "";

async function navigate(viewport, capture) {
  await setViewport(viewport);
  await send("Page.navigate", { url: "about:blank" });
  await sleep(50);
  if (capture.staticHtml) {
    await setStaticDocument(capture.staticHtml);
    await waitForPage();
    await waitForLayout();
    return;
  }
  const countBefore = fixtureRequestCount;
  const fixtureRequest = fixtureMode ? waitForFixtureRequest() : null;
  await send("Page.navigate", { url: captureUrl(capture) });
  if (fixtureRequest) {
    await fixtureRequest;
    assert.equal(
      fixtureRequestCount,
      countBefore + 1,
      `${capture.label}/${viewport.label}: expected exactly one synthetic preview request.`,
    );
  }
  await waitForPage();
  await waitForLayout();
}

const pageRootExpression = `(() => {
  const root = document.querySelector("[data-guardrails-page], article.guardrails-page, .guardrails-page");
  if (!root) return null;
  const article = root.tagName === "ARTICLE" ? root : root.closest("article") || root;
  const directSections = [...root.children].filter((node) => node.tagName === "SECTION");
  const markedSections = [...root.children].filter((node) => node.hasAttribute("data-guardrails-section"));
  const sections = markedSections.length >= 6 ? markedSections : directSections;
  const header = [...root.children].find((node) => node.tagName === "HEADER");
  const groups = header ? [header, ...sections] : sections;
  return { root, article, header, sections, groups };
})()`;

async function sectionList() {
  return evaluate(`(() => {
    const state = ${pageRootExpression};
    if (!state) return [];
    return state.groups.map((node, index) => {
      const rect = node.getBoundingClientRect();
      const heading = node.querySelector("h2,h3,h1")?.textContent || "";
      return {
        index,
        label: node.getAttribute("data-guardrails-section")
          || node.getAttribute("data-section")
          || heading.replace(/\\s+/g, " ").trim()
          || "section-" + String(index + 1).padStart(2, "0"),
        heading: heading.replace(/\\s+/g, " ").trim(),
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
        height: rect.height,
        width: rect.width,
      };
    });
  })()`);
}

async function sectionClip(index) {
  return evaluate(`(() => {
    const state = ${pageRootExpression};
    const node = state?.groups[${index}];
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: Math.max(0, rect.left + scrollX),
      y: Math.max(0, rect.top + scrollY),
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      scale: 1,
    };
  })()`);
}

async function screenshot(name, clip) {
  const params = { format: "png", captureBeyondViewport: true };
  if (clip) {
    params.clip = clip;
  } else {
    const { contentSize } = await send("Page.getLayoutMetrics");
    params.clip = {
      x: 0,
      y: 0,
      width: Math.ceil(contentSize.width),
      height: Math.ceil(contentSize.height),
      scale: 1,
    };
  }
  const image = await send("Page.captureScreenshot", params);
  await writeFile(new URL(`${name}.png`, outputDirectory), Buffer.from(image.data, "base64"));
}

function fileSlug(value) {
  return normalized(value).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60)
    || "section";
}

async function inspectViewport(viewport, capture) {
  const result = await evaluate(`(() => {
    const state = ${pageRootExpression};
    if (!state) return { error: "Guardrails root is missing." };
    const visible = (node) => {
      if (!node || node.closest(".sr-only,[aria-hidden='true']")) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const excluded = (node) => Boolean(
      node.closest("header,nav,footer")
      || node.closest(".sr-only,[aria-hidden='true']")
      || node.closest("details:not([open])"),
    );
    const textNodes = [];
    const walker = document.createTreeWalker(state.article, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) {
      const parent = current.parentElement;
      if (!parent || excluded(parent) || !visible(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(current);
      const rect = range.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      textNodes.push(current.nodeValue || "");
    }
    const visibleBodyText = textNodes.join(" ").replace(/\\s+/g, " ").trim();
    const words = visibleBodyText.match(/[\\p{L}\\p{N}]+(?:['’.-][\\p{L}\\p{N}]+)*/gu) || [];
    const outside = [...state.article.querySelectorAll("h1,h2,h3,h4,p,li,button,a,summary,th,td")]
      .filter((node) => visible(node))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const clippedOverflow = node.scrollWidth > node.clientWidth + 2
          && !["auto", "scroll", "hidden", "clip"].includes(style.overflowX);
        return rect.left < -1 || rect.right > innerWidth + 1 || clippedOverflow;
      })
      .map((node) => ({
        tag: node.tagName,
        text: (node.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120),
        left: Math.round(node.getBoundingClientRect().left),
        right: Math.round(node.getBoundingClientRect().right),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }));
    const tools = {
      layers: Boolean(state.sections[1]?.querySelector(
        "[data-guardrails-tool='layers'],[data-guardrails-tool='layer-explorer'],button",
      )),
      exposure: Boolean(state.sections[2]?.querySelector(
        "[data-guardrails-tool='exposure'],[data-guardrails-tool='stopping-rule'],button",
      )),
    };
    const activeAnimations = document.getAnimations({ subtree: true })
      .filter((animation) => animation.playState === "running" || animation.pending).length;
    return {
      sectionCount: state.groups.length,
      sections: state.groups.map((node) => ({
        marker: node.getAttribute("data-guardrails-section") || node.getAttribute("data-section") || "",
        heading: node.querySelector("h2,h3,h1")?.textContent?.replace(/\\s+/g, " ").trim() || "",
      })),
      bodyWordScope: "article excluding header/nav/footer, hidden nodes, and closed details; selected default panels included",
      visibleBodyWords: words.length,
      visibleBodyText,
      pageFits: document.documentElement.scrollWidth <= innerWidth + 1
        && document.body.scrollWidth <= innerWidth + 1,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: innerWidth,
      outside,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      activeAnimations,
      tools,
      detailsCount: state.article.querySelectorAll("details").length,
      capture: ${JSON.stringify(capture.label)},
    };
  })()`);
  assert.equal(result.error, undefined, `${capture.label}/${viewport.label}: ${result.error || "inspection failed"}`);
  if (capture.label === "after") {
    assert.equal(result.sectionCount, 7, `${capture.label}/${viewport.label}: expected seven groups (header + six sections).`);
  } else {
    assert.ok(result.sectionCount >= 7, `${capture.label}/${viewport.label}: baseline renderer did not expose its groups.`);
  }
  result.failures = [];
  if (!result.pageFits) {
    result.failures.push({
      kind: "horizontal-overflow",
      message: `${capture.label}/${viewport.label}: page has horizontal overflow (${result.documentWidth}/${result.bodyWidth} > ${result.viewportWidth}).`,
      visibleTextOverflow: result.outside,
    });
  }
  if (result.outside.length) {
    result.failures.push({
      kind: "visible-content-overflow",
      message: `${capture.label}/${viewport.label}: visible text leaves its viewport.`,
      visibleTextOverflow: result.outside,
    });
  }
  assert.equal(result.reducedMotion, true, `${capture.label}/${viewport.label}: reduced-motion emulation is not active.`);
  assert.equal(result.activeAnimations, 0, `${capture.label}/${viewport.label}: motion is still running under reduced motion.`);
  assert.ok(result.visibleBodyWords > 0, `${capture.label}/${viewport.label}: default-visible body has no words.`);
  assert.ok(result.tools.layers && result.tools.exposure, `${capture.label}/${viewport.label}: required tools are missing.`);
  return result;
}

async function captureViewport(viewport, capture, { writeScreenshots = true } = {}) {
  await navigate(viewport, capture);
  const inspection = await inspectViewport(viewport, capture);
  const sections = await sectionList();
  if (!writeScreenshots) return { inspection, sections };
  await evaluate("scrollTo(0, 0); true");
  await screenshot(`guardrails-redesign-${capture.label}-${viewport.label}-fullpage`);
  await writeFile(
    new URL(`guardrails-redesign-${capture.label}-${viewport.label}-sections.json`, outputDirectory),
    `${JSON.stringify(sections, null, 2)}\n`,
  );
  for (const section of sections) {
    const clip = await sectionClip(section.index);
    assert.ok(clip?.height > 0, `${capture.label}/${viewport.label}: section ${section.index + 1} has no bounds.`);
    await screenshot(
      `guardrails-redesign-${capture.label}-${viewport.label}-section-${String(section.index + 1).padStart(2, "0")}-${fileSlug(section.label)}`,
      clip,
    );
  }
  const toolNames = [
    ["layers", 2],
    ["exposure", 3],
  ];
  for (const [tool, sectionIndex] of toolNames) {
    const clip = await sectionClip(sectionIndex);
    if (clip) await screenshot(`guardrails-redesign-${capture.label}-${viewport.label}-tool-${tool}`, clip);
  }
  return { inspection, sections };
}

function toolExpression(kind) {
  const sectionIndex = kind === "layers" ? 1 : 2;
  const explicit = kind === "layers"
    ? "[data-guardrails-tool='layers'],[data-guardrails-tool='layer-explorer']"
    : "[data-guardrails-tool='exposure'],[data-guardrails-tool='stopping-rule']";
  return `(() => {
    const state = ${pageRootExpression};
    const section = state?.sections[${sectionIndex}];
    return section?.querySelector(${JSON.stringify(explicit)}) || section || null;
  })()`;
}

function controlsExpression(kind) {
  const explicit = kind === "layers"
    ? "[id^='layer-tab-'],[data-guardrails-layer],[data-guardrails-layer-tab],[role='tab']"
    : "[id^='exposure-tab-'],[data-guardrails-band],[data-guardrails-exposure],[data-guardrails-exposure-tab],[role='tab']";
  return `(() => {
    const tool = ${toolExpression(kind)};
    if (!tool) return [];
    const explicit = [...tool.querySelectorAll(${JSON.stringify(explicit)})]
      .filter((node) => node.matches("button,[role='button'],[role='tab']"));
    return explicit.length ? explicit : [...tool.querySelectorAll("button,[role='button'],[role='tab']")];
  })()`;
}

async function controlInfo(kind) {
  return evaluate(`(() => (${controlsExpression(kind)}).map((node) => ({
    text: (node.innerText || node.textContent || "").replace(/\\s+/g, " ").trim(),
    id: node.id || "",
    pressed: node.getAttribute("aria-pressed"),
    controls: node.getAttribute("aria-controls") || "",
    visible: node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden",
  })))()`);
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

async function clickExpression(expression) {
  const point = await pointFor(expression);
  assert.ok(point, "Required Guardrails interaction control is missing.");
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1,
  });
  await sleep(80);
}

async function touchExpression(expression) {
  const point = await pointFor(expression);
  assert.ok(point, "Required Guardrails touch control is missing.");
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y, radiusX: 1, radiusY: 1, force: 1, id: 1 }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(80);
}

async function pressKey(key, code, keyCode) {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode,
  });
  await sleep(80);
}

async function selectedMapping(kind) {
  return evaluate(`(() => {
    const tool = ${toolExpression(kind)};
    const controls = ${controlsExpression(kind)};
    const selected = controls.findIndex((node) => node.getAttribute("aria-pressed") === "true");
    const selectedNode = controls[selected];
    const target = selectedNode?.getAttribute("aria-controls")
      ? document.getElementById(selectedNode.getAttribute("aria-controls"))
      : tool?.querySelector("[data-guardrails-live-summary],[role='region']");
    const visible = (node) => Boolean(node && node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
    return {
      selected,
      selectedCount: controls.filter((node) => node.getAttribute("aria-pressed") === "true").length,
      controlText: selectedNode?.innerText?.replace(/\\s+/g, " ").trim() || "",
      mappingText: target?.innerText?.replace(/\\s+/g, " ").trim() || "",
      targetId: target?.id || "",
      targetVisible: visible(target),
    };
  })()`);
}

async function assertToolInteractions(kind, viewport, mode) {
  const info = await controlInfo(kind);
  const expected = kind === "exposure" ? 5 : 4;
  assert.equal(info.length, expected, `${mode}/${viewport.label}: ${kind} tool must expose ${expected} independent controls.`);
  assert.ok(info.every((item) => item.visible), `${mode}/${viewport.label}: ${kind} controls must be visible.`);
  assert.equal(new Set(info.map((item) => item.text)).size, info.length, `${mode}/${viewport.label}: ${kind} labels are not independent.`);

  const mappings = [];
  for (let index = 0; index < info.length; index += 1) {
    await clickExpression(`(${controlsExpression(kind)})[${index}]`);
    const mapping = await selectedMapping(kind);
    assert.equal(mapping.selected, index, `${mode}/${viewport.label}: ${kind} control ${index + 1} did not select itself.`);
    assert.equal(mapping.selectedCount, 1, `${mode}/${viewport.label}: ${kind} has more than one selected control.`);
    assert.ok(mapping.mappingText, `${mode}/${viewport.label}: ${kind} control ${index + 1} has no visible mapping.`);
    assert.equal(mapping.targetVisible, true, `${mode}/${viewport.label}: ${kind} mapping panel is not visible.`);
    mappings.push({
      control: info[index].text,
      selectedIndex: mapping.selected,
      targetId: mapping.targetId,
      mapping: mapping.mappingText,
    });
  }

  await evaluate(`(${controlsExpression(kind)})[0]?.focus(); true`);
  await pressKey("ArrowRight", "ArrowRight", 39);
  const arrow = await selectedMapping(kind);
  assert.equal(arrow.selected, 1, `${mode}/${viewport.label}: ${kind} ArrowRight did not select the next control.`);
  await pressKey("Home", "Home", 36);
  const home = await selectedMapping(kind);
  assert.equal(home.selected, 0, `${mode}/${viewport.label}: ${kind} Home did not select the first control.`);
  await pressKey("End", "End", 35);
  const end = await selectedMapping(kind);
  assert.equal(end.selected, info.length - 1, `${mode}/${viewport.label}: ${kind} End did not select the last control.`);

  if (viewport.mobile) {
    await touchExpression(`(${controlsExpression(kind)})[0]`);
    const touched = await selectedMapping(kind);
    assert.equal(touched.selected, 0, `${mode}/${viewport.label}: ${kind} touch did not select the first control.`);
    assert.equal(touched.selectedCount, 1, `${mode}/${viewport.label}: ${kind} touch selected more than one control.`);
  }
  return { count: info.length, mappings, keyboard: { arrow, home, end } };
}

async function assertMobileThreshold(viewport, mode) {
  if (!viewport.mobile) return null;
  const result = await evaluate(`(() => {
    const state = ${pageRootExpression};
    const tool = state?.sections[1];
    const visible = (node) => node.getClientRects().length > 0
      && getComputedStyle(node).visibility !== "hidden"
      && getComputedStyle(node).display !== "none";
    const marker = [...(tool?.querySelectorAll("[data-guardrails-threshold],*") || [])]
      .find((node) => visible(node) && /threshold|ceiling|boundary|above this line|below it|dividing line/i.test(node.textContent || ""));
    return { found: Boolean(marker), text: marker?.textContent?.replace(/\\s+/g, " ").trim() || "" };
  })()`);
  assert.equal(result.found, true, `${mode}/${viewport.label}: threshold marker is not visible on mobile.`);
  return result;
}

async function assertTargetedMobileThreshold(viewport, mode) {
  if (!viewport.mobile) return null;
  const result = await evaluate(`(() => {
    const state = ${pageRootExpression};
    const marker = state?.sections[1]?.querySelector("[data-guardrails-threshold]");
    const visible = Boolean(
      marker?.getClientRects().length
      && getComputedStyle(marker).visibility !== "hidden"
      && getComputedStyle(marker).display !== "none",
    );
    return { found: Boolean(marker), visible, text: marker?.textContent?.replace(/\\s+/g, " ").trim() || "" };
  })()`);
  assert.equal(result.found, true, `${mode}/${viewport.label}: current threshold data selector is missing.`);
  assert.equal(result.visible, true, `${mode}/${viewport.label}: current threshold marker is not visible.`);
  return result;
}

async function assertPrint(viewport, mode) {
  await send("Emulation.setEmulatedMedia", { media: "print" });
  try {
    // Chromium's headless print emulation does not consistently dispatch
    // beforeprint from Page.printToPDF. Dispatch the same browser lifecycle
    // event a real print preview uses so Disclosure can expand its contents.
    await evaluate("window.dispatchEvent(new Event('beforeprint')); true");
    await delay(50);
    const pdf = await send("Page.printToPDF", {
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
    });
    await writeFile(
      new URL(`guardrails-redesign-${mode}-${viewport.label}-print.pdf`, outputDirectory),
      Buffer.from(pdf.data, "base64"),
    );
    const result = await evaluate(`(() => {
      const state = ${pageRootExpression};
      const details = [...(state?.article.querySelectorAll("details") || [])];
      const visible = (node) => Boolean(
        node && node.getClientRects().length
        && getComputedStyle(node).display !== "none"
        && getComputedStyle(node).visibility !== "hidden",
      );
      const expansions = details.map((detail) => ({
        open: detail.open,
        text: detail.querySelector(":scope > div")?.innerText?.replace(/\\s+/g, " ").trim() || "",
        visible: visible(detail.querySelector(":scope > div")),
      }));
      return {
        print: matchMedia("print").matches,
        pageFits: document.documentElement.scrollWidth <= innerWidth + 1
          && document.body.scrollWidth <= innerWidth + 1,
        details: expansions,
      };
    })()`);
    assert.equal(result.print, true, `${mode}/${viewport.label}: print emulation was not enabled.`);
    assert.equal(result.pageFits, true, `${mode}/${viewport.label}: print layout overflows.`);
    assert.ok(result.details.length > 0, `${mode}/${viewport.label}: supporting details are missing.`);
    assert.ok(
      result.details.every((detail) => detail.open && detail.visible && detail.text),
      `${mode}/${viewport.label}: print did not expand readable supporting details: ${JSON.stringify(result.details)}`,
    );
    return result;
  } finally {
    await send("Emulation.setEmulatedMedia", {
      media: "screen",
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
  }
}

async function assertInteractions(viewport, mode) {
  const layers = await assertToolInteractions("layers", viewport, mode);
  const exposure = await assertToolInteractions("exposure", viewport, mode);
  const threshold = await assertMobileThreshold(viewport, mode);
  return { layers, exposure, threshold };
}

const viewports = [
  { label: "390", width: 390, height: 844, mobile: true },
  { label: "768", width: 768, height: 1024, mobile: false },
  { label: "1440", width: 1440, height: 1000, mobile: false },
];
const captures = [];
if (targetedFinal && !baselineUrl && !baselineStaticHtml) {
  throw new Error("Targeted final follow-up requires --baseline-snapshot-json for the before word-count comparison.");
}
if (baselineUrl) {
  captures.push({ label: "before", url: baselineUrl, renderer: "git HEAD baseline URL supplied by runner" });
} else if (baselineStaticHtml) {
  captures.push({
    label: "before",
    staticHtml: baselineStaticHtml,
    renderer: "git HEAD GuardrailsFramework.tsx rendered through a temporary SSR entry",
  });
}
captures.push({
  label: "after",
  url: fixtureMode ? fixtureRoute : previewPath,
  renderer: fixtureMode ? "working-tree renderer with synthetic fixture" : "working-tree renderer with authentic preview",
});

const evidence = {
  task: "336 Guardrails redesign",
  runKind: targetedFinal ? "targeted-final-follow-up" : "full",
  scopeNote: targetedFinal
    ? "This follow-up refreshes screenshots, default-visible words, tablet overflow, threshold selector, and mobile print only; the original interaction checks are preserved in guardrails-redesign-evidence-initial.json."
    : null,
  deliveryMode: fixtureMode ? "fixture" : "authentic",
  fixture: fixtureMode,
  syntheticInterception: fixtureMode
    ? {
        previewPath: fixtureEndpoint,
        mediaPath: fixtureMediaPath,
        rule: "Only the synthetic preview JSON and synthetic hero-media URL are fulfilled by this harness.",
      }
    : null,
  authenticPreview: !fixtureMode,
  hero: fixtureMode
    ? {
        source: "local bytes supplied to explicit fixture mode",
        sha256: heroDigest,
        mimeType: heroMimeType,
        bytes: heroBytes.length,
      }
    : {
        source: "authorized preview delivery",
        note: "The capability URL and delivered media URL are intentionally not written to evidence.",
      },
  rendererSource,
  beforeEvidence: baselineUrl
    ? { status: "browser-captured", renderer: "git HEAD baseline URL supplied by runner" }
    : baselineStaticHtml
      ? {
          status: "browser-captured",
          renderer: "git HEAD GuardrailsFramework.tsx rendered through a temporary SSR entry",
          note: "Baseline uses the supplied old snapshot without hero media; no app source was modified.",
        }
    : {
        status: "not-browser-captured",
        reason: "No --baseline-url or --baseline-snapshot-json was supplied; source capture and older images are retained for context only.",
        olderBeforeScreenshots,
      },
  wordCount: {
    scope: "Same DOM scope for every capture: article text excluding header/nav/footer, hidden nodes, and closed details; selected default panels included.",
    before: {},
    after: {},
    targetAfterRange: [1300, 1500],
    warnings: [],
  },
  failures: [],
  viewports: {},
  fixtureRequestCount: 0,
  fixtureMediaRequestCount: 0,
};
if (targetedFinal && priorEvidence) {
  evidence.priorRun = {
    evidenceFile: "guardrails-redesign-evidence-initial.json",
    completed: priorEvidence.completed,
    passed: priorEvidence.passed,
    failures: priorEvidence.failures,
    wordCount: priorEvidence.wordCount,
  };
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  // Authentic mode deliberately never enables Fetch. Fixture mode uses narrow
  // URL patterns and the handler above refuses every other pathname.
  if (fixtureMode) {
    await send("Fetch.enable", {
      patterns: [
        { urlPattern: `*${fixtureEndpoint}`, requestStage: "Request" },
        { urlPattern: `*${fixtureMediaPath}`, requestStage: "Request" },
      ],
    });
  }
  await send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  if (baselineStaticHtml) {
    // Prime the temporary SSR baseline with the exact runtime stylesheet from
    // the current site. This preserves the renderer comparison without
    // copying or editing application CSS.
    await navigate({ label: "style-prime", width: 1440, height: 1000, mobile: false }, {
      label: "style-prime",
      url: fixtureRoute,
      renderer: "stylesheet prime only",
    });
    runtimeStylesheet = await collectRuntimeStylesheet();
  }

  for (const capture of captures) {
    for (const viewport of viewports) {
      const captured = await captureViewport(viewport, capture, {
        writeScreenshots: !targetedFinal || capture.label === "after",
      });
      evidence.viewports[`${capture.label}-${viewport.label}`] = {
        sections: captured.sections,
        inspection: captured.inspection,
      };
      for (const failure of captured.inspection.failures || []) {
        evidence.failures.push({
          capture: capture.label,
          viewport: viewport.label,
          ...failure,
        });
      }
      evidence.wordCount[capture.label][viewport.label] = {
        words: captured.inspection.visibleBodyWords,
        scope: captured.inspection.bodyWordScope,
      };
      if (capture.label === "after") {
        await navigate(viewport, capture);
        if (targetedFinal) {
          assert.deepEqual(
            captured.inspection.failures,
            [],
            `${capture.label}/${viewport.label}: final follow-up still found layout overflow.`,
          );
          if (viewport.mobile) {
            evidence.viewports[`${capture.label}-${viewport.label}`].threshold =
              await assertTargetedMobileThreshold(viewport, capture.label);
          }
        } else {
          try {
            const interactions = await assertInteractions(viewport, capture.label);
            evidence.viewports[`${capture.label}-${viewport.label}`].interactions = interactions;
          } catch (error) {
            evidence.failures.push({
              capture: capture.label,
              viewport: viewport.label,
              kind: "interaction",
              message: error instanceof Error ? error.message : String(error),
            });
          }
          if (viewport.mobile) {
            try {
              evidence.viewports[`${capture.label}-${viewport.label}`].print = await assertPrint(viewport, capture.label);
            } catch (error) {
              evidence.failures.push({
                capture: capture.label,
                viewport: viewport.label,
                kind: "print",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
        if (targetedFinal && viewport.mobile) {
          try {
            evidence.viewports[`${capture.label}-${viewport.label}`].print = await assertPrint(viewport, capture.label);
          } catch (error) {
            evidence.failures.push({
              capture: capture.label,
              viewport: viewport.label,
              kind: "print",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }
  }

  if (baselineUrl || baselineStaticHtml) {
    for (const viewport of viewports) {
      const before = evidence.wordCount.before[viewport.label]?.words;
      const after = evidence.wordCount.after[viewport.label]?.words;
      assert.equal(typeof before, "number", `before/${viewport.label}: DOM word count was not captured.`);
      assert.equal(typeof after, "number", `after/${viewport.label}: DOM word count was not captured.`);
      evidence.wordCount.before[viewport.label].afterDelta = after - before;
      if (targetedFinal) {
        assert.equal(before, 2882, `before/${viewport.label}: expected the retained baseline count to remain 2882.`);
        if (after < 1150) {
          evidence.failures.push({
            capture: "after",
            viewport: viewport.label,
            kind: "default-visible-word-count",
            message: `after/${viewport.label}: default-visible body is ${after} words, below the 1150-word minimum.`,
          });
        } else if (after < 1300 || after > 1500) {
          evidence.wordCount.warnings.push(
            `after/${viewport.label}: ${after} words is outside the 1300–1500 target range.`,
          );
        }
      }
    }
  }

  if (fixtureMode) {
    assert.ok(fixtureRequestCount >= captures.length * viewports.length, "Fixture preview request was not intercepted.");
    assert.ok(fixtureMediaRequestCount >= 1, "Synthetic hero media was not fulfilled.");
    assert.ok(
      interceptedPaths.every((path) => path === fixtureEndpoint || path === fixtureMediaPath),
      `Unexpected intercepted fixture path: ${interceptedPaths.join(", ")}`,
    );
    evidence.interceptedPaths = [...new Set(interceptedPaths)];
  } else {
    assert.equal(fixtureRequestCount, 0, "Authentic mode unexpectedly intercepted a fixture request.");
  }
  assert.equal(browserError, undefined, `Browser error: ${browserError?.message}`);
  evidence.fixtureRequestCount = fixtureRequestCount;
  evidence.fixtureMediaRequestCount = fixtureMediaRequestCount;
  evidence.passed = evidence.failures.length === 0;
  evidence.completed = true;
  await writeFile(new URL("guardrails-redesign-evidence.json", outputDirectory), `${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.passed) {
    console.log(`Guardrails redesign browser evidence harness passed (${evidence.deliveryMode}).`);
  } else {
    console.error(`Guardrails redesign browser evidence completed with ${evidence.failures.length} recorded UI issue(s).`);
  }
} finally {
  if (previewWaiter) {
    clearTimeout(previewWaiter.timer);
    previewWaiter.reject(new Error("Browser test ended."));
  }
  socket.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, sleep(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
  if (baselineTempPath) await rm(baselineTempPath, { recursive: true, force: true }).catch(() => {});
}