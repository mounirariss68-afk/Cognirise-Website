import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9337;
const profilePath = `/tmp/cognirise-case-rail-browser-test-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

  console.log("Case-study inline expansion, image containment, carousel endpoints and native vertical scrolling passed.");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await delay(250);
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}