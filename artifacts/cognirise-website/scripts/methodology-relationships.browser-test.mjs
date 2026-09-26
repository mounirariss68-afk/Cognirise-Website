import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { resizeText, assertNoClipping, assertFocusedVisible } from "./methodology-text-layout.mjs";
import { assertMethodologyPrint, routeExpectations } from "./methodology-print-check.mjs";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9343;
const profilePath = `/tmp/cognirise-methodology-browser-test-${process.pid}`;

await rm(profilePath, { recursive: true, force: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4",
  "--window-size=1440,1000",
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
      const page = targets.find((candidate) => candidate.type === "page");
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
let filmIntercept = null;
const filmWarnings = [];
const filmResponses = [];

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Network.responseReceived" &&
    message.params.response.url.includes("methodologies-pulse-hero-journey")) {
    filmResponses.push({
      status: message.params.response.status,
      url: message.params.response.url,
    });
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "warning") {
    filmWarnings.push(message.params.args.map(arg => arg.value ?? arg.description).join(" "));
  }
  if (message.method === "Fetch.requestPaused" && filmIntercept) {
    const requestId = message.params.requestId;
    filmIntercept.count += 1;
    if (filmIntercept.mode === "fail") {
      void send("Fetch.failRequest", { requestId, errorReason: "Failed" });
    } else if (filmIntercept.released) {
      void send("Fetch.continueRequest", { requestId });
    } else {
      filmIntercept.paused.push(requestId);
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

async function setViewport(width, height = 1000, mobile = false) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}

async function navigate(pathname, readyExpression) {
  await send("Page.navigate", { url: `${baseUrl}${pathname}` });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(`document.readyState === "complete" && location.pathname === ${JSON.stringify(pathname)} && (${readyExpression})`)) return;
    await delay(100);
  }
  const diagnostics = await evaluate(`({
    href: location.href,
    readyState: document.readyState,
    title: document.title,
    radios: document.querySelectorAll('[role="radiogroup"][aria-label="Starting situation"] [role="radio"]').length,
    body: document.body?.innerText?.slice(0, 300),
  })`);
  throw new Error(`Route did not become ready: ${pathname}\n${JSON.stringify(diagnostics, null, 2)}`);
}

async function pressKey(key, code, keyCode, modifiers = 0) {
  for (const type of ["keyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", {
      type,
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
      modifiers,
    });
  }
  await delay(50);
}

const routeMap = '[data-testid="methodology-route-map"]';
const relationship = '[aria-label="Methodology boundaries and connections"]';
const destinations = ["/methodologies/idao", "/methodologies/agent-authority-model"];

async function assertArtworkHover() {
  await setViewport(1440);
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  const film = await evaluate(`(() => {
    const layer = document.querySelector('[data-testid="methodologies-hero-film"]');
    return {
      present: Boolean(layer),
       poster: layer?.querySelector('video')?.poster,
      storedMarket: localStorage.getItem('cognirise-market'),
      url: location.href,
    };
  })()`);
  assert.equal(film.present, true, `UAE English should mount its film layer: ${JSON.stringify(film)}`);
  const bounds = await evaluate(`(() => {
    const card = document.querySelector('[data-route-index="2"]');
    card.scrollIntoView({ block: "center" });
    const rect = card.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await evaluate(`document.querySelector('[data-route-index="1"]').click()`);
  const selected = await evaluate(`document.querySelector('[data-testid="route-detail-situation"]').textContent.trim()`);
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  });
  await delay(500);
  const hoverDiagnostics = await evaluate(`(() => ({
    fineHover: matchMedia('(hover: hover) and (pointer: fine)').matches,
    hovered: document.querySelector('[data-route-index="2"]').matches(':hover'),
    elementAtPointer: document.elementFromPoint(${bounds.x + bounds.width / 2}, ${bounds.y + bounds.height / 2})?.className,
    scrollY: window.scrollY,
  }))()`);
  assert.equal(hoverDiagnostics.hovered, true, `pointer reaches the card: ${JSON.stringify(hoverDiagnostics)}`);
  assert.ok(await evaluate(`(() => {
    const card = document.querySelector('[data-route-index="2"]');
    const current = card.getBoundingClientRect();
    const text = card.querySelector('.methodology-route-choice-content');
    const art = card.querySelector('.methodology-route-art');
    const textRect = text.getBoundingClientRect();
    const artRect = art.getBoundingClientRect();
    const rail = document.querySelector('.methodology-route-rail').getBoundingClientRect();
    const output = document.querySelector('#selected-route-output').getBoundingClientRect();
    const label = card.querySelector('.methodology-route-choice-label');
    return current.width > ${bounds.width} + 15
      && current.height > ${bounds.height} + 20
      && textRect.right <= artRect.left + 1
      && artRect.width < textRect.width
      && current.right <= rail.right
      && current.right < output.left
      && getComputedStyle(text).backgroundColor === 'rgb(255, 255, 255)'
      && label.scrollHeight <= label.clientHeight + 1;
  })()`), "the whole card grows in width and height; white text stays beside narrower artwork without overlapping details");
  assert.equal(await evaluate(`document.querySelector('[data-testid="route-detail-situation"]').textContent.trim()`),
    "We have an AI strategy and need to implement it.", "hover previews the third route");
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await delay(400);
  assert.equal(await evaluate(`document.querySelector('[data-testid="route-detail-situation"]').textContent.trim()`),
    selected, "leaving the cards restores the last committed route");
  assert.equal(await evaluate(`document.querySelector('[data-route-index="1"]').getAttribute('aria-checked')`),
    "true", "hover does not change the committed selection");
}

async function assertUaeFilmPlayback() {
  await send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  await delay(1200);
  const state = await evaluate(`(() => {
    const layer = document.querySelector('[data-testid="methodologies-hero-film"]');
    const video = layer?.querySelector('video');
    return {
      layer: Boolean(layer),
       poster: video?.poster,
      videoPresent: Boolean(video),
      paused: video?.paused,
      readyState: video?.readyState,
      currentTime: video?.currentTime,
      source: video?.currentSrc,
      diagnostics: window.__filmDiagnostics,
      url: location.href,
      market: document.querySelector('select')?.value,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      figure: Boolean(document.querySelector('[data-testid="hero-figure"]')),
      posterRequests: performance.getEntriesByType('resource').filter(x => x.name.includes('methodologies-pulse-hero-journey')).map(x => ({name:x.name, size:x.transferSize})),
    };
  })()`);
  assert.equal(state.layer, true, `UAE English mounts its route-owned film: ${JSON.stringify({ ...state, filmWarnings })}`);
  assert.match(state.poster, /methodologies-pulse-hero-journey-poster\.jpg$/);
  assert.equal(state.videoPresent, true, "normal-motion visitors receive the video");
  assert.equal(state.paused, false, "the muted inline video starts playing");
  assert.ok(state.readyState >= 2 && state.currentTime > 0.1, "the film decodes and moves beyond its opening frame");
  assert.match(state.source, /methodologies-pulse-hero-journey\.mp4$/);
  assert.ok(filmResponses.some(response => response.status === 206 &&
    /methodologies-pulse-hero-journey\.mp4$/.test(response.url)),
    `the desktop film receives a byte-range response: ${JSON.stringify(filmResponses)}`);
  await assertFilmContinuity("desktop");
  await setViewport(390, 844, true);
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  await waitForFilm(`document.querySelector('[data-testid="methodologies-hero-film"] video')?.currentTime > 0.1`, "mobile film playback");
  assert.match(await evaluate(`document.querySelector('[data-testid="methodologies-hero-film"] video')?.currentSrc`),
    /methodologies-pulse-hero-journey-720\.mp4$/, "mobile loads the compact rendition");
  assert.ok(filmResponses.some(response => response.status === 206 &&
    /methodologies-pulse-hero-journey-720\.mp4$/.test(response.url)),
    `the mobile film receives a byte-range response: ${JSON.stringify(filmResponses)}`);
  await assertFilmContinuity("mobile");
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await setViewport(1440);
  await send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

async function assertFilmContinuity(label) {
  const initial = await evaluate(`(() => {
    const video = document.querySelector('[data-testid="methodologies-hero-film"] video');
    video.dataset.continuityProbe = ${JSON.stringify(label)};
    return { time: video.currentTime, duration: video.duration };
  })()`);
  assert.ok(initial.duration > 30, `${label} receives the full journey, not a one-second clip`);
  for (const checkpoint of [1, 2]) {
    await delay(8000);
    const state = await evaluate(`(() => {
      const video = document.querySelector('[data-testid="methodologies-hero-film"] video');
      return { time: video?.currentTime, paused: video?.paused, error: video?.error?.code,
        marker: video?.dataset.continuityProbe, opacity: video && getComputedStyle(video).opacity,
        events: window.__filmDiagnostics };
    })()`);
    assert.equal(state.marker, label, `${label} keeps the same video element at checkpoint ${checkpoint}`);
    assert.equal(state.paused, false, `${label} continues playing after ${checkpoint * 8} seconds: ${JSON.stringify(state)}`);
    assert.equal(state.error, undefined, `${label} has no media error`);
    assert.equal(state.opacity, "1", `${label} keeps the film visible`);
    assert.ok(state.time > initial.time + checkpoint * 6, `${label} advances steadily after startup: ${JSON.stringify(state)}`);
  }
  const beforePause = await evaluate(`(() => {
    const video = document.querySelector('[data-testid="methodologies-hero-film"] video');
    const current = video.currentTime;
    video.pause();
    return current;
  })()`);
  await waitForFilm(`(() => {
    const video = document.querySelector('[data-testid="methodologies-hero-film"] video');
    return video?.dataset.continuityProbe === ${JSON.stringify(label)} && !video.paused &&
      video.currentTime > ${beforePause};
  })()`, `${label} resumes from the paused position`);
  await evaluate(`document.querySelector('[data-testid="methodologies-hero-film"] video').currentTime =
    document.querySelector('[data-testid="methodologies-hero-film"] video').duration - 1.5`);
  await waitForFilm(`(() => {
    const video = document.querySelector('[data-testid="methodologies-hero-film"] video');
    return video?.dataset.continuityProbe === ${JSON.stringify(label)} && !video.paused &&
      video.currentTime < 1.2 && video.currentTime > 0.05;
  })()`, `${label} loops back into motion`, 150);
}

async function assertEmbeddedFilmPlayback() {
  await setViewport(1440);
  await send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  await evaluate(`(() => {
    const preview = document.createElement("iframe");
    preview.id = "film-embedded-preview";
    preview.allow = "autoplay";
    preview.src = "/methodologies";
    document.body.append(preview);
  })()`);
  const getEmbeddedTime = `document.querySelector('#film-embedded-preview')?.contentDocument
    ?.querySelector('[data-testid="methodologies-hero-film"] video')?.currentTime`;
  await waitForFilm(`${getEmbeddedTime} > 0.2`, "embedded preview film starts");
  const start = await evaluate(getEmbeddedTime);
  await delay(16000);
  const state = await evaluate(`(() => {
    const video = document.querySelector('#film-embedded-preview')?.contentDocument
      ?.querySelector('[data-testid="methodologies-hero-film"] video');
    return { time: video?.currentTime, paused: video?.paused, error: video?.error?.code };
  })()`);
  assert.equal(state.paused, false, `embedded preview remains playing: ${JSON.stringify(state)}`);
  assert.equal(state.error, undefined);
  assert.ok(state.time > start + 14, `embedded preview progresses beyond the first second: ${JSON.stringify(state)}`);
  await evaluate(`document.querySelector('#film-embedded-preview').remove()`);
}

async function waitForFilm(expression, description, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  const diagnostics = await evaluate(`(() => {
    const layer = document.querySelector('[data-testid="methodologies-hero-film"]');
    const video = layer?.querySelector('video');
    return { layer: !!layer, poster: layer?.querySelector('img')?.naturalWidth,
      video: !!video, error: video?.error?.code, networkState: video?.networkState,
      readyState: video?.readyState, currentSrc: video?.currentSrc, currentTime: video?.currentTime,
      events: window.__filmDiagnostics };
  })()`);
  const navigation = await evaluate(`({
    href: location.href, ready: document.readyState, routeCount: document.querySelectorAll('[data-route-index]').length,
    market: document.querySelector('select')?.value
  })`);
  throw new Error(`Timed out waiting for ${description}: ${JSON.stringify({ diagnostics, navigation, filmWarnings, filmIntercept })}`);
}

async function assertDelayedFilmAndFallback() {
  await send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  const patterns = [
    { urlPattern: "*methodologies-pulse-hero-journey.mp4*", requestStage: "Request" },
    { urlPattern: "*methodologies-pulse-hero-journey-720.mp4*", requestStage: "Request" },
    { urlPattern: "*methodologies-pulse-hero-journey.webm*", requestStage: "Request" },
  ];
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  filmIntercept = { mode: "delay", count: 0, paused: [], released: false };
  await send("Fetch.enable", { patterns });
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  for (let i = 0; filmIntercept.count < 1 && i < 80; i += 1) await delay(100);
  assert.ok(filmIntercept.count > 0, "delayed test intercepted the film");
  await waitForFilm(`Boolean(document.querySelector('[data-testid="methodologies-hero-film"] video')?.poster)`, "film poster");
  // The guarded version removed the film after eight seconds even though the
  // server had not returned video bytes. Hold its requests longer than that.
  await delay(8500);
  assert.ok(await evaluate(`(() => {
    const layer = document.querySelector('[data-testid="methodologies-hero-film"]');
    return Boolean(layer?.querySelector('video')?.poster)
      && layer.querySelector('video')?.currentTime === 0
      && getComputedStyle(layer).backgroundColor === 'rgb(19, 32, 64)';
  })()`), "the film poster remains visible while the video response is delayed");
  filmIntercept.released = true;
  for (const requestId of filmIntercept.paused) {
    await send("Fetch.continueRequest", { requestId });
  }
  await waitForFilm(`document.querySelector('[data-testid="methodologies-hero-film"] video')?.currentTime > 0.2`, "late film playback");
  await send("Fetch.disable");
  filmIntercept = null;

  filmIntercept = { mode: "fail", count: 0 };
  await send("Fetch.enable", { patterns });
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  for (let i = 0; filmIntercept.count < 2 && i < 80; i += 1) await delay(100);
  assert.ok(filmIntercept.count >= 2, "both MP4 and WebM sources were rejected");
  await waitForFilm(`Boolean(document.querySelector('[data-testid="methodologies-hero-film"] [role="alert"]'))`,
    "visible failure message after all video sources fail");
  assert.equal(await evaluate(`document.querySelector('[data-testid="hero-figure"] img')?.src`),
    undefined, "the old hero image is not mounted even after a real film failure");
  await send("Fetch.disable");
  filmIntercept = null;
  await send("Network.setCacheDisabled", { cacheDisabled: false });

  await send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  await waitForFilm(`document.querySelector('[data-testid="methodologies-hero-film"] video')?.currentTime > 0.2`,
    "the UAE film auto-plays even under reduced-motion preference");
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-testid="methodologies-film-play"]'))`),
    false, "the play control is hidden while autoplay works");

  await send("Page.navigate", { url: `${baseUrl}/methodologies?market=ksa&locale=en` });
  await waitForFilm(`document.readyState === "complete"
    && document.querySelector('select')?.value === 'ksa'`, "Saudi edition");
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-testid="methodologies-hero-film"]'))`),
    false, "other markets keep their governed hero image");
  await send("Page.navigate", { url: `${baseUrl}/methodologies?market=uae&locale=en` });
  await waitForFilm(`document.readyState === "complete"
    && document.querySelectorAll('[data-route-index]').length === 7
    && document.querySelector('select')?.value === 'uae'`, "restored UAE edition");
}

async function tabInto(selector) {
  await evaluate(`(() => {
    const entry = document.createElement("button");
    entry.id = "methodology-test-entry";
    document.querySelector(${JSON.stringify(selector)}).before(entry);
    entry.focus();
  })()`);
  await pressKey("Tab", "Tab", 9);
  await evaluate(`document.getElementById("methodology-test-entry").remove()`);
}

async function assertRelationshipLayout(pathname, width, scale) {
  await setViewport(width);
  await navigate(pathname, `Boolean(document.querySelector(${JSON.stringify(relationship)}))`);
  const context = pathname + " at " + width + "px / " + scale * 100 + "% text";
  await resizeText(evaluate, relationship, scale);
  await tabInto(relationship + " details");
  await assertFocusedVisible(evaluate, relationship + " summary", context + " disclosure keyboard entry");
  await pressKey(" ", "Space", 32);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(relationship + " details")}).open`), true, context + " keyboard opens connections");
  await assertNoClipping(evaluate, relationship, context);
  const layout = await evaluate(`(() => {
    const section = document.querySelector(${JSON.stringify(relationship)});
    const grid = section.querySelector('[data-testid="relationship-grid"]');
    const columns = [...grid.children];
    const panels = [...columns[1].children];
    const sectionRect = section.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const panelRects = panels.map((panel) => panel.getBoundingClientRect());
    const overlaps = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    return {
      sectionScrollWidth: section.scrollWidth,
      sectionClientWidth: section.clientWidth,
      gridRight: gridRect.right,
      sectionRight: sectionRect.right,
      columnsOverlap: overlaps(columns[0].getBoundingClientRect(), columns[1].getBoundingClientRect()),
      panelsOverlap: overlaps(panelRects[0], panelRects[1]),
      panelsClipped: panelRects.some((rect) => rect.left < sectionRect.left || rect.right > sectionRect.right),
    };
  })()`);
  assert.equal(layout.sectionScrollWidth, layout.sectionClientWidth, `${pathname} should not overflow at ${width}px`);
  assert.equal(layout.columnsOverlap, false, `${pathname} relationship columns should not overlap at ${width}px`);
  assert.equal(layout.panelsOverlap, false, `${pathname} relationship panels should not overlap at ${width}px`);
  assert.equal(layout.panelsClipped, false, `${pathname} relationship panels should not clip at ${width}px`);
  assert.ok(layout.gridRight <= layout.sectionRight + 1, `${pathname} relationship grid should remain inside its section at ${width}px`);
  for (const destination of destinations) {
    await pressKey("Tab", "Tab", 9);
    await assertFocusedVisible(evaluate, relationship + ' a[href="' + destination + '"]', context + " " + destination);
  }
}

async function assertRouteMap(width, scale) {
  await setViewport(width);
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  const context = "Route map at " + width + "px / " + scale * 100 + "% text";
  // Restore a known selection, then enter through the real roving-tabindex group.
  await evaluate(`document.querySelector('[data-route-index="0"]').click()`);
  await delay(50);
  await resizeText(evaluate, routeMap, scale);
  await tabInto('[data-testid="situation-radiogroup"]');
  const situations = [
    "We need to know where AI is worth investing.",
    "We have several AI ideas and need to choose.",
    "We have an AI strategy and need to implement it.",
    "We need to improve a specific process.",
    "We have a pilot and need to put it into everyday use.",
    "AI works in one area. We need to expand it.",
    "Our AI is in use, but the results are falling short.",
  ];
  for (let index = 0; index < situations.length; index += 1) {
    if (index) await pressKey("ArrowDown", "ArrowDown", 40);
    // React replaces the selected panel. Re-snapshot unscaled styles, never
    // compound the scale or accidentally test newly mounted text at 100%.
    if (index) await resizeText(evaluate, routeMap, scale);
    const radio = '[data-route-index="' + index + '"]';
    // Resizing text after focus changes the focused card's height. Bring the
    // enlarged card into view before testing reachability, as a visitor can.
    await evaluate(`document.querySelector(${JSON.stringify(radio)}).scrollIntoView({ block: "nearest", behavior: "instant" })`);
    await assertFocusedVisible(evaluate, radio, context + " keyboard route " + index);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(radio)}).getAttribute("aria-checked")`), "true");
    assert.equal(await evaluate(`document.querySelector('[data-testid="route-detail-situation"]').textContent.trim()`), situations[index]);
    await assertNoClipping(evaluate, routeMap, context + " selection " + index);
    const overlapping = await evaluate(`(() => {
      const panels = [...document.querySelector(${JSON.stringify(routeMap)}).children].map(el => el.getBoundingClientRect());
      return panels[0].right > panels[1].left + 1 && panels[0].bottom > panels[1].top + 1;
    })()`);
    assert.equal(overlapping, false, context + " selector and output must not overlap");
    // Tab out of the radio group to both governing links and every route action.
    const links = await evaluate(`[...document.querySelectorAll('#selected-route-output a')].map((el, index) => {
      el.dataset.browserLinkIndex = index;
      return el.getAttribute("href");
    })`);
    for (const destination of destinations) assert.ok(links.includes(destination), context + " retains " + destination);
    for (const [linkIndex, href] of links.entries()) {
      await pressKey("Tab", "Tab", 9);
      const linkSelector = '[data-browser-link-index="' + linkIndex + '"]';
      await evaluate(`document.querySelector(${JSON.stringify(linkSelector)}).scrollIntoView({ block: "nearest", behavior: "instant" })`);
      await assertFocusedVisible(evaluate, linkSelector, context + " destination " + href);
    }
    // Reverse-tab back to the selected radio, ready to choose the next route.
    for (const _ of links) await pressKey("Tab", "Tab", 9, 8);
    await evaluate(`document.querySelector(${JSON.stringify(radio)}).scrollIntoView({ block: "nearest", behavior: "instant" })`);
    await assertFocusedVisible(evaluate, radio, context + " reverse keyboard entry");
  }
  await pressKey("ArrowDown", "ArrowDown", 40);
  assert.equal(await evaluate(`document.activeElement?.getAttribute("data-route-index")`), "0", context + " arrow navigation wraps");
  await pressKey("ArrowLeft", "ArrowLeft", 37);
  assert.equal(await evaluate(`document.activeElement?.getAttribute("data-route-index")`), "6", context + " reverse arrow navigation wraps");
}

async function assertPrintRoutes() {
  await setViewport(1440);
  await navigate("/methodologies", `document.querySelectorAll('[data-route-index]').length === 7`);
  const screenRoutes = [];
  for (const width of [1440, 390]) {
    await setViewport(width, width === 390 ? 844 : 1000, width === 390);
    for (const [index, expected] of routeExpectations.entries()) {
      await evaluate(`document.querySelector('[data-route-index="${index}"]').click(); true`);
      await delay(50);
      const route = await evaluate(`(() => {
        const panel = document.getElementById("selected-route-output");
        return {
           method: panel.querySelector('[data-testid="route-detail-situation"]').textContent.trim(),
          copy: ['route-detail-decision', 'route-detail-output', 'route-anchor-idao', 'route-anchor-authority']
            .map(id => panel.querySelector('[data-testid="' + id + '"] p').textContent.trim()),
          destinations: [...panel.querySelectorAll('[data-testid="route-actions"] a')].map(link => link.getAttribute('href')),
          anchors: [...panel.querySelectorAll('[data-testid^="route-anchor-"] a')].map(link => link.getAttribute('href')),
        };
      })()`);
       assert.equal(route.method, expected.situation, `${width}px route ${index} situation`);
      assert.deepEqual(route.destinations, expected.destinations, `${width}px route ${index} destinations`);
      assert.deepEqual(route.anchors, destinations);
      if (width === 1440) screenRoutes.push(route);
    }
  }
  // Both viewport origins must print every route, not just the selected/restored one.
  for (const width of [1440, 390]) {
    await setViewport(width, 1000, width === 390);
    await assertMethodologyPrint({ send, evaluate, screenRoutes, width, outputDir: profilePath });
  }
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  // Reduced-motion CSS still sets a nonzero transition duration on every element
  // (default property: all). Disable it fully so resampling sees baseline fonts,
  // not the starting frame of a font-size transition from the previous scale.
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__filmDiagnostics = [];
    document.addEventListener("error", (event) => {
      if (event.target instanceof HTMLMediaElement) {
        window.__filmDiagnostics.push({type: "error", code: event.target.error?.code, src: event.target.currentSrc});
      }
      if (event.target instanceof HTMLSourceElement) {
        window.__filmDiagnostics.push({type: "source-error", src: event.target.src});
      }
    }, true);
    document.addEventListener("playing", (event) => {
      if (event.target instanceof HTMLMediaElement) window.__filmDiagnostics.push({type: "playing", src: event.target.currentSrc});
    }, true);
    for (const type of ["pause", "waiting", "ended", "seeking"]) {
      document.addEventListener(type, (event) => {
        if (event.target instanceof HTMLMediaElement)
          window.__filmDiagnostics.push({type, time: event.target.currentTime, src: event.target.currentSrc});
      }, true);
    }
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "html, body, * { scroll-behavior: auto !important; overflow-anchor: none !important; transition: none !important; }";
      document.head.append(style);
    });
  ` });

  if (process.env.PULSE_FILM_ONLY !== "1") await assertArtworkHover();
  await assertUaeFilmPlayback();
  await assertDelayedFilmAndFallback();
  await assertEmbeddedFilmPlayback();
  if (process.env.PULSE_FILM_ONLY !== "1") {
  // Print at native typography before any text-only overrides are introduced.
  await assertPrintRoutes();
  await send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  const relationshipPaths = [
    "/methodologies/ai-value-to-scale",
    "/methodologies/ai-use-case-prioritization",
    "/methodologies/agentic-operations-readiness",
    "/methodologies/human-agent-operating-model",
  ];
  const scales = process.env.PULSE_TEXT_SCALES?.split(",").map(Number) || [1, 2];
  const widths = process.env.PULSE_TEXT_WIDTHS?.split(",").map(Number) || [1440, 900, 768, 390];
  const routeOnly = process.env.PULSE_ROUTE_ONLY === "1";
  for (const scale of scales) {
    for (const width of widths) {
      await assertRouteMap(width, scale);
      if (!routeOnly) {
        for (const path of relationshipPaths) {
          await assertRelationshipLayout(path, width, scale);
        }
      }
      console.log(`Passed methodology layout at ${width}px / ${scale * 100}% text`);
    }
  }

  if (!routeOnly) {
    await setViewport(900);
  await navigate("/methodologies/agentic-operations-readiness", `document.body.textContent.includes("6 Conditions feed into:")`);
  const readinessBoundary = await evaluate(`(() => {
    const stop = [...document.querySelectorAll("strong")].find((node) => node.textContent?.trim() === "Stop" && node.closest("section")?.textContent.includes("6 Conditions feed into:"))?.parentElement;
    const authority = [...document.querySelectorAll("strong")].find((node) => node.textContent?.trim() === "Separate Agent Authority decision")?.parentElement;
    const stopRect = stop.getBoundingClientRect();
    const authorityRect = authority.getBoundingClientRect();
    return {
      stopText: stop.innerText,
      separate: stopRect.bottom <= authorityRect.top || authorityRect.bottom <= stopRect.top || stopRect.right <= authorityRect.left || authorityRect.right <= stopRect.left,
      gap: authorityRect.top - stopRect.bottom,
    };
  })()`);
  assert.match(readinessBoundary.stopText, /Do not enter IDAO delivery/);
  assert.equal(readinessBoundary.separate, true, "Stop must remain visibly separate from the Agent Authority decision");
  assert.ok(readinessBoundary.gap > 8, "Stop and the Agent Authority decision should retain visible spacing");
  }

  }
  console.log("Methodology route and relationship browser regression passed");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}