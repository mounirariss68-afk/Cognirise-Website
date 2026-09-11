import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9344;
const profilePath = `/tmp/cognirise-education-editorial-browser-test-${process.pid}`;
const evidenceDirectory = new URL("../evidence/education-editorial/", import.meta.url);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const heroOnly = process.env.PULSE_EDUCATION_HERO_ONLY === "1";
const viewports = [
  { label: "1440", width: 1440, height: 1000, mobile: false },
  { label: "768", width: 768, height: 1024, mobile: false },
  { label: "390", width: 390, height: 844, mobile: true },
  { label: "360", width: 360, height: 800, mobile: true },
];
const consoleErrors = [];

await rm(profilePath, { recursive: true, force: true });
await mkdir(evidenceDirectory, { recursive: true });

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
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    consoleErrors.push(message.params.entry.text);
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

async function waitForEducation() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await evaluate(`document.readyState === "complete"
      && document.querySelectorAll('[data-testid^="education-domain-"]').length === 5
      && document.querySelectorAll('[data-testid^="education-capability-"]').length === 7
      && document.querySelectorAll('[data-testid^="education-application-group-"]').length > 0`);
    if (ready) return;
    await delay(100);
  }
  throw new Error("Education editorial controls did not become ready");
}

async function setViewport(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
}

async function screenshot(name, fullPage = false) {
  const params = { format: "png" };
  if (fullPage) {
    const { contentSize } = await send("Page.getLayoutMetrics");
    params.captureBeyondViewport = true;
    params.clip = {
      x: 0,
      y: 0,
      width: Math.ceil(contentSize.width),
      height: Math.ceil(contentSize.height),
      scale: 1,
    };
  }
  const capture = await send("Page.captureScreenshot", params);
  await writeFile(new URL(`${name}.png`, evidenceDirectory), Buffer.from(capture.data, "base64"));
}

async function screenshotHero(name) {
  const clip = await evaluate(`(() => {
    const hero = document.querySelector('[aria-labelledby="education-title"]');
    const rect = hero.getBoundingClientRect();
    return {
      x: Math.max(0, rect.left + window.scrollX),
      y: Math.max(0, rect.top + window.scrollY),
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      scale: 1,
    };
  })()`);
  const capture = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip,
  });
  await writeFile(new URL(`${name}.png`, evidenceDirectory), Buffer.from(capture.data, "base64"));
}

async function navigateToEducation(viewport) {
  await setViewport(viewport);
  await send("Page.navigate", { url: `${baseUrl}/industries/education?market=uae` });
  await waitForEducation();
  await evaluate(`(async () => {
    await Promise.all([...document.images].map(async (image) => {
      if (!image.complete) await new Promise((resolve) => image.addEventListener("load", resolve, { once: true }));
      try { await image.decode(); } catch {}
    }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return true;
  })()`);
}

function containmentProbe() {
  return `(() => {
    const hero = document.querySelector('[aria-labelledby="education-title"]');
    const heroImage = [...(hero?.querySelectorAll("img") ?? [])].find((image) => {
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    const textNodes = [
      document.querySelector('[data-testid="education-audience-label"]'),
      document.getElementById("education-title"),
      document.querySelector("#education-title + p"),
      document.querySelector('[data-testid="education-hero-caption"]'),
    ];
    const heroRect = hero?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const rectangle = (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth,
      hero: heroRect && rectangle(hero),
      heroScrollWidth: hero?.scrollWidth,
      heroClientWidth: hero?.clientWidth,
      heroImage: heroImage && {
        complete: heroImage.complete,
        naturalWidth: heroImage.naturalWidth,
        naturalHeight: heroImage.naturalHeight,
        rect: rectangle(heroImage),
      },
      text: textNodes.map((node) => node && rectangle(node)),
      overflowingElements: [...document.body.querySelectorAll("*")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.position !== "fixed" && rect.right > viewportWidth + 1;
        })
        .slice(0, 5)
        .map((element) => ({ tag: element.tagName, className: element.className, testId: element.getAttribute("data-testid") })),
      heroOverflowingElements: [...(hero?.querySelectorAll("*") ?? [])]
        .filter((element) => element.getBoundingClientRect().right > heroRect.right + 1)
        .slice(0, 5)
        .map((element) => ({ tag: element.tagName, className: element.className, testId: element.getAttribute("data-testid") })),
    };
  })()`;
}

function assertHeroContainment(probe, label, maximumDocumentWidth = probe.viewportWidth + 1) {
  assert.ok(probe.hero, `${label}: hero is missing`);
  assert.ok(probe.heroImage?.complete && probe.heroImage.naturalWidth > 0, `${label}: hero art did not load`);
  assert.ok(probe.heroImage.rect.width > 0 && probe.heroImage.rect.height > 0, `${label}: hero art is not visible`);
  if (maximumDocumentWidth !== null) {
    assert.ok(probe.scrollWidth <= maximumDocumentWidth, `${label}: page has horizontal overflow ${JSON.stringify(probe.overflowingElements)}`);
  }
  assert.ok(probe.heroScrollWidth <= probe.heroClientWidth + 1, `${label}: hero content has horizontal overflow ${JSON.stringify(probe.heroOverflowingElements)}`);
  for (const [index, rect] of probe.text.entries()) {
    assert.ok(rect?.width > 0 && rect?.height > 0, `${label}: hero text item ${index} is not visible`);
    assert.ok(rect.left >= probe.hero.left - 1, `${label}: hero text item ${index} escapes left bound`);
    assert.ok(rect.right <= probe.hero.right + 1, `${label}: hero text item ${index} escapes right bound`);
    assert.ok(rect.top >= probe.hero.top - 1 && rect.bottom <= probe.hero.bottom + 1, `${label}: hero text item ${index} escapes hero bounds`);
  }
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  if (!heroOnly) {
    for (const viewport of viewports) {
      await navigateToEducation(viewport);
      assertHeroContainment(await evaluate(containmentProbe()), viewport.label);
      await screenshot(`fullpage-${viewport.label}`, true);
    }

    await navigateToEducation(viewports[0]);
    const initialContent = await evaluate(`(() => ({
    domains: [...document.querySelectorAll('[data-testid^="education-domain-"]')].map((button) => button.textContent.trim()),
    applications: [...document.querySelectorAll('[data-testid^="education-application-group-"]')].map((button) => button.textContent.trim()),
    capabilities: [...document.querySelectorAll('[data-testid^="education-capability-"]')].map((button) => button.textContent.trim()),
    roadmap: [...document.querySelectorAll('[data-testid^="education-roadmap-"]')].map((button) => button.textContent.trim()),
    }))()`);
    assert.equal(initialContent.domains.length, 5);
    assert.equal(initialContent.capabilities.length, 7);
    assert.ok(initialContent.applications.length > 0);
    assert.equal(initialContent.roadmap.length, 3);

    for (const [group, detail] of [
      ["education-domain", "education-journey-panel"],
      ["education-application-group", "education-applications-detail"],
      ["education-capability", "education-capabilities-detail"],
      ["education-roadmap", "education-timeline-panel"],
    ]) {
      const count = await evaluate(`document.querySelectorAll('[data-testid^="${group}-"]').length`);
      for (let index = 1; index <= count; index += 1) {
        await evaluate(`document.querySelector('[data-testid="${group}-${index}"]').click(); true`);
        await delay(250);
        const state = await evaluate(`(() => {
          const button = document.querySelector('[data-testid="${group}-${index}"]');
          const detail = document.querySelector('[data-testid="${detail}"]');
          return {
            pressed: button.getAttribute("aria-pressed"),
            selectedTitle: button.getAttribute("data-content-title"),
            detailTitle: detail?.getAttribute("data-selected-title"),
          };
        })()`);
        assert.equal(state.pressed, "true", `${group} ${index} did not become selected`);
        assert.equal(state.detailTitle, state.selectedTitle, `${group} ${index} did not reveal its own content`);
      }
      await evaluate(`document.querySelector('[data-testid="${group}-1"]').scrollIntoView({ block: "center" }); true`);
      await screenshot(`interaction-${group}`, false);
    }

    await evaluate(`document.querySelector('[data-testid="education-evidence-1"]').click(); true`);
    await delay(250);
    const evidence = await evaluate(`(() => {
      const button = document.querySelector('[data-testid="education-evidence-1"]');
      return { expanded: button.getAttribute("aria-expanded"), sources: document.querySelectorAll('#evidence a[target="_blank"]').length };
    })()`);
    assert.equal(evidence.expanded, "true");
    assert.ok(evidence.sources > 0, "Expanded evidence has no source link");
    await screenshot("interaction-evidence", false);

    const anchorProbe = await evaluate(`(async () => {
      const nav = document.querySelector('nav[aria-label="Education sections"]');
      document.querySelector('a[href="#capabilities"]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const header = document.querySelector("header").getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const targetRect = document.getElementById("capabilities").getBoundingClientRect();
      return { targetTop: targetRect.top, minimumVisibleTop: header.height + navRect.height - 2 };
    })()`);
    assert.ok(anchorProbe.targetTop >= anchorProbe.minimumVisibleTop, `Capabilities anchor is obscured: ${JSON.stringify(anchorProbe)}`);
  }

  for (const viewport of viewports) {
    await navigateToEducation(viewport);
    const enlargedHero = await evaluate(`(() => {
    const hero = document.querySelector('[aria-labelledby="education-title"]');
    for (const node of [
      document.querySelector('[data-testid="education-audience-label"]'),
      document.getElementById("education-title"),
      document.querySelector("#education-title + p"),
      document.querySelector('[data-testid="education-hero-caption"]'),
    ]) {
      const style = getComputedStyle(node);
      node.style.fontSize = \`\${parseFloat(style.fontSize) * 2}px\`;
      node.style.lineHeight = \`\${parseFloat(style.lineHeight) * 2}px\`;
    }
    return hero.offsetHeight;
    })()`);
    assert.ok(enlargedHero > 0, `${viewport.label} at 200% text: hero collapsed`);
    await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    assertHeroContainment(
      await evaluate(containmentProbe()),
      `${viewport.label} at 200% text`,
      null,
    );
    await screenshotHero(`hero-${viewport.label}-text-200`);
  }

  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(" | ")}`);
  console.log(`Education editorial browser regression passed; screenshots recorded in ${evidenceDirectory.pathname}`);
} finally {
  socket.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2_000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}