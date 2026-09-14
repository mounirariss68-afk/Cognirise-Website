import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const fixturePath = process.env.GUARDRAILS_FIXTURE;
const publicPayloadPath = process.env.GUARDRAILS_PUBLIC_PAYLOAD_URL
  || "/api/public/content/uae/en/framework/agent-authority-model";
const previewRoute = "/preview/guardrails-visual-fixture";
const navigationPath = "/api/public/navigation?market=uae&locale=en";
const evidenceDirectory = new URL("../evidence/guardrails/", import.meta.url);
const profilePath = `/tmp/cognirise-guardrails-browser-test-${process.pid}`;
const debugPort = 9346;
const WAIT = 45_000;
const viewports = [
  { label: "390", width: 390, height: 820, mobile: true },
  { label: "820", width: 820, height: 900, mobile: false },
  { label: "1440", width: 1440, height: 1000, mobile: false },
];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const clone = (value) => JSON.parse(JSON.stringify(value));
const normalized = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

async function fetchJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WAIT);
  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    const body = await response.json().catch(() => null);
    assert.equal(response.status, 200, `${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
    assert.ok(body && typeof body === "object" && !Array.isArray(body), `${path} did not return a JSON object.`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

const rawFixture = fixturePath
  ? JSON.parse(await readFile(fixturePath, "utf8"))
  : await fetchJson(publicPayloadPath);
const payload = rawFixture?.payload && typeof rawFixture.payload === "object"
  ? rawFixture.payload
  : rawFixture?.document && typeof rawFixture.document === "object"
    ? rawFixture.document
    : rawFixture;
assert.ok(payload && typeof payload === "object" && !Array.isArray(payload), "Fixture must be a saved cms_revisions.payload object.");
assert.equal(payload.slug, "agent-authority-model", "Fixture payload.slug must be agent-authority-model.");
assert.equal(payload.content?.template, "agent-authority", "Fixture payload.content.template must be agent-authority.");
assert.ok(payload.content && typeof payload.content === "object" && !Array.isArray(payload.content), "Fixture payload.content is required.");
assert.ok(payload.content.guardrails && typeof payload.content.guardrails === "object", "The after fixture must contain content.guardrails.");
assert.equal(payload.content.guardrails.firstFigure?.asset, "aam-guardrails-vs-authority.svg");
assert.equal(payload.content.guardrails.secondFigure?.asset, "aam-how-they-interact.svg");

const afterPayload = clone(payload);
const baselinePayload = clone(payload);
delete baselinePayload.content.guardrails;
assert.equal(Object.hasOwn(baselinePayload.content, "guardrails"), false);

const navigation = await fetchJson(navigationPath);
const fixtureMedia = Array.isArray(rawFixture?.media) ? rawFixture.media : [];
const revisionId = typeof rawFixture?.revisionId === "string" ? rawFixture.revisionId : "guardrails-visual-fixture";
const revisionNumber = Number.isFinite(Number(rawFixture?.revisionNumber)) ? Number(rawFixture.revisionNumber) : 1;
function envelope(document) {
  return {
    kind: "framework",
    document,
    market: "uae",
    locale: "en",
    requestedMarket: "uae",
    requestedLocale: "en",
    revisionId,
    revisionNumber,
    usedFallback: false,
    media: fixtureMedia,
    missingMediaIds: [],
    validationWarnings: [],
    navigation,
  };
}

await rm(profilePath, { recursive: true, force: true });
await mkdir(evidenceDirectory, { recursive: true });
const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--window-size=1440,1000",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profilePath}`,
  "about:blank",
], { stdio: "ignore" });
const browserExited = new Promise((resolve) => browser.once("exit", resolve));
async function debugTarget() {
  const deadline = Date.now() + WAIT;
  while (Date.now() < deadline) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {}
    await sleep(100);
  }
  throw new Error("Chromium did not expose a page target within 45 seconds.");
}

const target = await debugTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
let opened = false;
let fatalError;
let mode = "baseline";
let previewRequestCount = 0;
let previewEndpointSeen;
let previewWaiter;

function rejectPending(error) {
  for (const item of pending.values()) {
    clearTimeout(item.timer);
    item.reject(error);
  }
  pending.clear();
}

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") {
    fatalError = new Error(message.params.exceptionDetails.text || "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    fatalError = new Error(message.params.entry.text);
  }
  if (message.method === "Fetch.requestPaused") {
    void pauseRequest(message.params);
    return;
  }
  if (!message.id || !pending.has(message.id)) return;
  const item = pending.get(message.id);
  pending.delete(message.id);
  clearTimeout(item.timer);
  if (message.error) item.reject(new Error(message.error.message));
  else item.resolve(message.result);
};
socket.onerror = (error) => {
  const failure = new Error(`CDP websocket error: ${String(error)}`);
  if (!opened) fatalError = failure;
  rejectPending(failure);
};
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("CDP websocket did not open within 45 seconds.")), WAIT);
  socket.onopen = () => {
    clearTimeout(timer);
    opened = true;
    resolve();
  };
});

function send(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP ${method} timed out after 45 seconds.`));
    }, WAIT);
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

function responseHeaders(body) {
  return [
    { name: "Content-Type", value: "application/json; charset=utf-8" },
    { name: "Content-Length", value: String(Buffer.byteLength(body)) },
    { name: "Cache-Control", value: "no-store" },
  ];
}
function isPreviewPath(pathname) {
  return /^\/api\/(?:cms\/)?preview\/guardrails-visual-fixture$/.test(pathname);
}
async function pauseRequest(paused) {
  const pathname = new URL(paused.request.url).pathname;
  if (!isPreviewPath(pathname)) {
    await send("Fetch.continueRequest", { requestId: paused.requestId }).catch(() => {});
    return;
  }
  try {
    assert.equal(paused.request.method, "GET", "CmsPreview must fetch the protected preview with GET.");
    previewEndpointSeen = pathname;
    const document = mode === "baseline" ? baselinePayload : afterPayload;
    const body = JSON.stringify(envelope(clone(document)));
    await send("Fetch.fulfillRequest", {
      requestId: paused.requestId,
      responseCode: 200,
      responseHeaders: responseHeaders(body),
      body: Buffer.from(body).toString("base64"),
    });
    previewRequestCount += 1;
    if (previewWaiter?.mode === mode) {
      const waiter = previewWaiter;
      previewWaiter = undefined;
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
  } catch (error) {
    fatalError = error;
    if (previewWaiter) {
      const waiter = previewWaiter;
      previewWaiter = undefined;
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    await send("Fetch.continueRequest", { requestId: paused.requestId }).catch(() => {});
  }
}
function waitForPreview(requestMode) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      previewWaiter = undefined;
      reject(new Error(`CmsPreview request did not arrive within 45 seconds (${requestMode}).`));
    }, WAIT);
    previewWaiter = { mode: requestMode, resolve, reject, timer };
  });
}

const sectionCode = `
  function key(e) {
    const id = e.getAttribute("id");
    if (id) return "id:" + id;
    const h = e.querySelector("h1,h2,h3");
    const t = h?.textContent?.trim().replace(/\\s+/g, " ");
    return t ? "heading:" + t : e.tagName.toLowerCase() + ":" + [...e.parentElement.children].indexOf(e);
  }
`;

async function setViewport(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
}
async function waitForArticle() {
  const deadline = Date.now() + WAIT;
  while (Date.now() < deadline) {
    if (fatalError) throw fatalError;
    const ready = await evaluate(`
      Boolean(
        location.pathname === "/preview/guardrails-visual-fixture" &&
        document.querySelector("article h1") &&
        document.querySelector("#authority-ceiling") &&
        document.querySelector("#assessment")
      )
    `);
    if (ready) return;
    await sleep(100);
  }
  throw new Error("Protected Agent Authority preview did not become ready within 45 seconds.");
}
async function waitForFontsAndLayout() {
  await evaluate(`
    (async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      scrollTo(0, 0);
      return true;
    })()
  `);
}
async function navigate(viewport, nextMode) {
  mode = nextMode;
  await setViewport(viewport);
  await send("Page.navigate", { url: "about:blank" });
  await sleep(50);
  const before = previewRequestCount;
  const request = waitForPreview(nextMode);
  await send("Page.navigate", { url: `${baseUrl}${previewRoute}` });
  await request;
  await waitForArticle();
  await waitForFontsAndLayout();
  assert.equal(previewRequestCount, before + 1, `${nextMode} ${viewport.label}px made an unexpected number of preview requests.`);
}

async function sectionList() {
  return evaluate(`
    (() => {
      ${sectionCode}
      return [...document.querySelectorAll("article>header,article>section")].map((e) => {
        const r = e.getBoundingClientRect();
        const heading = e.querySelector("h1,h2,h3")?.textContent?.trim().replace(/\\s+/g, " ") || "";
        return {
          key: key(e),
          heading,
          top: r.top + scrollY,
          bottom: r.bottom + scrollY,
          height: r.height,
          guardrails: Boolean(e.querySelector("#guardrails-and-authority")),
        };
      });
    })()
  `);
}
async function sectionClip(sectionKey) {
  return evaluate(`
    (() => {
      ${sectionCode}
      const e = [...document.querySelectorAll("article>header,article>section")]
        .find((x) => key(x) === ${JSON.stringify(sectionKey)});
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return {
        x: Math.max(0, r.left + scrollX),
        y: Math.max(0, r.top + scrollY),
        width: Math.ceil(r.width),
        height: Math.ceil(r.height),
        scale: 1,
      };
    })()
  `);
}
function slug(value) {
  return value
    .replace(/^(?:id|heading):/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70) || "section";
}
async function screenshot(name, clip) {
  const params = { format: "png", captureBeyondViewport: true };
  if (clip) params.clip = clip;
  else {
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
  await writeFile(new URL(`${name}.png`, evidenceDirectory), Buffer.from(image.data, "base64"));
}

const canonicalColumns = [
  ["E1", "R1–R2 and H1", "Internal, reversible", "Out of the loop"],
  ["E2", "R3, or H2", "One person is affected", "On the loop, with a stated intervention window"],
  ["E3", "R4, or H3", "A regulator can see it", "In the loop"],
  ["E4", "H4", "Public reach", "In the loop + independent second control"],
  ["E5", "H5", "Safety, health, or essential service", "In the loop + external safety sign-off"],
];
const canonicalActivities = [
  ["Answer a clinic question", "Knowledge · R1 / H1", "out of the loop"],
  ["Book an appointment", "Action · R2 / H2", "on the loop"],
  ["Cancel an appointment", "Action · R3 / H2 · defined intervention window", "on the loop"],
  ["Issue a refund", "Action · R4 / H3", "in the loop"],
];

async function inspect(viewport, enlarged = false) {
  const result = await evaluate(`
    (() => {
      const section = document.querySelector("#guardrails-and-authority")?.closest("section");
      const anchor = document.querySelector("#guardrails-and-authority");
      const comparison = section?.querySelector("[data-guardrails-comparison]");
      const figures = [...(section?.querySelectorAll("figure") || [])];
      const interaction = figures.find((figure) => figure !== comparison);
      const plot = interaction?.querySelector('[aria-label^="Authority plot"]');
      const region = interaction?.querySelector('[role="region"][tabindex="0"]');
      const table = section?.querySelector("table");
      const rows = [...(table?.querySelectorAll("tbody tr") || [])];
      const sectionRect = section?.getBoundingClientRect();
      const visible = (node) => {
        if (!node || node.closest(".sr-only")) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const textNodes = [...(section?.querySelectorAll("h2,h3,p,th,td,figcaption") || [])]
        .filter(visible);
      const textOverflow = textNodes
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const inPlot = region?.contains(node);
          return (
            !inPlot &&
            (rect.left < (sectionRect?.left ?? 0) - 1 ||
              rect.right > (sectionRect?.right ?? innerWidth) + 1 ||
              node.scrollWidth > node.clientWidth + 2)
          );
        })
        .map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 140) }));
      const guardrailsOverflow = [...(section?.querySelectorAll("*") || [])]
        .filter((node) => visible(node) && node !== region && !region?.contains(node) && node.scrollWidth > node.clientWidth + 2)
        .map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 100) }));
      const nonChartContent = [
        ...(interaction?.querySelectorAll('section[aria-label], [aria-label="Interaction chart legend"], figcaption') || []),
      ].filter((node) => visible(node) && !region?.contains(node));
      const nonChartOverflow = nonChartContent
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            label: node.getAttribute("aria-label") || node.tagName,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
            inViewport: rect.left >= -1 && rect.right <= innerWidth + 1,
            overflow: node.scrollWidth > node.clientWidth + 2,
          };
        });
      const panels = comparison?.firstElementChild
        ? [...comparison.firstElementChild.children]
        : [];
      const panelActivities = panels.map((panel) => [...panel.querySelectorAll("ol li")].map((item) => ({
        name: item.querySelector("strong")?.textContent?.trim() || "",
        spans: [...item.querySelectorAll("span")].map((span) => span.textContent?.trim() || ""),
      })));
      const nativeLabels = [
        "Front-Desk Agent",
        "Answer a clinic question",
        "Book an appointment",
        "Cancel an appointment",
        "Issue a refund",
        "E1",
        "E2",
        "E3",
        "E4",
        "E5",
        "Permitted",
        "Promotion",
        "Compensation",
      ].map((label) => {
        const node = [...(section?.querySelectorAll("*") || [])]
          .find((candidate) => candidate.textContent?.trim() === label);
        return {
          label,
          found: Boolean(node),
          userSelect: node ? getComputedStyle(node).userSelect : "",
        };
      });
      const imagesOrDrawings = [...(section?.querySelectorAll("img,svg,canvas") || [])]
        .map((node) => node.tagName.toLowerCase());
      const guardrailsText = section?.textContent?.replace(/\\s+/g, " ").trim() || "";
      const comparisonHeadings = [...(section?.querySelectorAll("h2,h3") || [])]
        .map((heading) => ({ tag: heading.tagName, text: heading.textContent?.trim() || "" }));
      const scrollState = region
        ? { scrollLeft: region.scrollLeft, scrollWidth: region.scrollWidth, clientWidth: region.clientWidth, tabIndex: region.tabIndex }
        : null;
      return {
        guardrails: Boolean(section),
        headingTag: anchor?.tagName || "",
        headingId: anchor?.id || "",
        anchorCount: document.querySelectorAll("#guardrails-and-authority").length,
        comparisonHeadings,
        figures: figures.map((figure) => ({
          ariaLabel: figure.getAttribute("aria-label") || "",
          textLength: figure.textContent?.trim().length || 0,
          hasLegacyDrawing: Boolean(figure.querySelector("img,svg,canvas")),
          userSelect: getComputedStyle(figure).userSelect,
        })),
        imagesOrDrawings,
        nativeLabels,
        panelActivities,
        table: table && {
          width: table.getBoundingClientRect().width,
          scrollWidth: table.scrollWidth,
          clientWidth: table.clientWidth,
          head: getComputedStyle(table.querySelector("thead")).display,
          rows: rows.map((row) => getComputedStyle(row).display),
          text: table.textContent?.replace(/\\s+/g, " ").trim() || "",
        },
        chart: interaction && {
          text: interaction.textContent?.replace(/\\s+/g, " ").trim() || "",
          plot: plot && {
            width: plot.getBoundingClientRect().width,
            height: plot.getBoundingClientRect().height,
            scrollWidth: plot.scrollWidth,
            clientWidth: plot.clientWidth,
          },
          region: scrollState,
        },
        guardrailsText,
        textOverflow,
        guardrailsOverflow,
        nonChartOverflow,
        sectionBounds: sectionRect && { left: sectionRect.left, right: sectionRect.right, width: sectionRect.width },
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        enlarged: ${JSON.stringify(enlarged)},
      };
    })()
  `);

  assert.ok(
    result.documentWidth <= result.viewportWidth + 1 && result.bodyWidth <= result.viewportWidth + 1,
    `${viewport.label}px${enlarged ? " at 200% text" : ""}: page has horizontal overflow.`,
  );
  if (!result.guardrails) return result;

  const g = afterPayload.content.guardrails;
  assert.equal(result.headingTag, "H2", `${viewport.label}px: guardrails anchor must be an h2.`);
  assert.equal(result.headingId, "guardrails-and-authority", `${viewport.label}px: guardrails h2 anchor changed.`);
  for (const heading of [g.comparisonHeading, g.unit.heading, g.interaction.heading, g.designRule.heading]) {
    assert.ok(
      result.comparisonHeadings.some((candidate) => candidate.tag === "H3" && candidate.text === heading),
      `${viewport.label}px: missing native h3 heading ${heading}.`,
    );
  }
  assert.equal(result.figures.length, 2, `${viewport.label}px: expected two native guardrails figures.`);
  assert.deepEqual(
    result.figures.map((figure) => figure.hasLegacyDrawing),
    [false, false],
    `${viewport.label}px: guardrails figures must not contain img, svg, or canvas.`,
  );
  assert.deepEqual(
    result.figures.map((figure) => normalized(figure.ariaLabel)),
    [normalized(g.firstFigure.altText), normalized(g.secondFigure.altText)],
    `${viewport.label}px: governed figure accessible descriptions changed.`,
  );
  assert.deepEqual(result.imagesOrDrawings, [], `${viewport.label}px: guardrails section contains a legacy drawing.`);
  assert.deepEqual(result.textOverflow, [], `${viewport.label}px: guardrails text overflows or is clipped.`);
  assert.deepEqual(result.guardrailsOverflow, [], `${viewport.label}px: only the interaction plot may scroll internally.`);
  assert.ok(
    result.nonChartOverflow.every((item) => item.inViewport && !item.overflow),
    `${viewport.label}px: chart annotations, legend, or caption leave the viewport.`,
  );
  assert.ok(
    result.figures.every((figure) => figure.textLength > 100 && figure.userSelect !== "none"),
    `${viewport.label}px: native figure text is missing or not selectable.`,
  );
  for (const label of result.nativeLabels) {
    assert.equal(label.found, true, `${viewport.label}px: missing selectable native label ${label.label}.`);
    assert.notEqual(label.userSelect, "none", `${viewport.label}px: native label ${label.label} is not selectable.`);
  }

  assert.equal(result.panelActivities.length, 2, `${viewport.label}px: comparison figure does not have two panels.`);
  const panelNames = result.panelActivities.map((panel) => panel.map((activity) => activity.name));
  assert.deepEqual(panelNames[0], canonicalActivities.map(([name]) => name), `${viewport.label}px: common-pattern activity order changed.`);
  assert.deepEqual(panelNames[1], canonicalActivities.map(([name]) => name), `${viewport.label}px: authority-model activity order changed.`);
  for (const [index, [, profile, oversight]] of canonicalActivities.entries()) {
    const authoritySpans = result.panelActivities[1][index].spans.join(" ");
    assert.ok(authoritySpans.includes(profile), `${viewport.label}px: missing canonical profile ${profile}.`);
    assert.ok(authoritySpans.includes(oversight), `${viewport.label}px: missing canonical oversight ${oversight}.`);
    assert.ok(result.panelActivities[0][index].spans.join(" ").includes("same authority"), `${viewport.label}px: common guardrail authority changed.`);
  }
  assert.ok(
    result.panelActivities[0][3].spans.join(" ").includes("Warning"),
    `${viewport.label}px: refund warning is not expressed as native text.`,
  );
  assert.ok(result.table, `${viewport.label}px: guardrails comparison table is missing.`);
  assert.ok(
    result.table.width <= (result.sectionBounds?.width ?? result.table.width) + 1 &&
      result.table.scrollWidth <= result.table.clientWidth + 1,
    `${viewport.label}px: guardrails comparison table overflows.`,
  );
  assert.ok(result.table.text.includes(g.comparisonColumns.guardrails), `${viewport.label}px: guardrails table label changed.`);
  assert.ok(result.table.text.includes(g.comparisonColumns.authorityModel), `${viewport.label}px: authority table label changed.`);
  assert.equal(result.table.rows.length, 3, `${viewport.label}px: governed comparison rows changed.`);

  const chartText = normalized(result.chart?.text);
  for (const [band, rule, meaning, ceiling] of canonicalColumns) {
    assert.ok(chartText.includes(band), `${viewport.label}px: missing canonical band ${band}.`);
    assert.ok(chartText.includes(rule), `${viewport.label}px: canonical profile ${band} changed.`);
    assert.ok(chartText.includes(meaning), `${viewport.label}px: canonical meaning ${band} changed.`);
    assert.ok(chartText.includes(`Canonical ceiling: ${ceiling}`), `${viewport.label}px: canonical ceiling ${band} changed.`);
  }
  for (const label of ["Permitted", "Promotion", "Compensation", "A better model does not raise the ceiling"]) {
    assert.ok(chartText.includes(label), `${viewport.label}px: missing chart annotation ${label}.`);
  }
  assert.ok(result.chart?.region && result.chart.region.tabIndex === 0, `${viewport.label}px: interaction chart is not keyboard focusable.`);
  assert.ok(
    result.chart?.region && result.chart.region.scrollWidth >= result.chart.region.clientWidth,
    `${viewport.label}px: interaction chart scroll region has invalid bounds.`,
  );
  const governedCopy = [
    g.heading,
    g.opening,
    g.definition,
    g.bankExample.beforeQuote,
    g.bankExample.quote,
    g.bankExample.afterQuote,
    g.comparisonHeading,
    ...g.comparisonRows.flatMap((row) => [row.label, row.guardrails, row.authorityModel]),
    g.unit.heading,
    ...g.unit.paragraphs,
    g.unit.emphasis,
    g.interaction.heading,
    g.interaction.introduction,
    g.interaction.exposure.lead,
    g.interaction.exposure.body,
    g.interaction.evidence.lead,
    g.interaction.evidence.body,
    g.interaction.controlsIntroduction,
    g.interaction.requiredControls.lead,
    g.interaction.requiredControls.bodyBeforeExamples,
    g.interaction.requiredControls.assuranceExample,
    g.interaction.requiredControls.controlExample,
    g.interaction.requiredControls.conclusion,
    g.interaction.compensatingControls.lead,
    g.interaction.compensatingControls.bodyBeforeContent,
    g.interaction.compensatingControls.content,
    g.interaction.compensatingControls.bodyAfterContent,
    g.designRule.heading,
    g.designRule.quote,
    g.designRule.conclusion,
    g.designRule.failure,
    g.designRule.closingEmphasis,
    g.firstFigure.captionLabel,
    g.firstFigure.captionLead,
    g.firstFigure.captionBody,
    g.secondFigure.captionLabel,
    g.secondFigure.captionLead,
    g.secondFigure.captionBody,
  ];
  for (const copy of governedCopy) {
    assert.ok(
      normalized(result.guardrailsText).includes(normalized(copy)),
      `${viewport.label}px: governed guardrails copy is missing: ${copy}`,
    );
  }
  return result;
}

async function hashCheck(viewport) {
  await evaluate(`history.replaceState(history.state, "", location.pathname + location.search); location.hash = "guardrails-and-authority"; true`);
  await sleep(200);
  const result = await evaluate(`
    (() => {
      const r = document.querySelector("#guardrails-and-authority")?.getBoundingClientRect();
      return { hash: location.hash, visible: Boolean(r && r.top < innerHeight && r.bottom > 0) };
    })()
  `);
  assert.equal(result.hash, "#guardrails-and-authority", `${viewport.label}px: hash navigation failed.`);
  assert.equal(result.visible, true, `${viewport.label}px: hash target is not visible.`);
}

async function exerciseKeyboard(viewport) {
  const result = await evaluate(`
    (() => {
      const region = document.querySelector('#guardrails-and-authority')?.closest('section')?.querySelector('[role="region"][tabindex="0"]');
      if (!region) return { found: false };
      region.focus();
      const initial = region.scrollLeft;
      region.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
      const right = region.scrollLeft;
      region.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
      const home = region.scrollLeft;
      region.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
      const end = region.scrollLeft;
      return {
        found: true,
        active: document.activeElement === region,
        initial,
        right,
        home,
        end,
        maximum: Math.max(0, region.scrollWidth - region.clientWidth),
      };
    })()
  `);
  assert.equal(result.found, true, `${viewport.label}px: keyboard interaction chart region is missing.`);
  assert.equal(result.active, true, `${viewport.label}px: chart region did not receive keyboard focus.`);
  if (result.maximum > 1) {
    assert.ok(result.right > result.initial, `${viewport.label}px: ArrowRight did not scroll the plot.`);
    assert.ok(result.home <= 1, `${viewport.label}px: Home did not return the plot to its start.`);
    assert.ok(result.end >= result.maximum - 1, `${viewport.label}px: End did not reach the plot end.`);
  }
  return result;
}

async function doubleTextFonts() {
  return evaluate(`
    (() => {
      const motionStyle = document.createElement("style");
      motionStyle.id = "guardrails-browser-test-no-motion";
      motionStyle.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
      document.head.append(motionStyle);
      for (const node of document.querySelectorAll("body *")) {
        node.style.setProperty("transition", "none", "important");
        node.style.setProperty("animation", "none", "important");
      }
      const nodes = [...document.querySelectorAll("body *")].filter((node) => node.textContent?.trim());
      const before = nodes.map((node) => ({
        tag: node.tagName,
        id: node.id,
        fontSize: Number.parseFloat(getComputedStyle(node).fontSize),
      }));
      for (const [index, node] of nodes.entries()) {
        const size = before[index].fontSize;
        if (Number.isFinite(size) && size > 0) node.style.setProperty("font-size", String(size * 2) + "px", "important");
      }
      const after = nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize));
      const mismatches = before.reduce((count, item, index) => {
        return Math.abs(after[index] - item.fontSize * 2) > 0.02 ? count + 1 : count;
      }, 0);
      return {
        count: before.length,
        before,
        after,
        mismatches,
        transitionsDisabled: [...document.querySelectorAll("body *")].every((node) => {
          const style = getComputedStyle(node);
          return style.transitionDuration === "0s" && style.animationDuration === "0s";
        }),
      };
    })()
  `);
}

const evidence = {
  route: previewRoute,
  previewEndpoint: "CmsPreview protected fetch (Request-stage browser mock)",
  navigationEndpoint: navigationPath,
  fixture: fixturePath || `${baseUrl}${publicPayloadPath}`,
  baselineLabel: "same saved public/draft payload with content.guardrails removed in memory; no CMS/database mutation",
  afterLabel: fixturePath ? "exact saved draft payload from GUARDRAILS_FIXTURE" : "actual published public payload fetched read-only from the public API",
  visualComparison: "browser Fetch interception only; no CMS/database mutation",
  requirements: {
    nativeFigures: "two selectable HTML/CSS figures; no img, svg, or canvas in the guardrails section",
    order: "assessment -> guardrails-and-authority -> Standards provenance -> closing CTA",
    textZoom: "computed text font sizes snapshotted, then doubled with transitions disabled",
    scroll: "only the interaction plot may scroll internally; annotations, legend, and caption stay in viewport",
  },
  viewports: {},
};
const baselineKeys = [];
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*preview/guardrails-visual-fixture*", requestStage: "Request" }] });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      (() => {
        const install = () => {
          const style = document.createElement("style");
          style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}";
          document.head.append(style);
        };
        if (document.head) install();
        else document.addEventListener("DOMContentLoaded", install, { once: true });
      })();
    `,
  });

  for (const viewport of viewports) {
    const before = await (async () => {
      await navigate(viewport, "baseline");
      const inspection = await inspect(viewport);
      await evaluate("scrollTo(0, 0); true");
      await screenshot(`baseline-${viewport.label}-fullpage`);
      const sections = await sectionList();
      for (const section of sections) {
        const clip = await sectionClip(section.key);
        await screenshot(`baseline-${viewport.label}-section-${slug(section.key)}`, clip);
      }
      return { inspection, sections };
    })();
    if (!baselineKeys.length) baselineKeys.push(...before.sections.map((section) => section.key));
    assert.deepEqual(
      before.sections.map((section) => section.key),
      baselineKeys,
      `${viewport.label}px: baseline section order changed between viewports.`,
    );
    assert.equal(before.inspection.guardrails, false, `${viewport.label}px: baseline unexpectedly contains guardrails.`);
    evidence.viewports[viewport.label] = { baselineSections: before.sections };
  }

  for (const viewport of viewports) {
    await navigate(viewport, "after");
    const normalInspection = await inspect(viewport);
    const sections = normalInspection.sections || await sectionList();
    assert.deepEqual(
      sections.filter((section) => baselineKeys.includes(section.key)).map((section) => section.key),
      baselineKeys,
      `${viewport.label}px: full old section set or order changed.`,
    );
    const assessmentIndex = sections.findIndex((section) => section.key === "id:assessment");
    const guardrailsIndex = sections.findIndex((section) => section.guardrails);
    const standardsIndex = sections.findIndex((section) => section.heading.includes("Published practice"));
    const ctaIndex = sections.findIndex((section) => section.heading.includes("Bring one handover"));
    assert.ok(assessmentIndex >= 0, `${viewport.label}px: assessment section is missing.`);
    assert.equal(sections.filter((section) => section.guardrails).length, 1, `${viewport.label}px: guardrails section must appear exactly once.`);
    assert.equal(normalInspection.anchorCount, 1, `${viewport.label}px: guardrails deep-link anchor must appear exactly once.`);
    assert.equal(guardrailsIndex, sections.findIndex((section) => section.key === "heading:" + afterPayload.content.guardrails.heading), `${viewport.label}px: guardrails section appears more than once or has the wrong heading.`);
    assert.ok(assessmentIndex < guardrailsIndex && guardrailsIndex < standardsIndex && standardsIndex < ctaIndex, `${viewport.label}px: required assessment -> guardrails -> Standards -> CTA order changed.`);
    const authorityIndex = sections.findIndex((section) => section.key === "id:authority-ceiling");
    const controlsIndex = sections.findIndex((section) => section.heading.includes("Six answers become a control specification"));
    const workedIndex = sections.findIndex((section) => section.heading.includes("Airline disruption re-accommodation"));
    const contrastsIndex = sections.findIndex((section) => section.heading.includes("Technology does not determine authority"));
    assert.ok(authorityIndex < controlsIndex && controlsIndex < workedIndex && workedIndex < contrastsIndex && contrastsIndex < assessmentIndex, `${viewport.label}px: existing methodology section order changed.`);
    assert.equal(normalInspection.guardrails, true, `${viewport.label}px: exact preview payload did not render guardrails.`);

    await evaluate("scrollTo(0, 0); true");
    await screenshot(`after-${viewport.label}-fullpage`);
    for (const section of sections) {
      const clip = await sectionClip(section.key);
      assert.ok(clip?.height > 0, `${viewport.label}px: section capture has no bounds.`);
      await screenshot(`after-${viewport.label}-section-${slug(section.key)}`, clip);
    }
    await hashCheck(viewport);
    const keyboard = await exerciseKeyboard(viewport);
    await evaluate("scrollTo(0, 0); true");

    const fonts = await doubleTextFonts();
    assert.ok(fonts.count > 0, `${viewport.label}px: no computed text fonts were snapshotted.`);
    assert.equal(fonts.mismatches, 0, `${viewport.label}px: not every computed text font doubled exactly.`);
    assert.equal(fonts.transitionsDisabled, true, `${viewport.label}px: transitions were not disabled for text enlargement.`);
    await sleep(100);
    const enlargedInspection = await inspect(viewport, true);
    await evaluate("scrollTo(0, 0); true");
    await screenshot(`after-${viewport.label}-200-text-fullpage`);
    const enlargedGuardrails = sections.find((section) => section.guardrails);
    const enlargedStandards = sections.find((section) => section.heading.includes("Published practice"));
    for (const section of [enlargedGuardrails, enlargedStandards]) {
      const clip = section ? await sectionClip(section.key) : null;
      assert.ok(clip?.height > 0, `${viewport.label}px at 200% text: closing placement capture has no bounds.`);
      if (clip) await screenshot(`after-${viewport.label}-200-text-section-${slug(section.key)}`, clip);
    }

    evidence.viewports[viewport.label].afterSections = sections;
    evidence.viewports[viewport.label].normalInspection = normalInspection;
    evidence.viewports[viewport.label].keyboard = keyboard;
    evidence.viewports[viewport.label].textZoom = {
      fontSnapshot: fonts,
      inspection: enlargedInspection,
    };
    evidence.viewports[viewport.label].sectionDisplacements = evidence.viewports[viewport.label].baselineSections.map((item) => {
      const current = sections.find((section) => section.key === item.key);
      return {
        key: item.key,
        beforeY: item.top,
        afterY: current?.top ?? null,
        displacement: current ? current.top - item.top : null,
      };
    });
  }

  assert.equal(previewRequestCount, 6, "Expected one intercepted protected preview request per mode and viewport.");
  assert.ok(previewEndpointSeen, "No CmsPreview endpoint was intercepted.");
  assert.deepEqual(fatalError, undefined, `Browser console/runtime error: ${fatalError?.message}`);
  evidence.previewEndpoint = previewEndpointSeen;
  evidence.previewRequestCount = previewRequestCount;
  evidence.consoleErrors = [];
  evidence.fixturePayloadKeys = Object.keys(payload).sort();
  await writeFile(new URL("run.json", evidenceDirectory), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Guardrails native browser validation passed; evidence saved in ${evidenceDirectory.pathname}`);
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
}