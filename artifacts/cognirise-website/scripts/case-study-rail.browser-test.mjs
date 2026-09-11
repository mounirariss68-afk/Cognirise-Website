import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const runScope = process.env.PULSE_CASE_STUDY_BROWSER_SCOPE || "full";
const debuggingPort = 9337;
const profilePath = `/tmp/cognirise-case-rail-browser-test-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const navigationPolicy = {
  mode: "configured-legacy",
  pendingRequestIds: new Set(),
};
const imageNetworkRequests = new Set();

if (!["full", "remainder", "layout"].includes(runScope)) {
  throw new Error(`Unsupported PULSE_CASE_STUDY_BROWSER_SCOPE: ${runScope}. Use "full", "remainder", or "layout".`);
}

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
  if (message.method === "Network.requestWillBeSent" && message.params.type === "Image") {
    imageNetworkRequests.add(message.params.request.url);
    return;
  }
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

async function navigate(url, pathname = new URL(url).pathname, timeout = 7000) {
  const before = await evaluate(`({ href: location.href, timeOrigin: performance.timeOrigin })`);
  if (new URL(url).href === before.href && new URL(before.href).pathname === pathname) return;
  await send("Page.navigate", { url });
  const attempts = Math.ceil(timeout / 100);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const current = await evaluate(`({ href: location.href, pathname: location.pathname, timeOrigin: performance.timeOrigin })`);
    const navigationStarted = current.href !== before.href || current.timeOrigin !== before.timeOrigin;
    if (navigationStarted && current.pathname === pathname) return;
    await delay(100);
  }
  throw new Error(`Expected browser location to become ${pathname}; got ${await evaluate("location.href")}`);
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

async function assertLegacyIndustrySelectedWorkRedirects() {
  for (const mode of ["legacy-disabled", "failed", "pending"]) {
    navigationPolicy.mode = mode;
    await releasePendingNavigationRequests();
    for (const source of ["/industries/financial-services", "/industries/banking"]) {
      const query = "market=uae&legacy-selected-work=task-300";
      await navigate(`${baseUrl}${source}?${query}#selected-work`, "/industries");
      const destination = await evaluate(`({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      })`);
      assert.deepEqual(destination, {
        pathname: "/industries",
        search: `?${query}`,
        hash: "#selected-work",
      }, `[${mode}] ${source} did not bypass navigation policy to preserve its selected-work location`);
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
  const slides = [...document.querySelectorAll(".case-study-rail__slide")];
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
    const target = document.querySelector(".case-study-rail .case-rendition img, .case-study-rail [aria-roledescription='carousel']");
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: ${deltaX},
      deltaY: ${deltaY},
      shiftKey: ${shiftKey},
    });
    target.dispatchEvent(event);
  })()`);
}

async function receivedImageRequests(urls, timeout = 2500) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (urls.every((url) => imageNetworkRequests.has(url))) return true;
    await delay(50);
  }
  return urls.every((url) => imageNetworkRequests.has(url));
}

async function clickUntilDisabled(label) {
  const limit = await evaluate(`document.querySelectorAll(".case-study-rail__slide").length + 2`);
  for (let attempt = 0; attempt < limit; attempt += 1) {
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
  await send("Network.enable");
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
  if (runScope === "full") {
    await assertRetiredWorkRedirects();
    await assertLegacyIndustrySelectedWorkRedirects();
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
    for (const source of [
      "/industries/financial-services",
      "/industries/telecoms",
      "/industries/banking",
    ]) {
      const query = "market=uae&legacy-selected-work=task-300";
      await navigate(`${baseUrl}${source}?${query}#selected-work`, "/industries");
      const destination = await evaluate(`({
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      })`);
      assert.deepEqual(destination, {
        pathname: "/industries",
        search: `?${query}`,
        hash: "#selected-work",
      }, `${source} did not preserve its query and selected-work anchor`);
    }
  }

  navigationPolicy.mode = "configured-legacy";
  await releasePendingNavigationRequests();
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  imageNetworkRequests.clear();
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Page.navigate", {
    url: `${baseUrl}/industries?market=uae#selected-work`,
  });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.querySelectorAll(".case-study-rail__slide").length > 1`)) break;
    await delay(100);
  }
  const railReady = await evaluate(`document.querySelectorAll(".case-study-rail__slide").length > 1`);
  assert.equal(railReady, true, "The consolidated case-study rail did not load approved records");
  const [deliveredCaseSlugs, railCaseSlugs] = await Promise.all([
    evaluate(`fetch("/api/public/content?kind=case-study&market=uae&locale=en&pageSize=100")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const seen = new Set();
        return (payload?.items || []).flatMap((candidate) => {
          const content = candidate?.content || {};
          const slug = typeof candidate?.slug === "string" ? candidate.slug.trim() : "";
          const eligible = slug
            && content.disclosure !== "restricted"
            && content.visibility !== "hidden"
            && content.approvedForIndustry !== false
            && content.publicEvidenceStatus === "approved"
            && !seen.has(slug);
          if (eligible) seen.add(slug);
          return eligible ? [slug] : [];
        }).sort();
      })`),
    evaluate(`([...document.querySelectorAll(".case-study-rail .work-card--editorial")]
      .map((card) => card.getAttribute("data-testid")?.replace(/^card-case-/, ""))
      .filter(Boolean)
      .sort())`),
  ]);
  assert.deepEqual(railCaseSlugs, deliveredCaseSlugs, "The consolidated rail did not render every eligible published case exactly once");
  console.log(`Validated ${railCaseSlugs.length} eligible published case studies in the consolidated rail.`);
  const layoutViewports = [
    [1366, 768, 3], [1440, 900, 3], [1920, 1080, 3],
    [1024, 768, 2], [820, 1180, 1], [390, 844, 1],
  ];
  const requestedLayoutWidths = new Set(
    (process.env.PULSE_CASE_STUDY_LAYOUT_WIDTHS || "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value)),
  );
  for (const [width, height, expected] of layoutViewports.filter(([candidate]) =>
    !requestedLayoutWidths.size || requestedLayoutWidths.has(candidate)
  )) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await delay(500);
    await clickUntilDisabled("Previous slide");
    const layout = await evaluate(`(() => {
      const cards = [...document.querySelectorAll(".case-study-rail .work-card--editorial")];
      const bounds = cards.map(card => card.getBoundingClientRect());
      const images = cards.map(card => card.querySelector(".case-rendition img")?.getBoundingClientRect());
      const firstCardHeight = bounds[0]?.height ?? 0;
      const firstImage = images[0];
      return {
        visible: bounds.filter(rect => rect.left >= -1 && rect.right <= innerWidth + 1).length,
        width: bounds[0].width,
        overflow: document.documentElement.scrollWidth > innerWidth,
        equalHeights: bounds.every(rect => Math.abs(rect.height - firstCardHeight) < 1),
        imagesAligned: images.length === cards.length && images.every(rect =>
          rect
          && firstImage
          && Math.abs(rect.top - firstImage.top) < 1
          && Math.abs(rect.bottom - firstImage.bottom) < 1
        ),
        cardBounds: bounds.map(rect => ({ top: rect.top, bottom: rect.bottom, height: rect.height })),
        imageBounds: images.map(rect => rect && ({ top: rect.top, bottom: rect.bottom, height: rect.height })),
        complete: cards.every(card => card.querySelectorAll(".work-card__details section").length === 4),
        readable: cards.every(card => parseFloat(getComputedStyle(card.querySelector(".work-card__details p")).fontSize) >= 13),
        contained: cards.every(card => getComputedStyle(card.querySelector("img")).objectFit === "contain"),
        captionInFlow: cards.every(card => getComputedStyle(card.querySelector("figcaption")).position === "static")
      };
    })()`);
    if (requestedLayoutWidths.size) console.log(`Case geometry ${width}px: ${JSON.stringify({ cardBounds: layout.cardBounds, imageBounds: layout.imageBounds })}`);
    assert.equal(layout.visible, expected, `Expected ${expected} full cards at ${width}px`);
    assert.equal(layout.overflow, false, `Page overflow at ${width}px`);
    assert.equal(layout.equalHeights, true, `Case cards must share one height at ${width}px`);
    assert.equal(layout.imagesAligned, true, `Case images must share top and bottom edges at ${width}px`);
    assert.equal(layout.complete && layout.readable && layout.contained && layout.captionInFlow, true);
    if (width === 1366 || width === 1440) assert.ok(layout.width >= 395 && layout.width <= 430);
    console.log(`Case layout ${width}×${height}: ${layout.visible} full cards, ${layout.width.toFixed(1)}px images.`);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await delay(500);
  await evaluate(`document.documentElement.style.scrollBehavior = "auto"; document.querySelector(".case-study-rail").scrollIntoView({ block: "center" })`);
  await delay(600);

  const start = await evaluate(stateExpression);
  assert.equal(start.previousDisabled, true);
  assert.equal(start.nextDisabled, false);

  const expandedCard = await evaluate(`(() => {
    const card = document.querySelector(".work-card--editorial");
    const figure = card.querySelector(".case-rendition");
    const image = figure.querySelector("img");
    const cardRect = card.getBoundingClientRect();
    const figureRect = figure.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    return {
      cardHeight: cardRect.height,
      viewportHeight: innerHeight,
      imageContained: imageRect.left >= figureRect.left - 1 && imageRect.right <= figureRect.right + 1,
      details: card.querySelector(".work-card__details")?.querySelectorAll(":scope > section").length,
      toggleCount: card.querySelectorAll('[data-testid^="button-toggle-case-"]').length,
      eagerImages: [...document.querySelectorAll(".case-study-rail img")].filter((node) => node.loading === "eager").length,
      dialogPresent: Boolean(document.querySelector('[role="dialog"]')),
      slugs: [...document.querySelectorAll(".work-card--editorial")].map((node) => node.getAttribute("data-testid")),
    };
  })()`);
  assert.ok(expandedCard.cardHeight > expandedCard.viewportHeight * 0.72);
  assert.equal(expandedCard.imageContained, true);
  assert.equal(expandedCard.details, 4);
  assert.equal(expandedCard.toggleCount, 0);
  assert.equal(expandedCard.eagerImages, 0);
  assert.equal(expandedCard.dialogPresent, false);
  assert.equal(new Set(expandedCard.slugs).size, expandedCard.slugs.length);
  const initialMedia = await evaluate(`(() => [...document.querySelectorAll(".case-study-rail [data-case-media]")].map((frame) => {
    const image = frame.querySelector("img");
    return {
      url: new URL(frame.getAttribute("data-case-media"), location.href).href,
      requested: Boolean(image?.getAttribute("src")),
    };
  }))()`);
  const initiallyRequestedMedia = initialMedia.filter((media) => media.requested).map((media) => media.url);
  assert.ok(initialMedia.length > 1, "The rail needs more than one media-backed case to verify lazy delivery");
  assert.ok(initiallyRequestedMedia.length > 0, "No visible case-study image entered the lazy delivery queue");
  assert.ok(initiallyRequestedMedia.length < initialMedia.length, "Every rail image entered the lazy delivery queue before its slide became visible");
  assert.equal(await receivedImageRequests(initiallyRequestedMedia), true, "Visible case-study images did not create image network requests");
  assert.equal(
    initialMedia.filter((media) => !media.requested).some((media) => !imageNetworkRequests.has(media.url)),
    true,
    "Off-screen case-study media made image network requests before becoming visible",
  );

  await dispatchWheel({ deltaX: -120 });
  await delay(400);
  const startAfterWheel = await evaluate(stateExpression);
  assert.equal(startAfterWheel.previousDisabled, true);
  assert.ok(Math.abs(startAfterWheel.first - start.first) < 2);

  await dispatchWheel({ deltaX: 120 });
  await delay(700);
  const second = await evaluate(stateExpression);
  assert.ok(second.first < start.first - 100);
  assert.equal(second.previousDisabled, false);
  const mediaAfterAdvance = await evaluate(`(() => [...document.querySelectorAll(".case-study-rail [data-case-media]")].map((frame) => {
    const image = frame.querySelector("img");
    return {
      url: new URL(frame.getAttribute("data-case-media"), location.href).href,
      requested: Boolean(image?.getAttribute("src")),
    };
  }))()`);
  const newlyVisibleMedia = mediaAfterAdvance
    .filter((media) => media.requested && !initiallyRequestedMedia.includes(media.url))
    .map((media) => media.url);
  assert.ok(newlyVisibleMedia.length > 0, "Advancing the rail did not enqueue newly visible case-study media");
  assert.equal(await receivedImageRequests(newlyVisibleMedia), true, "Newly visible case-study media did not create image network requests");

  await dispatchWheel({ deltaX: -120 });
  await delay(700);
  const returned = await evaluate(stateExpression);
  assert.equal(returned.previousDisabled, true);

  await evaluate(`(() => {
    const carousel = document.querySelector('.case-study-rail [aria-roledescription="carousel"]');
    carousel.focus();
    carousel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
  })()`);
  await delay(700);
  assert.ok((await evaluate(stateExpression)).first < start.first - 100);

  await clickUntilDisabled("Previous slide");
  await delay(700);
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
  // Expanded text can put the image below the viewport; drag an actual visible image.
  await evaluate(`document.querySelector(".case-study-rail .case-rendition, .case-study-rail .case-interface").scrollIntoView({ block: "center", behavior: "instant" })`);
  await delay(300);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`[...document.querySelectorAll(".case-study-rail img")].slice(0,3).every(img => img.complete && img.naturalWidth > 0)`)) break;
    if (attempt === 99) throw new Error("The first three case-study images did not load");
    await delay(100);
  }
  if (process.env.PULSE_CASE_STUDY_SCREENSHOT) {
    const screenshot = await send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
    await writeFile(process.env.PULSE_CASE_STUDY_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  const dragOrigin = await evaluate(`(() => {
    const rect = document.querySelector(".case-study-rail .case-rendition, .case-study-rail .case-interface").getBoundingClientRect();
    return { x: rect.left + Math.min(rect.width * .72, rect.width - 30), y: rect.top + Math.min(rect.height * .45, 180) };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: dragOrigin.x, y: dragOrigin.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: dragOrigin.x, y: dragOrigin.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: dragOrigin.x - 180, y: dragOrigin.y, button: "left", buttons: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: dragOrigin.x - 180, y: dragOrigin.y, button: "left", clickCount: 1 });
  await delay(700);
  assert.ok((await evaluate(stateExpression)).first < reset.first - 100, "Drag did not advance the case-study rail");

  await clickUntilDisabled("Previous slide");
  await delay(700);
  const mobileViewport = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };
  await send("Emulation.setDeviceMetricsOverride", mobileViewport);
  await navigate(`${baseUrl}/industries?market=uae#selected-work`, "/industries");
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.querySelectorAll(".case-study-rail__slide").length > 0`)) break;
    await delay(100);
  }
  const mobileRail = await evaluate(`(() => {
    const rail = document.querySelector(".case-study-rail");
    const first = document.querySelector(".case-study-rail__slide");
    return {
      controls: rail?.querySelectorAll('button[aria-label$="slide"]').length,
      details: first?.querySelectorAll(".work-card__details > section").length,
      touchAction: getComputedStyle(rail?.querySelector('[aria-roledescription="carousel"]')).touchAction,
    };
  })()`);
  assert.equal(mobileRail.controls, 2);
  assert.equal(mobileRail.details, 4);
  assert.match(mobileRail.touchAction, /pan-y/);
  const mobileStart = await evaluate(stateExpression);
  assert.equal(mobileStart.previousDisabled, true);
  await clickUntilDisabled("Next slide");
  await delay(700);
  const mobileEnd = await evaluate(stateExpression);
  assert.equal(mobileEnd.nextDisabled, true);
  assert.ok(mobileEnd.first < mobileStart.first - 100, "Mobile controls did not traverse the rail");
  await clickUntilDisabled("Previous slide");
  await delay(700);
  const mobileReset = await evaluate(stateExpression);
  assert.equal(mobileReset.previousDisabled, true);
  assert.ok(Math.abs(mobileReset.first - mobileStart.first) < 2, "Mobile controls did not return to the first case");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await delay(500);
  await evaluate(`document.querySelector(".case-study-rail .case-rendition img, .case-study-rail .case-interface").scrollIntoView({ block: "center", behavior: "instant" })`);
  await delay(300);
  const verticalStart = await evaluate(stateExpression);
  const imageCenter = await evaluate(`(() => {
    const rect = document.querySelector(".case-study-rail .case-rendition img, .case-study-rail .case-interface").getBoundingClientRect();
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
  assert.ok(vertical.scrollY > verticalStart.scrollY);
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

  console.log("Consolidated case-study details, redirects, lazy media, carousel controls, keyboard, drag, mobile and native vertical scrolling passed.");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await delay(250);
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}