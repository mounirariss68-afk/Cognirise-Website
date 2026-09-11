import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9337;
const profilePath = `/tmp/cognirise-case-rail-browser-test-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const navigationPolicy = {
  mode: "configured-legacy",
  pendingRequestIds: new Set(),
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
    const request = message.params;
    if (request.request.url.includes("/api/public/navigation")) {
      void fulfillNavigationPolicy(request);
    } else {
      void send("Fetch.continueRequest", { requestId: request.requestId });
    }
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

const compiledNavigationItems = [
  { id: "what-we-do", label: "What we do", parentId: null, order: 0, destination: "/", visible: true },
  { id: "methodologies", label: "How we do it", parentId: null, order: 1, destination: "/methodologies", visible: true },
  { id: "platforms", label: "Platforms", parentId: null, order: 2, destination: "/platforms", visible: true },
  { id: "industries", label: "Industries", parentId: null, order: 3, destination: "/industries", visible: true },
  { id: "insights", label: "Insights", parentId: null, order: 4, destination: "/insights", visible: true },
  { id: "about", label: "About", parentId: null, order: 5, destination: "/about", visible: true },
];

function navigationPolicyBody() {
  if (navigationPolicy.mode === "fallback") {
    return {
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
  }

  return {
    items: ["configured-legacy", "legacy-disabled"].includes(navigationPolicy.mode)
      ? [
        ...compiledNavigationItems,
        { id: "work", label: "Work", parentId: null, order: 6, destination: "/work", visible: true },
      ]
      : compiledNavigationItems,
    pages: navigationPolicy.mode === "legacy-disabled"
      ? [{ path: "/work", enabled: false }, { path: "/work/", enabled: false }]
      : [],
    requestedMarket: "uae",
    requestedLocale: "en",
    market: "uae",
    locale: "en",
    usedFallback: false,
    isConfigured: true,
    updatedAt: "2026-09-06T00:00:00.000Z",
  };
}

async function fulfillNavigationPolicy(request) {
  if (navigationPolicy.mode === "pending") {
    navigationPolicy.pendingRequestIds.add(request.requestId);
    return;
  }

  if (navigationPolicy.mode === "failed") {
    await send("Fetch.fulfillRequest", {
      requestId: request.requestId,
      responseCode: 503,
      responsePhrase: "Service Unavailable",
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(JSON.stringify({ error: "browser regression: navigation policy unavailable" })).toString("base64"),
    });
    return;
  }

  await send("Fetch.fulfillRequest", {
    requestId: request.requestId,
    responseCode: 200,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(navigationPolicyBody())).toString("base64"),
  });
}

async function releasePendingNavigationRequests() {
  const requestIds = [...navigationPolicy.pendingRequestIds];
  navigationPolicy.pendingRequestIds.clear();
  await Promise.all(requestIds.map(async (requestId) => {
    try {
      await send("Fetch.failRequest", { requestId, errorReason: "Aborted" });
    } catch {
      // Page navigation may already have cancelled a paused request.
    }
  }));
}

async function waitForLocation(pathname, timeout = 7000) {
  const attempts = Math.ceil(timeout / 100);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(`location.pathname === ${JSON.stringify(pathname)}`)) return;
    await delay(100);
  }
  throw new Error(`Expected browser location to become ${pathname}; got ${await evaluate("location.href")}`);
}

async function navigate(url, pathname = new URL(url).pathname) {
  await send("Page.navigate", { url });
  await waitForLocation(pathname);
}

async function assertRetiredWorkRedirects() {
  for (const mode of ["legacy-disabled", "failed", "pending"]) {
    navigationPolicy.mode = mode;
    await releasePendingNavigationRequests();
    for (const source of ["/work", "/work/"]) {
      const query = "market=uae&redirect-check=task-296";
      await navigate(`${baseUrl}${source}?${query}#old-overview-anchor`, "/industries");
      const destination = await evaluate(`({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      })`);
      assert.deepEqual(destination, {
        pathname: "/industries",
        search: `?${query}`,
        hash: "",
      }, `[${mode}] retired Work route did not preserve its query while dropping the old overview anchor`);
    }
  }
  await releasePendingNavigationRequests();
}

async function assertNavigationOmitsWork(mode, viewport) {
  navigationPolicy.mode = mode;
  await releasePendingNavigationRequests();
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  await navigate(`${baseUrl}/industries?market=uae&navigation-check=${mode}-${viewport.label}`);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await evaluate(`document.readyState === "complete"
      && Boolean(document.querySelector("footer"))
      && document.querySelectorAll("header nav a").length >= 6`);
    if (ready) break;
    if (attempt === 59) throw new Error(`[${mode}/${viewport.label}] navigation did not become ready`);
    await delay(100);
  }

  if (viewport.mobile) {
    await evaluate(`document.querySelector('button[aria-label="Open menu"]')?.click(); true`);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await evaluate(`Boolean(document.querySelector('button[aria-label="Close menu"]'))`)) break;
      await delay(50);
    }
  }

  const links = await evaluate(`(() => {
    const exactOverviewLinks = [...document.querySelectorAll('a[href="/work"], a[href="/work/"]')];
    return {
      exactOverviewLinks: exactOverviewLinks.map((link) => ({
        text: link.textContent?.trim(),
        inHeader: Boolean(link.closest("header")),
        inFooter: Boolean(link.closest("footer")),
      })),
      desktopNavigationLinks: [...document.querySelectorAll("header nav a")].map((link) => link.textContent?.trim()),
      footerLinks: [...document.querySelectorAll("footer a")].map((link) => link.textContent?.trim()),
      mobileMenuOpen: Boolean(document.querySelector('button[aria-label="Close menu"]')),
    };
  })()`);
  assert.deepEqual(links.exactOverviewLinks, [], `[${mode}/${viewport.label}] Work overview link remains in the rendered navigation`);
  assert.equal(links.footerLinks.some((label) => label?.toLowerCase() === "work"), false, `[${mode}/${viewport.label}] footer still exposes Work`);
  if (viewport.mobile) assert.equal(links.mobileMenuOpen, true, `[${mode}/mobile] mobile navigation did not open`);
}

const stateExpression = `(() => {
  const slides = [...document.querySelectorAll(".industry-case-rail__slide")];
  const previous = document.querySelector('button[aria-label="Previous slide"]');
  const next = document.querySelector('button[aria-label="Next slide"]');
  return {
    first: slides[0]?.getBoundingClientRect().left,
    second: slides[1]?.getBoundingClientRect().left,
    previousDisabled: previous?.disabled,
    nextDisabled: next?.disabled,
    scrollY,
  };
})()`;

async function dispatchWheel({ deltaX = 0, deltaY = 0, shiftKey = false }) {
  return evaluate(`(() => {
    const target = document.querySelector(".case-rendition img");
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: ${deltaX},
      deltaY: ${deltaY},
      shiftKey: ${shiftKey},
    });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  })()`);
}

async function clickUntilDisabled(label) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const clicked = await evaluate(`(() => {
      const button = document.querySelector('button[aria-label="${label}"]');
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`);
    if (!clicked) return;
    await delay(450);
  }
  throw new Error(`${label} did not reach a disabled endpoint`);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", {
    patterns: [{
      urlPattern: "*api/public/navigation*",
      requestStage: "Request",
    }],
  });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await assertRetiredWorkRedirects();
  for (const mode of ["configured-legacy", "fallback"]) {
    await assertNavigationOmitsWork(mode, { label: "desktop", width: 1440, height: 1000, mobile: false });
    await assertNavigationOmitsWork(mode, { label: "mobile", width: 390, height: 844, mobile: true });
  }

  navigationPolicy.mode = "configured-legacy";
  await releasePendingNavigationRequests();
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", {
    url: `${baseUrl}/industries/financial-services?market=uae#selected-work`,
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.querySelectorAll(".industry-case-rail__slide").length > 1`)) break;
    await delay(100);
  }
  await evaluate(`document.documentElement.style.scrollBehavior = "auto"; document.querySelector(".industry-case-rail").scrollIntoView({ block: "center" })`);
  await delay(600);

  const start = await evaluate(stateExpression);
  assert.equal(start.previousDisabled, true);
  assert.equal(start.nextDisabled, false);

  const collapsedCard = await evaluate(`(() => {
    const card = document.querySelector(".work-card--editorial");
    const figure = card.querySelector(".case-rendition");
    const image = figure.querySelector("img");
    const toggle = card.querySelector('button[data-testid^="button-toggle-case-"]');
    const cardRect = card.getBoundingClientRect();
    const figureRect = figure.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    return {
      cardHeight: cardRect.height,
      viewportHeight: innerHeight,
      imageContained: imageRect.left >= figureRect.left - 1 && imageRect.right <= figureRect.right + 1,
      expanded: toggle.getAttribute("aria-expanded"),
      controls: toggle.getAttribute("aria-controls"),
      detailsPresent: Boolean(card.querySelector(".work-card__details")),
      dialogPresent: Boolean(document.querySelector('[role="dialog"]')),
      repetitiveFooterPresent: Boolean(card.querySelector(".work-card__footer")),
      railHeight: document.querySelector(".industry-case-rail").getBoundingClientRect().height,
      cardHeights: [...document.querySelectorAll(".work-card--editorial")].slice(0, 3).map((item) => item.getBoundingClientRect().height),
      fullyVisibleCards: [...document.querySelectorAll(".industry-case-rail__slide")].filter((slide) => {
        const rect = slide.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= innerWidth + 1;
      }).length,
    };
  })()`);
  assert.ok(collapsedCard.cardHeight < collapsedCard.viewportHeight * 0.72);
  assert.ok(collapsedCard.railHeight <= collapsedCard.viewportHeight);
  assert.equal(collapsedCard.fullyVisibleCards, 3);
  assert.equal(collapsedCard.imageContained, true);
  assert.equal(collapsedCard.expanded, "false");
  assert.ok(collapsedCard.controls?.startsWith("case-details-"));
  assert.equal(collapsedCard.detailsPresent, false);
  assert.equal(collapsedCard.dialogPresent, false);
  assert.equal(collapsedCard.repetitiveFooterPresent, false);
  const industryAffordances = await evaluate(`(() => {
    const cards = [...document.querySelectorAll(".work-card--editorial")];
    return {
      cardCount: cards.length,
      fullRecordLinks: cards.flatMap((card) => [...card.querySelectorAll('a[href^="/work/"]')]).length,
      openRecordControls: cards.flatMap((card) => [...card.querySelectorAll('[data-testid^="button-open-case-"]')]).length,
      inlineToggles: cards.flatMap((card) => [...card.querySelectorAll('[data-testid^="button-toggle-case-"]')]).length,
    };
  })()`);
  if (industryAffordances.fullRecordLinks === 0 && industryAffordances.openRecordControls === 0) {
    console.warn("Pre-existing industry behavior: case cards expose inline expansion only; no full-record link or drawer affordance is present.");
  }

  await evaluate(`document.querySelector(".work-card--editorial button[data-testid^='button-toggle-case-']").click()`);
  await delay(100);
  const expandedCard = await evaluate(`(() => {
    const card = document.querySelector(".work-card--editorial");
    const toggle = card.querySelector('button[data-testid^="button-toggle-case-"]');
    const details = card.querySelector(".work-card__details");
    const figureRect = card.querySelector(".case-rendition").getBoundingClientRect();
    const imageRect = card.querySelector(".case-rendition img").getBoundingClientRect();
    return {
      expanded: toggle.getAttribute("aria-expanded"),
      detailsId: details?.id,
      detailSections: details?.querySelectorAll(":scope > section").length,
      detailsBeforeVisual: Boolean(details && details.compareDocumentPosition(card.querySelector(".work-card__visual")) & Node.DOCUMENT_POSITION_FOLLOWING),
      cardHeights: [...document.querySelectorAll(".work-card--editorial")].slice(0, 3).map((item) => item.getBoundingClientRect().height),
      imageContained: imageRect.left >= figureRect.left - 1 && imageRect.right <= figureRect.right + 1,
      dialogPresent: Boolean(document.querySelector('[role="dialog"]')),
    };
  })()`);
  assert.equal(expandedCard.expanded, "true");
  assert.equal(expandedCard.detailsId, collapsedCard.controls);
  assert.equal(expandedCard.detailSections, 4);
  assert.equal(expandedCard.detailsBeforeVisual, true);
  assert.ok(expandedCard.cardHeights[0] > collapsedCard.cardHeights[0]);
  assert.ok(Math.abs(expandedCard.cardHeights[1] - collapsedCard.cardHeights[1]) < 1);
  assert.ok(Math.abs(expandedCard.cardHeights[2] - collapsedCard.cardHeights[2]) < 1);
  assert.equal(expandedCard.imageContained, true);
  assert.equal(expandedCard.dialogPresent, false);
  await evaluate(`document.querySelector(".work-card--editorial button[data-testid^='button-toggle-case-']").click()`);
  await delay(100);
  const collapsedAgain = await evaluate(`(() => {
    const card = document.querySelector(".work-card--editorial");
    const toggle = card.querySelector('button[data-testid^="button-toggle-case-"]');
    return {
      expanded: toggle.getAttribute("aria-expanded"),
      detailsPresent: Boolean(card.querySelector(".work-card__details")),
      dialogPresent: Boolean(document.querySelector('[role="dialog"]')),
    };
  })()`);
  assert.deepEqual(collapsedAgain, {
    expanded: "false",
    detailsPresent: false,
    dialogPresent: false,
  });

  assert.equal(await dispatchWheel({ deltaX: -120 }), true);
  await delay(400);
  assert.equal((await evaluate(stateExpression)).first, start.first);

  assert.equal(await dispatchWheel({ deltaX: 120 }), true);
  await delay(700);
  const second = await evaluate(stateExpression);
  assert.ok(second.first < start.first - 100);
  assert.equal(second.previousDisabled, false);

  await dispatchWheel({ deltaX: -120 });
  await delay(700);
  const returned = await evaluate(stateExpression);
  assert.equal(returned.previousDisabled, true);

  await dispatchWheel({ deltaY: 120, shiftKey: true });
  await delay(700);
  assert.ok((await evaluate(stateExpression)).first < start.first - 100);

  await clickUntilDisabled("Next slide");
  await delay(700);
  const end = await evaluate(stateExpression);
  assert.equal(end.nextDisabled, true);
  await dispatchWheel({ deltaX: 120 });
  await delay(500);
  const endAfterWheel = await evaluate(stateExpression);
  assert.equal(endAfterWheel.nextDisabled, true);
  assert.ok(Math.abs(endAfterWheel.first - end.first) < 2);

  await clickUntilDisabled("Previous slide");
  await delay(700);
  const reset = await evaluate(stateExpression);
  const imageCenter = await evaluate(`(() => {
    const rect = document.querySelector(".case-rendition img").getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: imageCenter.x, y: imageCenter.y });
  await send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: imageCenter.x,
    y: imageCenter.y,
    deltaX: 0,
    deltaY: 400,
  });
  await delay(500);
  const vertical = await evaluate(stateExpression);
  assert.ok(vertical.scrollY > reset.scrollY);
  assert.ok(Math.abs(vertical.first - reset.first) < 2);

  const eligibleFullRecord = await evaluate(`fetch("/api/public/content?kind=case-study&market=uae&locale=en&pageSize=100")
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => {
      const items = payload?.items || [];
      const item = items.find((candidate) => {
        const content = candidate?.content || {};
        return content.variant === "full"
          && content.disclosure !== "restricted"
          && content.publicEvidenceStatus === "approved"
          && content.visibility !== "hidden";
      });
      return item ? {
        slug: item.slug,
        variant: item.content?.variant,
        disclosure: item.content?.disclosure,
        publicEvidenceStatus: item.content?.publicEvidenceStatus,
      } : null;
    })
    .catch(() => null)`);
  if (eligibleFullRecord?.slug) {
    await navigate(`${baseUrl}/work/${encodeURIComponent(eligibleFullRecord.slug)}?market=uae`, `/work/${eligibleFullRecord.slug}`);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(`document.readyState === "complete" && Boolean(document.querySelector(".case-detail"))`)) break;
      if (attempt === 99) throw new Error(`Eligible full record ${eligibleFullRecord.slug} did not render`);
      await delay(100);
    }
    const fullRecord = await evaluate(`({
      title: document.querySelector(".case-detail h1")?.textContent?.trim(),
      story: Boolean(document.querySelector(".case-detail__story")),
      boundedRoute: Boolean(document.querySelector(".case-detail__split")),
      cta: Boolean(document.querySelector('[data-testid="link-case-cta"]')),
    })`);
    assert.ok(fullRecord.title, `Eligible full record ${eligibleFullRecord.slug} has no title`);
    assert.equal(fullRecord.story, true);
    assert.equal(fullRecord.boundedRoute, true);
    assert.equal(fullRecord.cta, true);
  } else {
    console.warn("No eligible published full case-study record was delivered; direct /work/:slug preservation check was skipped.");
  }

  console.log("Case-study inline expansion, image containment, carousel endpoints and native vertical scrolling passed.");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await delay(250);
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}