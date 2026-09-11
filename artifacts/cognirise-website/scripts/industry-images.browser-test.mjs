import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9338;
const profilePath = `/tmp/cognirise-industry-images-browser-test-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const requestedRoutes = new Set(
  (process.env.PULSE_INDUSTRY_IMAGES_ROUTES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const routes = [
  { slug: "overview", path: "/industries", selector: ".home-industry-visual img", expected: 6 },
  { slug: "financial-services", path: "/industries/financial-services", selector: ".ind-image img", expected: 1 },
  { slug: "telecoms", path: "/industries/telecoms", selector: ".ind-image img", expected: 1 },
  { slug: "travel-hospitality", path: "/industries/travel-hospitality", selector: ".ind-image img", expected: 1 },
  { slug: "energy-resources", path: "/industries/energy-resources", selector: ".ind-image img", expected: 1 },
  { slug: "public-sector", path: "/industries/public-sector", selector: ".ind-image img", expected: 1 },
  { slug: "education", path: "/industries/education", selector: ".ind-image img", expected: 1 },
];
const viewports = [
  { label: "desktop-1366", width: 1366, height: 768, mobile: false },
  { label: "desktop-1440", width: 1440, height: 900, mobile: false },
  { label: "mobile", width: 390, height: 844, mobile: true },
];

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

async function inspectRoute(route, viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  await send("Page.navigate", { url: `${baseUrl}${route.path}?market=uae` });

  const selector = JSON.stringify(route.selector);
  const expectedImages = route.expected;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await evaluate(
      `document.readyState === "complete" && document.querySelectorAll(${selector}).length === ${expectedImages}`,
    );
    if (ready) break;
    if (attempt === 99) {
      const state = await evaluate(`({
        href: location.href,
        readyState: document.readyState,
        images: document.querySelectorAll(${selector}).length,
        picker: Boolean(document.querySelector(".home-industry-disclosure")),
        industryItems: document.querySelectorAll(".home-industry-item").length,
        body: document.body?.innerText?.slice(0, 240),
      })`);
      throw new Error(`[${viewport.label}] ${route.slug}: hero images did not render (${JSON.stringify(state)})`);
    }
    await delay(100);
  }

  const images = await evaluate(`(async () => {
    const elements = [...document.querySelectorAll(${selector})].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    await Promise.all(elements.map(async (image) => {
      if (!image.complete) {
        await new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }
      try { await image.decode(); } catch {}
    }));
    await Promise.all(elements.flatMap((image) =>
      image.getAnimations({ subtree: false }).map((animation) => animation.finished.catch(() => {}))
    ));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return elements.map((image) => {
      const crop = image.parentElement;
      const imageRect = image.getBoundingClientRect();
      const cropRect = crop.getBoundingClientRect();
      const cropStyle = getComputedStyle(crop);
      const exceedsCrop = imageRect.left < cropRect.left - 1
        || imageRect.top < cropRect.top - 1
        || imageRect.right > cropRect.right + 1
        || imageRect.bottom > cropRect.bottom + 1;
      const clipsOverflow = ["hidden", "clip"].includes(cropStyle.overflowX)
        && ["hidden", "clip"].includes(cropStyle.overflowY);
      return {
        src: image.currentSrc || image.src,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: imageRect.width,
        renderedHeight: imageRect.height,
        cropWidth: cropRect.width,
        cropHeight: cropRect.height,
        underfill: imageRect.left > cropRect.left + 1
          || imageRect.top > cropRect.top + 1
          || imageRect.right < cropRect.right - 1
          || imageRect.bottom < cropRect.bottom - 1,
        visibleOverflow: exceedsCrop && !clipsOverflow,
      };
    });
  })()`);

  assert.equal(images.length, route.visibleExpected ?? expectedImages, `[${viewport.label}] ${route.slug}: expected visible images`);
  for (const image of images) {
    const context = `[${viewport.label}] ${route.slug} (${image.src})`;
    const url = new URL(image.src);
    assert.match(
      url.pathname,
      /^\/api\/public\/media\/[^/]+\/[^/]+$/,
      `${context}: source is not revision-pinned public media`,
    );
    assert.equal(image.complete, true, `${context}: image did not complete loading`);
    assert.ok(image.naturalWidth > 0 && image.naturalHeight > 0, `${context}: decoded image has zero natural dimensions`);
    assert.ok(image.renderedWidth > 0 && image.renderedHeight > 0, `${context}: image has zero rendered dimensions`);
    assert.ok(image.cropWidth > 0 && image.cropHeight > 0, `${context}: crop has zero dimensions`);
    assert.equal(image.underfill, false, `${context}: image does not cover its crop`);
    assert.equal(image.visibleOverflow, false, `${context}: image visibly overflows its crop`);
  }
}

async function inspectOverviewPickerSizing(viewport) {
  if (viewport.width < 1200) return;

  const placePickerBelowHeader = async () => {
    await evaluate(`(() => {
      const picker = document.querySelector(".home-industry-disclosure");
      if (!picker) return false;
      window.scrollTo(0, picker.getBoundingClientRect().top + window.scrollY - 82);
      return true;
    })()`);
    await delay(100);
  };
  const readLayout = () => evaluate(`(() => {
    const picker = document.querySelector(".home-industry-disclosure");
    const heading = picker?.querySelector(".border-t");
    const grid = picker?.querySelector(".home-industry-grid");
    const cards = [...(picker?.querySelectorAll(".home-industry-item") || [])];
    const headingRect = heading?.getBoundingClientRect();
    const gridRect = grid?.getBoundingClientRect();
    return {
      compact: picker?.classList.contains("home-industry-disclosure--compact"),
      cards: cards.length,
      headingTop: headingRect?.top ?? -1,
      gridBottom: gridRect?.bottom ?? -1,
      fitsBelowHeader: Boolean(headingRect && gridRect && headingRect.top >= 81 && gridRect.bottom <= innerHeight + 1),
    };
  })()`);
  const readActivePanel = () => evaluate(`(() => {
    const picker = document.querySelector(".home-industry-disclosure");
    const active = picker?.querySelector(".home-industry-item.active");
    const cardRect = active?.getBoundingClientRect();
    const content = active?.querySelector(".home-industry-panel-content");
    const link = active?.querySelector(".home-industry-link");
    const contentRect = content?.getBoundingClientRect();
    const linkRect = link?.getBoundingClientRect();
    const insideCard = (rect) => Boolean(
      rect
      && cardRect
      && rect.left >= cardRect.left - 1
      && rect.right <= cardRect.right + 1
      && rect.top >= cardRect.top - 1
      && rect.bottom <= cardRect.bottom + 1
    );
    return {
      active: active ? [...(picker?.querySelectorAll(".home-industry-item") || [])].indexOf(active) : -1,
      contentInsideCard: insideCard(contentRect),
      linkInsideCard: insideCard(linkRect),
      contentHeight: contentRect?.height ?? 0,
      linkHeight: linkRect?.height ?? 0,
      cardRect: cardRect && ({ top: cardRect.top, bottom: cardRect.bottom, height: cardRect.height }),
      contentRect: contentRect && ({ top: contentRect.top, bottom: contentRect.bottom, height: contentRect.height }),
      linkRect: linkRect && ({ top: linkRect.top, bottom: linkRect.bottom, height: linkRect.height }),
      rows: active ? getComputedStyle(active).gridTemplateRows : null,
    };
  })()`);

  await placePickerBelowHeader();
  const defaultLayout = await readLayout();
  assert.equal(defaultLayout.compact, true, `[${viewport.label}] overview picker must use compact layout`);
  const expectedPickerCards = 6;
  assert.equal(defaultLayout.cards, expectedPickerCards, `[${viewport.label}] overview picker must render ${expectedPickerCards} cards`);
  assert.equal(defaultLayout.fitsBelowHeader, true, `[${viewport.label}] default overview picker exceeds the viewport below the header`);

  const expandedLayout = await readLayout();
  assert.equal(expandedLayout.fitsBelowHeader, true, `[${viewport.label}] expanded overview picker exceeds the viewport below the header`);
  const triggers = await evaluate(`document.querySelectorAll(".home-industry-item .home-industry-trigger").length`);
  assert.equal(triggers, expectedPickerCards, `[${viewport.label}] overview picker must expose ${expectedPickerCards} focusable triggers`);
  for (let index = 0; index < triggers; index += 1) {
    await evaluate(`(() => {
      const trigger = document.querySelectorAll(".home-industry-item .home-industry-trigger")[${index}];
      trigger?.focus();
      trigger?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    })()`);
    await delay(700);
    await placePickerBelowHeader();
    const activePanel = await readActivePanel();
    assert.equal(activePanel.active, index, `[${viewport.label}] trigger ${index + 1} did not settle active`);
    assert.equal(activePanel.contentInsideCard, true, `[${viewport.label}] trigger ${index + 1} clips panel content`);
    assert.equal(activePanel.linkInsideCard, true, `[${viewport.label}] trigger ${index + 1} clips panel link`);
    assert.ok(activePanel.contentHeight > 0 && activePanel.linkHeight > 0, `[${viewport.label}] trigger ${index + 1} has empty panel content`);
  }
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  for (const viewport of viewports) {
    for (const route of routes.filter((candidate) => !requestedRoutes.size || requestedRoutes.has(candidate.slug))) {
      await inspectRoute(route, viewport);
      if (route.slug === "overview") await inspectOverviewPickerSizing(viewport);
    }
  }
  console.log("Industry overview and detail images passed revision, decode, reveal and crop checks at desktop and mobile widths.");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await delay(250);
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}