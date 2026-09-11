import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9339;
const profilePath = `/tmp/cognirise-case-full-record-browser-test-${process.pid}`;
const fullSlug = "task-296-full-record-fixture";
const summarySlug = "task-296-summary-fixture";
const restrictedSlug = "task-296-restricted-fixture";
const storyText = "Fixture story remains available through the preserved full-record route.";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let activeFixtureSlug = fullSlug;

const fixtureContent = {
  schemaVersion: 1,
  variant: "full",
  disclosure: "anonymized",
  sector: "Professional Services",
  organizationDescriptor: "Task 296 fixture organization",
  engagementType: "client-delivery",
  deliveryStage: "production",
  impactClassification: "observed",
  impactStatement: "The fixture preserves a complete public-safe delivery record.",
  disclosureNote: "This record exists only inside the browser regression fixture.",
  publicEvidenceStatus: "approved",
  relatedIndustries: ["financial-services"],
  visual: {
    kind: "illustrative-interface-reconstruction",
    caption: "Fixture workflow → Reviewed → Released.",
    altText: "A fixture workflow reconstruction for the full-record browser check.",
    textEquivalent: "The fixture workflow moves through a review checkpoint to a released capability.",
    template: "workflow-console",
    fixtureLabels: ["Fixture workflow", "Reviewed", "Released"],
  },
  mandate: "Preserve a valid full case-study record after retiring the Work overview.",
  context: "The browser test supplies a valid published full record without changing CMS state.",
  constraints: ["This record is isolated to the browser test."],
  work: [
    { type: "heading", level: 2, text: "The fixture route" },
    { type: "paragraph", text: storyText },
  ],
  controls: ["Human review remains required for consequential actions."],
  outcomes: ["The full record remains directly addressable by its stable slug."],
  evidence: [{
    statement: "The full-record fixture passed its publication gates.",
    source: { label: "Task 296 browser fixture", url: "https://example.com/task-296-fixture", accessedAt: "2026-09-06" },
    approved: true,
  }],
  cta: { label: "Discuss a similar mandate", href: "/value-scan" },
  visibility: "public",
  order: 0,
  sources: [{ label: "Task 296 browser fixture", url: "https://example.com/task-296-fixture", accessedAt: "2026-09-06" }],
  verificationDate: "2026-09-06",
  reviewDate: "2027-03-06",
  relatedIds: [],
};

function publishedItem(slug, title, content) {
  return {
    id: `task-296-${slug}`,
    kind: "case-study",
    slug,
    title,
    summary: content.impactStatement,
    content,
    seo: { title, description: content.impactStatement, noIndex: false },
    media: [],
    market: "uae",
    locale: "en",
    requestedMarket: "uae",
    usedFallback: false,
    revision: 1,
    publishedAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z",
  };
}

const summaryContent = {
  ...fixtureContent,
  variant: "summary",
  work: [],
};
const restrictedContent = {
  ...fixtureContent,
  disclosure: "restricted",
};
function contentBodyFor(slug) {
  const item = slug === fullSlug
    ? publishedItem(fullSlug, "Task 296 Full Record Fixture", fixtureContent)
    : slug === summarySlug
      ? publishedItem(summarySlug, "Task 296 Summary Fixture", summaryContent)
      : publishedItem(restrictedSlug, "Task 296 Restricted Fixture", restrictedContent);
  return {
    page: 1,
    pageSize: 100,
    total: 1,
    totalPages: 1,
    items: [item],
    market: "uae",
    locale: "en",
    requestedMarket: "uae",
    usedFallback: false,
    isConfigured: true,
    configuredPagePaths: [],
  };
}
const navigationBody = {
  items: [],
  pages: [],
  requestedMarket: "uae",
  requestedLocale: "en",
  market: "uae",
  locale: "en",
  usedFallback: false,
  isConfigured: false,
  updatedAt: null,
};

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
  if (message.method === "Fetch.requestPaused") {
    void fulfillRequest(message.params);
    return;
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

async function fulfillRequest(request) {
  const url = request.request.url;
  const body = url.includes("/api/public/navigation")
    ? navigationBody
    : url.includes("/api/public/content") && url.includes("kind=case-study")
      ? contentBodyFor(activeFixtureSlug)
      : null;
  if (!body) {
    await send("Fetch.continueRequest", { requestId: request.requestId });
    return;
  }
  await send("Fetch.fulfillRequest", {
    requestId: request.requestId,
    responseCode: 200,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
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

async function waitFor(expression, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  const diagnostic = await evaluate(`(async () => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body.innerText.slice(0, 300),
    caseDetail: Boolean(document.querySelector(".case-detail")),
    story: Boolean(document.querySelector(".case-detail__story")),
  }))()`);
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(diagnostic)}`);
}

async function navigate(slug) {
  const path = `/work/${slug}`;
  activeFixtureSlug = slug;
  await send("Page.navigate", { url: `${baseUrl}${path}?market=uae` });
  await waitFor(`location.pathname === ${JSON.stringify(path)}`, `${path} route`);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", {
    patterns: [
      { urlPattern: "*api/public/navigation*", requestStage: "Request" },
      { urlPattern: "*api/public/content*", requestStage: "Request" },
    ],
  });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await navigate(fullSlug);
  await waitFor(
    `document.readyState === "complete" && Boolean(document.querySelector(".case-detail__story"))`,
    "fixture full-record story",
  );
  const fullRecord = await evaluate(`({
    title: document.querySelector(".case-detail h1")?.textContent?.trim(),
    story: document.querySelector(".case-detail__story")?.textContent?.includes(${JSON.stringify(storyText)}),
    notFound: document.body.innerText.toLowerCase().includes("404 / route not found"),
  })`);
  assert.equal(fullRecord.title, "Task 296 Full Record Fixture");
  assert.equal(fullRecord.story, true);
  assert.equal(fullRecord.notFound, false);

  for (const [slug, label] of [[summarySlug, "summary"], [restrictedSlug, "restricted"]]) {
    await navigate(slug);
    await waitFor(
    `document.readyState === "complete" && document.body.innerText.toLowerCase().includes("404 / route not found")`,
      `${label} record rejection`,
    );
    const unavailable = await evaluate(`({
      route: location.pathname,
      caseDetail: Boolean(document.querySelector(".case-detail")),
    notFound: document.body.innerText.toLowerCase().includes("404 / route not found"),
    })`);
    assert.equal(unavailable.route, `/work/${slug}`);
    assert.equal(unavailable.caseDetail, false);
    assert.equal(unavailable.notFound, true);
  }

  console.log("Fixture-based full-record route passed; summary and restricted fixture routes remained unavailable.");
  console.log("Live CMS full-record availability was not used by this isolated browser check.");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await delay(250);
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}