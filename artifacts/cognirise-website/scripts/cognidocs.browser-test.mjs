import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9346;
const profilePath = `/tmp/cognirise-cognidocs-browser-test-${process.pid}`;
const verificationDirectory = "/tmp/cognidocs-verification";
const scenarioTabSelector = '[role="tablist"][aria-label="Extraction demonstrations"] > [role="tab"]';
const fieldTabSelector = '[role="group"][aria-label^="Extraction fields"] > button';
const viewports = [
  { label: "desktop", width: 1440, height: 1000, mobile: false },
  { label: "tablet", width: 768, height: 1024, mobile: false },
  { label: "mobile", width: 390, height: 844, mobile: true },
];
const editionExpectations = [
  {
    key: "finance",
    heading: "CogniDocs Finance",
    outcome: "Statements become structured, categorized data.",
    applications: [
      "Reconciliation",
      "Lending & underwriting",
      "Expense management",
      "Accounting data entry",
      "Spend analytics",
      "Audit tie-outs",
      "Fraud & tampering checks",
      "VAT recovery",
      "Dispute resolution",
      "Wealth & mortgage onboarding",
    ],
  },
  {
    key: "engineering",
    heading: "CogniDocs Engineering",
    outcome: "Drawings become itemized, checkable bills of fact.",
    applications: [
      "BOQ & quantity takeoff",
      "Code-compliance review",
      "Tender & bid evaluation",
      "Tender writing support",
      "Procurement & SKU matching",
      "Technical query drafting",
      "As-built asset registers",
      "P&ID digitization",
      "Permit review",
      "Progress verification",
      "FM handover",
    ],
  },
];
const visualReferences = [
  { key: "cognios", path: "/platforms/cognios" },
  { key: "shared-method-hero", path: "/methodologies/ai-value-to-scale" },
];
const browserScope = process.env.COGNIDOCS_BROWSER_SCOPE || "all";
if (!["all", "core", "remaining", "references"].includes(browserScope)) {
  throw new Error(`Unsupported COGNIDOCS_BROWSER_SCOPE: ${browserScope}`);
}
const runCore = browserScope === "all" || browserScope === "core";
const runRemaining = browserScope === "all" || browserScope === "remaining";
const runReferences = browserScope === "all" || browserScope === "references";
const consoleErrors = [];
const verificationMetrics = [];
const negligibleMotion = (duration) => duration.split(",").every((value) => {
  const milliseconds = parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
  return milliseconds <= 0.011;
});

await rm(profilePath, { recursive: true, force: true });
if (browserScope !== "remaining") {
  await rm(verificationDirectory, { recursive: true, force: true });
}
await mkdir(verificationDirectory, { recursive: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
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
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text || "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    const entry = message.params.entry;
    // The existing contact page falls back to its published/default email when
    // no contact configuration exists. Report this separate-page 404 explicitly.
    if (entry.url?.includes("/api/public/contact-configuration") && entry.text.includes("404")) {
      console.warn(`Existing contact configuration unavailable: ${entry.url}`);
    } else consoleErrors.push(`${entry.text || "Console error"} ${entry.url || ""}`);
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

async function pressKey(key, code, keyCode) {
  for (const type of ["keyDown", "keyUp"]) {
    await send("Input.dispatchKeyEvent", {
      type,
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
    });
  }
  await delay(50);
}

async function setViewport(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
}

async function waitForPage(pathname = "/platforms/cognidocs") {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await evaluate(`document.readyState === "complete"
      && location.pathname === ${JSON.stringify(pathname)}
      && document.body?.innerText?.includes("CogniDocs")
      && document.querySelector(${JSON.stringify(scenarioTabSelector)}) !== null`);
    if (ready) return;
    await delay(100);
  }
  const diagnostics = await evaluate(`({
    href: location.href,
    readyState: document.readyState,
    title: document.title,
    body: document.body?.innerText?.slice(0, 500),
    scenarioTabs: document.querySelectorAll(${JSON.stringify(scenarioTabSelector)}).length,
    fieldTabs: document.querySelectorAll(${JSON.stringify(fieldTabSelector)}).length,
  })`);
  throw new Error(`CogniDocs did not become ready: ${JSON.stringify({
    ...diagnostics,
    consoleErrors: consoleErrors.slice(-20),
  })}`);
}

async function navigate(pathname, search = "") {
  await send("Page.navigate", { url: `${baseUrl}${pathname}${search}` });
  await waitForPage(pathname);
}

async function waitForPath(pathname) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.readyState === "complete"
      && location.pathname === ${JSON.stringify(pathname)}
      && document.body?.innerText?.trim().length > 0`)) return;
    await delay(100);
  }
  const diagnostics = await evaluate(`({
    href: location.href,
    readyState: document.readyState,
    title: document.title,
    body: document.body?.innerText?.slice(0, 500),
    bodyChildren: document.body?.children?.length || 0,
  })`);
  throw new Error(`Browser did not reach ${pathname}: ${JSON.stringify({
    ...diagnostics,
    consoleErrors: consoleErrors.slice(-20),
  })}`);
}

function assertNoHorizontalOverflow(layout, label) {
  assert.ok(
    layout.documentScrollWidth <= layout.viewportWidth + 1,
    `${label}: document overflows horizontally (${JSON.stringify(layout)})`,
  );
  assert.ok(
    layout.bodyScrollWidth <= layout.viewportWidth + 1,
    `${label}: body overflows horizontally (${JSON.stringify(layout)})`,
  );
}

async function getLayout() {
  return evaluate(`(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    scenarioTabs: [...document.querySelectorAll(${JSON.stringify(scenarioTabSelector)})].map((tab) => ({
      text: tab.textContent.trim(),
      selected: tab.getAttribute("aria-selected"),
      controls: tab.getAttribute("aria-controls"),
    })),
    fieldTabs: [...document.querySelectorAll(${JSON.stringify(fieldTabSelector)})].map((tab) => ({
      text: tab.textContent.trim(),
      selected: tab.getAttribute("aria-pressed"),
    })),
    panels: [...document.querySelectorAll('[role="tabpanel"]')].map((panel) => ({
      id: panel.id,
      hidden: panel.hidden,
      text: panel.innerText,
    })),
  }))()`);
}

async function settleVisuals() {
  await evaluate(`(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode?.().catch?.(() => {}) ?? Promise.resolve()));
    return true;
  })()`);
  // Let the shared Pulse hero entrance animation finish before capturing
  // evidence; otherwise a valid image can be recorded mid-fade.
  await delay(1050);
}

async function captureScreenshot(name) {
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  const path = `${verificationDirectory}/${name}.png`;
  await writeFile(path, Buffer.from(screenshot.data, "base64"));
  return path;
}

async function getCogniDocsHeroMetrics() {
  return evaluate(`(() => {
    const box = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const main = document.querySelector('main[data-platform="cognidocs"]') || document.querySelector("main");
    const image = main?.querySelector("img");
    const title = main?.querySelector("h1");
    const imageFrame = image?.closest("figure,[data-cognidocs-hero-media],[data-cognidocs-hero-image]") || image?.parentElement;
    const copyFrame = title?.parentElement;
    const imageBounds = box(imageFrame);
    const copyBounds = box(copyFrame);
    const overlaps = imageBounds && copyBounds
      ? imageBounds.left < copyBounds.right
        && imageBounds.right > copyBounds.left
        && imageBounds.top < copyBounds.bottom
        && imageBounds.bottom > copyBounds.top
      : null;
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
      image: box(image),
      imageFrame: imageBounds,
      copy: box(title),
      copyFrame: copyBounds,
      heroSection: box(main?.querySelector("section")),
      independentBounds: Boolean(imageBounds && copyBounds && imageFrame !== copyFrame && !overlaps),
    };
  })()`);
}

async function getEditionMetrics() {
  const expectations = JSON.stringify(editionExpectations);
  return evaluate(`(() => {
    const expectedEditions = ${expectations};
    const canonical = (value) => value
      .toLowerCase()
      .replaceAll("digitisation", "digitization")
      .replaceAll("&", "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const visible = (node) => {
      if (!node || node.closest("[hidden], [aria-hidden='true']")) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) > 0
        && node.getClientRects().length > 0
        && rect.width > 0
        && rect.height > 0;
    };
    const textOf = (node) => canonical(node?.innerText || node?.textContent || "");
    const hasText = (node, expected) => textOf(node).includes(canonical(expected));
    const getRect = (node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const getEdition = (expected) => {
      const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5,[role='heading'],[data-edition-heading],section > div *")]
        .find((node) => textOf(node) === canonical(expected.heading));
      const ancestors = [];
      for (let node = heading; node; node = node.parentElement) {
        if (expected.applications.every((application) => hasText(node, application))) ancestors.push(node);
      }
      const root = ancestors
        .filter((node) => [...node.querySelectorAll("ul,ol")].some((list) =>
          expected.applications.every((application) => hasText(list, application))))
        .sort((left, right) => textOf(left).length - textOf(right).length)[0]
        || ancestors.sort((left, right) => textOf(left).length - textOf(right).length)[0];
      const applicationItems = expected.applications.map((application) => {
        if (!root) return null;
        const candidates = [...root.querySelectorAll("li,[data-application],span,p")]
          .filter((node) => hasText(node, application) && visible(node))
          .sort((left, right) => textOf(left).length - textOf(right).length);
        const source = candidates[0];
        const item = source?.closest("li,[data-application]") || source;
        if (!item || !visible(item)) return null;
        const rect = getRect(item);
        return {
          expected: application,
          text: item.innerText?.trim() || item.textContent?.trim() || "",
          tag: item.tagName,
          listTag: item.closest("ul,ol")?.tagName || null,
          visible: visible(item),
          rect,
        };
      });
      const positions = applicationItems.map((item) => {
        if (!item) return null;
        const node = [...(root?.querySelectorAll("li,[data-application],span,p") || [])]
          .find((candidate) => (candidate.innerText?.trim() || candidate.textContent?.trim() || "") === item.text);
        return node ? [...document.querySelectorAll("body *")].indexOf(node) : null;
      });
      return {
        headingFound: Boolean(heading),
        outcomeFound: Boolean(root && textOf(root).includes(canonical(expected.outcome))),
        rootTag: root?.tagName || null,
        applicationItems,
        allVisible: applicationItems.every(Boolean) && applicationItems.every((item) => item.visible),
        nativeListItems: applicationItems.every((item) => item && (item.tag === "LI" || item.listTag === "UL" || item.listTag === "OL")),
        ordered: positions.every((position, index) => index === 0 || (position !== null && positions[index - 1] !== null && position > positions[index - 1])),
      };
    };
    return Object.fromEntries(expectedEditions.map((expected) => [expected.key, getEdition(expected)]));
  })()`);
}

async function getReferenceLayout() {
  return evaluate(`(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    headings: [...document.querySelectorAll("h1,h2")].slice(0, 4).map((heading) => heading.innerText.trim()),
    images: [...document.querySelectorAll("main img,img")].slice(0, 6).map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        alt: image.alt,
        loaded: Boolean(image.complete && image.naturalWidth > 0),
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
      };
    }),
  }))()`);
}

async function clickTab(textPattern, selector) {
  const clicked = await evaluate(`(() => {
    const tab = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .find((candidate) => ${textPattern}.test(candidate.textContent || ""));
    if (!tab) return false;
    tab.click();
    return true;
  })()`);
  assert.equal(clicked, true, `Could not find demonstration tab matching ${textPattern}`);
  await delay(60);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  if (runCore) {
    for (const viewport of viewports) {
    await setViewport(viewport);
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
    });
    await navigate("/platforms/cognidocs");
    await settleVisuals();

    const initialLayout = await getLayout();
    assertNoHorizontalOverflow(initialLayout, viewport.label);
    assert.equal(initialLayout.scenarioTabs.length, 2, `${viewport.label}: expected Finance and Engineering tabs`);
    assert.equal(initialLayout.scenarioTabs.filter((tab) => tab.selected === "true").length, 1);
    assert.equal(initialLayout.fieldTabs.length, 2, `${viewport.label}: expected two finance source fields`);
    assert.equal(initialLayout.fieldTabs.filter((tab) => tab.selected === "true").length, 1);
    assert.equal(initialLayout.panels.filter((panel) => !panel.hidden).length, 1);
    const heroMetrics = await getCogniDocsHeroMetrics();
    assert.equal(heroMetrics.imageLoaded, true, `${viewport.label}: CogniDocs hero image did not load`);
    assert.ok(heroMetrics.imageFrame?.width > viewport.width * 0.25, `${viewport.label}: hero artwork has no independent width`);
    assert.ok(heroMetrics.imageFrame?.height > 180, `${viewport.label}: hero artwork has no independent height`);
    assert.ok(heroMetrics.copy?.width > 0 && heroMetrics.copy?.height > 0, `${viewport.label}: hero copy bounds are empty`);
    assert.equal(heroMetrics.independentBounds, true, `${viewport.label}: hero artwork and copy bounds overlap`);
    if (viewport.mobile || viewport.width < 1024) {
      const expectedRatio = viewport.mobile ? 4 / 3 : 16 / 9;
      const actualRatio = heroMetrics.imageFrame.width / heroMetrics.imageFrame.height;
      assert.ok(
        Math.abs(actualRatio - expectedRatio) < 0.04,
        `${viewport.label}: hero artwork ratio changed (${actualRatio}; expected ${expectedRatio})`,
      );
    } else {
      assert.ok(
        Math.abs(heroMetrics.imageFrame.height - 630) <= 2,
        `${viewport.label}: desktop hero artwork height changed (${heroMetrics.imageFrame.height})`,
      );
    }
    assert.ok(
      heroMetrics.imageFrame?.left >= -1 && heroMetrics.imageFrame?.right <= viewport.width + 1,
      `${viewport.label}: hero artwork escapes its viewport (${JSON.stringify(heroMetrics)})`,
    );
    await captureScreenshot(`cognidocs-${viewport.label}-hero`);

    const editionMetrics = await getEditionMetrics();
    for (const edition of editionExpectations) {
      const metrics = editionMetrics[edition.key];
      assert.equal(metrics.headingFound, true, `${viewport.label}: missing ${edition.heading} heading`);
      assert.equal(metrics.outcomeFound, true, `${viewport.label}: missing original ${edition.outcome} headline`);
      assert.equal(metrics.allVisible, true, `${viewport.label}: ${edition.heading} has hidden application text`);
      assert.equal(metrics.nativeListItems, true, `${viewport.label}: ${edition.heading} applications are not native list items`);
      assert.equal(metrics.ordered, true, `${viewport.label}: ${edition.heading} applications changed order`);
    }
    await evaluate(`(() => {
      const heading = [...document.querySelectorAll("section *")]
        .find((node) => /one engine,? two editions/i.test(node.textContent || ""));
      heading?.scrollIntoView({ block: "start", inline: "nearest" });
      window.scrollBy(0, -24);
      return true;
    })()`);
    await delay(120);
    const editionsScreenshot = await captureScreenshot(`cognidocs-${viewport.label}-editions`);

    const initialPanel = initialLayout.panels.find((panel) => !panel.hidden);
    assert.match(initialPanel?.text || "", /CRM\*CAREEM RIDES DXB 8842/);
    assert.match(initialPanel?.text || "", /Row 2, Description Column \(Page 1\)/);
    assert.match(initialPanel?.text || "", /Careem Rides/);
    assert.match(initialPanel?.text || "", /Pattern match against known transport providers\./);
    assert.match(initialPanel?.text || "", /Reviewer Note/i);
    const initialSourceState = await evaluate(`(() => {
      const source = (text) => [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === text);
      const highlighted = (node) => Boolean(node && node.className.includes("ring-1"));
      return {
        merchant: highlighted(source("CRM*CAREEM RIDES DXB 8842")),
        amount: highlighted(source("45.50 CR")),
      };
    })()`);
    assert.deepEqual(initialSourceState, { merchant: true, amount: false }, `${viewport.label}: selected source is not highlighted`);

    await clickTab("/Credit Amount/i", fieldTabSelector);
    const amount = await getLayout();
    assertNoHorizontalOverflow(amount, `${viewport.label} after finance source switch`);
    assert.equal(amount.fieldTabs.find((tab) => /Credit Amount/i.test(tab.text))?.selected, "true");
    const amountPanel = amount.panels.find((panel) => !panel.hidden);
    assert.match(amountPanel?.text || "", /45\.50 \(AED\)/);
    assert.match(amountPanel?.text || "", /Row 2, Credit Column \(Page 1\)/);
    assert.match(amountPanel?.text || "", /Value identified in 'CR' \/ Credit proximity with valid currency locale\./);
    const amountSourceState = await evaluate(`(() => {
      const source = (text) => [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === text);
      const highlighted = (node) => Boolean(node && node.className.includes("ring-1"));
      return {
        merchant: highlighted(source("CRM*CAREEM RIDES DXB 8842")),
        amount: highlighted(source("45.50 CR")),
      };
    })()`);
    assert.deepEqual(amountSourceState, { merchant: false, amount: true }, `${viewport.label}: source switch did not follow selected field`);

    await clickTab("/Engineering/i", scenarioTabSelector);
    const engineering = await getLayout();
    assertNoHorizontalOverflow(engineering, `${viewport.label} after manual example switch`);
    assert.equal(engineering.scenarioTabs.find((tab) => /Engineering/i.test(tab.text))?.selected, "true");
    assert.equal(engineering.fieldTabs.length, 3, `${viewport.label}: expected three engineering source fields`);
    const engineeringPanel = engineering.panels.find((panel) => !panel.hidden);
    assert.match(engineeringPanel?.text || "", /\|<-- 4500mm -->\|/);
    assert.match(engineeringPanel?.text || "", /Detail A: Pump Assembly/);
    assert.match(engineeringPanel?.text || "", /Printed dimension extracted directly; geometry marked 'Not to Scale'\./);
    assert.match(engineeringPanel?.text || "", /Reviewer Note/i);
    const engineeringSourceState = await evaluate(`(() => {
      const source = [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === "|<-- 4500mm -->|");
      return Boolean(source && source.className.includes("ring-1"));
    })()`);
    assert.equal(engineeringSourceState, true, `${viewport.label}: engineering source is not highlighted`);

    await clickTab("/Quantity Revision/i", fieldTabSelector);
    const quantity = await getLayout();
    assertNoHorizontalOverflow(quantity, `${viewport.label} after engineering source switch`);
    assert.equal(quantity.fieldTabs.find((tab) => /Quantity Revision/i.test(tab.text))?.selected, "true");
    const quantityPanel = quantity.panels.find((panel) => !panel.hidden);
    assert.match(quantityPanel?.text || "", /14 units/);
    assert.match(quantityPanel?.text || "", /Requires Review/i);
    assert.match(quantityPanel?.text || "", /Title Block: Revision/);
    assert.match(quantityPanel?.text || "", /Requires manual cross-check with original Revision B sheet\./);
    const quantitySourceState = await evaluate(`(() => {
      const source = [...document.querySelectorAll("span")].find((node) => node.textContent.trim() === "Cloud Rev B (14 units)");
      return Boolean(source && source.className.includes("ring-1"));
    })()`);
    assert.equal(quantitySourceState, true, `${viewport.label}: engineering review source is not highlighted`);

    await evaluate(`(() => {
      const tab = [...document.querySelectorAll(${JSON.stringify(scenarioTabSelector)})]
        .find((candidate) => /Engineering/i.test(candidate.textContent || ""));
      tab.focus();
      return document.activeElement === tab;
    })()`);
    await pressKey("ArrowLeft", "ArrowLeft", 37);
    const keyboard = await getLayout();
    assert.equal(keyboard.scenarioTabs.find((tab) => /Financial/i.test(tab.text))?.selected, "true");
    assert.equal(keyboard.fieldTabs.find((tab) => /Merchant Classification/i.test(tab.text))?.selected, "true");
    assert.match(keyboard.panels.find((panel) => !panel.hidden)?.text || "", /CRM\*CAREEM RIDES DXB 8842/);
    assert.match(keyboard.panels.find((panel) => !panel.hidden)?.text || "", /Reviewer Note/i);

    // Keep the core captures and concrete bounds together. Reference captures
    // run after the core and remaining checks so they never require a
    // navigation back into the tested page.
    verificationMetrics.push({
      viewport,
      screenshots: {
        hero: `${verificationDirectory}/cognidocs-${viewport.label}-hero.png`,
        editions: editionsScreenshot,
        references: {},
      },
      layout: initialLayout,
      hero: heroMetrics,
      editions: editionMetrics,
    });
    }
  }

  if (runRemaining) {
    if (!runCore) {
      await setViewport(viewports[0]);
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await navigate("/platforms/cognidocs");
    } else {
      await setViewport(viewports[0]);
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await waitForPage("/platforms/cognidocs");
    }
    await settleVisuals();
    const reducedMotion = await evaluate(`(() => {
    const page = document.querySelector('[data-testid="cognidocs-page"]') || document.querySelector("main");
    const activePanel = document.querySelector('[role="tabpanel"]:not([hidden])');
    const styles = page ? getComputedStyle(page) : null;
    const panelStyles = activePanel ? getComputedStyle(activePanel) : null;
    const motionNodes = [...(page?.querySelectorAll("[data-pulse-reveal], [data-pulse-image], [role='tabpanel']") ?? [])]
      .map((node) => {
        const computed = getComputedStyle(node);
        return {
          animationDuration: computed.animationDuration,
          transitionDuration: computed.transitionDuration,
          opacity: computed.opacity,
          transform: computed.transform,
        };
      });
    return {
      preference: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      pageAnimation: styles?.animationDuration,
      pageTransition: styles?.transitionDuration,
      panelAnimation: panelStyles?.animationDuration,
      panelTransition: panelStyles?.transitionDuration,
      motionNodes,
    };
    })()`);
    assert.equal(reducedMotion.preference, true);
    assert.ok(
      negligibleMotion(reducedMotion.pageAnimation),
      `reduced-motion page animation remained active: ${JSON.stringify(reducedMotion)}`,
    );
    assert.ok(
      negligibleMotion(reducedMotion.panelAnimation) && negligibleMotion(reducedMotion.panelTransition),
      `reduced-motion demo animation remained active: ${JSON.stringify(reducedMotion)}`,
    );
    assert.ok(
      reducedMotion.motionNodes.every((node) =>
        negligibleMotion(node.animationDuration) && negligibleMotion(node.transitionDuration)
      ),
      `reduced-motion descendants retained motion: ${JSON.stringify(reducedMotion.motionNodes)}`,
    );

    const contactHref = await evaluate(`document.querySelector('a[href="/contact"]')?.getAttribute("href")`);
    assert.equal(contactHref, "/contact", "CogniDocs enquiry CTA must link to /contact");
    await evaluate(`document.querySelector('a[href="/contact"]').click(); true`);
    await waitForPath("/contact");
    assert.equal(await evaluate("location.pathname"), "/contact");
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await evaluate(`Boolean(document.querySelector('a[href^="mailto:"]'))`)) break;
      await delay(100);
    }
    assert.match(await evaluate(`document.querySelector('a[href^="mailto:"]')?.getAttribute("href") || ""`), /^mailto:[^@]+@[^@]+$/);

    await send("Page.navigate", { url: `${baseUrl}/cognidocs?from=legacy&utm_source=regression` });
    await waitForPage("/platforms/cognidocs");
    const legacy = await evaluate(`({ pathname: location.pathname, search: location.search })`);
    assert.equal(legacy.pathname, "/platforms/cognidocs");
    const legacySearch = new URLSearchParams(legacy.search);
    assert.equal(legacySearch.get("from"), "legacy");
    assert.equal(legacySearch.get("utm_source"), "regression");
    assert.equal(legacySearch.get("market"), "uae");
  }

  if (runReferences) {
    for (const viewport of viewports) {
      await setViewport(viewport);
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      const referenceMetrics = {};
      for (const reference of visualReferences) {
        await send("Page.navigate", { url: `${baseUrl}${reference.path}` });
        await waitForPath(reference.path);
        await settleVisuals();
        const layout = await getReferenceLayout();
        assertNoHorizontalOverflow(layout, `${viewport.label} ${reference.key}`);
        assert.ok(
          layout.images.some((image) => image.loaded && image.width > 0 && image.height > 0),
          `${viewport.label} ${reference.key}: image-led reference did not render a loaded image`,
        );
        const screenshot = await captureScreenshot(`${reference.key}-${viewport.label}`);
        referenceMetrics[reference.key] = { path: reference.path, screenshot, layout };
      }
      const metrics = verificationMetrics.find((entry) => entry.viewport.label === viewport.label);
      if (metrics) metrics.screenshots.references = referenceMetrics;
      else verificationMetrics.push({
        viewport,
        screenshots: { references: referenceMetrics },
      });
    }
  }

  if (runCore || runReferences) {
    await writeFile(
      `${verificationDirectory}/metrics.json`,
      `${JSON.stringify({
        directory: verificationDirectory,
        scope: browserScope,
        viewports: verificationMetrics,
      }, null, 2)}\n`,
    );
  }

  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(" | ")}`);
  const artifactsMessage = runCore || runReferences
    ? `; verification artifacts: ${verificationDirectory}/metrics.json`
    : "";
  console.log(`CogniDocs browser regression passed (${browserScope})${artifactsMessage}`);
} finally {
  socket.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2_000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}