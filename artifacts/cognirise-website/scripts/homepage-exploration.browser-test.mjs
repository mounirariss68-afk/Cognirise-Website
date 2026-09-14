import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

// Run with the website workflow serving the managed proxy. Set HOME_PAGE_FIXTURE
// to an API response fixture while the governed homepage slots are awaiting
// editorial migration; destination route checks always use the live routes.
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const fixturePath = process.env.HOME_PAGE_FIXTURE || process.env.HOMEPAGE_FIXTURE;
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const port = 9364;
const profile = `/tmp/cognirise-homepage-exploration-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function normalizeFixture(raw) {
  const candidate = raw?.response && typeof raw.response === "object" ? raw.response : raw;
  if (Array.isArray(candidate?.items)) return candidate;
  const document = raw?.payload && typeof raw.payload === "object"
    ? raw.payload
    : raw?.document && typeof raw.document === "object"
      ? raw.document
      : candidate;
  const item = document?.content ? document : document?.payload;
  assert.ok(item?.content, "HOME_PAGE_FIXTURE must contain a landing-page item or collection response.");
  return {
    items: [{ kind: "landing-page", ...item }],
    page: 1,
    pageSize: 100,
    total: 1,
    market: item.market ?? "uae",
    locale: item.locale ?? "en",
    requestedMarket: item.requestedMarket ?? "uae",
    requestedLocale: item.requestedLocale ?? "en",
    usedFallback: false,
    isConfigured: true,
    configuredPagePaths: ["/"],
  };
}

const fixtureResponse = fixturePath
  ? normalizeFixture(JSON.parse(await readFile(fixturePath, "utf8")))
  : null;

await rm(profile, { recursive: true, force: true });
const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--window-size=1440,1100",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });
const browserExited = new Promise((resolve) => browser.once("exit", resolve));
let socket;
const pending = new Map();
let commandId = 0;

try {
  let target;
  for (let attempt = 0; attempt < 60 && !target; attempt += 1) {
    try {
      target = (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()))
        .find((item) => item.type === "page");
    } catch {
      // Chromium is still starting.
    }
    if (!target) await delay(100);
  }
  assert.ok(target, "Chromium page available");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Fetch.requestPaused") void fulfillHomepageRequest(message.params);
    if (!message.id || !pending.has(message.id)) return;
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
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

  async function fulfillHomepageRequest(params) {
    const requestUrl = new URL(params.request.url);
    const isHomepageCollection =
      requestUrl.pathname.endsWith("/api/public/content") &&
      requestUrl.searchParams.get("kind") === "landing-page";
    if (!fixtureResponse || !isHomepageCollection) {
      await send("Fetch.continueRequest", { requestId: params.requestId }).catch(() => {});
      return;
    }
    const body = JSON.stringify(fixtureResponse);
    await send("Fetch.fulfillRequest", {
      requestId: params.requestId,
      responseCode: 200,
      responseHeaders: [
        { name: "Content-Type", value: "application/json; charset=utf-8" },
        { name: "Content-Length", value: String(Buffer.byteLength(body)) },
        { name: "Cache-Control", value: "no-store" },
      ],
      body: Buffer.from(body).toString("base64"),
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

  async function navigate(path, readyExpression) {
    await send("Page.navigate", { url: `${baseUrl}${path}` });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(`document.readyState === "complete" && Boolean(${readyExpression})`)) return;
      if (attempt === 99) throw new Error(`Page did not become ready: ${path}`);
      await delay(100);
    }
  }

  async function pressKey(key, code, keyCode) {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      text: key === "Enter" ? "\r" : undefined,
      unmodifiedText: key === "Enter" ? "\r" : undefined,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      nativeVirtualKeyCode: keyCode,
    });
  }

  async function pointer(x, y) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  }

  async function touch(x, y, type = "touchStart") {
    await send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 1, radiusY: 1, force: 1 }],
    });
  }

  async function setViewport(width, height, mobile, reducedMotion) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
    await send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" },
        { name: "hover", value: mobile ? "none" : "hover" },
        { name: "pointer", value: mobile ? "coarse" : "fine" },
      ],
    });
  }

  async function waitForHome() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const ready = await evaluate(
        `document.querySelectorAll('[data-testid^="service-trigger-"]').length === 3 &&
         document.querySelectorAll('[data-testid^="blueprint-trigger-"]').length === 4 &&
         document.querySelectorAll('section[aria-label="Cognirise outcomes in motion"] figure').length === 3`,
      );
      if (ready) return;
      if (attempt === 99) throw new Error("Homepage exploration surface did not become ready.");
      await delay(100);
    }
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  if (fixtureResponse) {
    await send("Fetch.enable", {
      patterns: [{ urlPattern: "*api/public/content*", requestStage: "Request" }],
    });
  }

  await setViewport(1440, 1100, false, false);
  await navigate("/", `location.pathname === "/"`);
  await waitForHome();
  await evaluate(`document.querySelector(".blueprint-row").scrollIntoView({ block: "center", behavior: "instant" }); true`);
  await delay(1000);

  const initialBlueprint = await evaluate(`(() => {
    const triggers = [...document.querySelectorAll('[data-testid^="blueprint-trigger-"]')];
    const items = triggers.map((trigger) => trigger.closest(".blueprint-item"));
    const widths = items.map((item) => item.getBoundingClientRect().width);
    return {
      count: triggers.length,
      allCollapsed: triggers.every((trigger) => trigger.getAttribute("aria-expanded") === "false"),
      noSelection: items.every((item) => item.getAttribute("data-selected") !== "true"),
      equalWidths: Math.max(...widths) - Math.min(...widths) <= 2,
    };
  })()`);
  assert.equal(initialBlueprint.count, 4);
  assert.equal(initialBlueprint.allCollapsed, true, JSON.stringify(initialBlueprint));
  assert.equal(initialBlueprint.noSelection, true, JSON.stringify(initialBlueprint));
  assert.equal(initialBlueprint.equalWidths, true, JSON.stringify(initialBlueprint));

  const hoverPoint = await evaluate(`(() => {
    const rect = document.querySelector('[data-testid="blueprint-trigger-2"]').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await pointer(hoverPoint.x, hoverPoint.y);
  await delay(120);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="blueprint-trigger-2"]').getAttribute("aria-expanded")`),
    "true",
    "Pointer hover did not preview a blueprint stage.",
  );
  await pointer(2, 2);
  await delay(120);
  assert.equal(
    await evaluate(`![...document.querySelectorAll('[data-testid^="blueprint-trigger-"]')].some((trigger) => trigger.getAttribute("aria-expanded") === "true")`),
    true,
    "Leaving the blueprint did not restore the collapsed state.",
  );

  await evaluate(`document.querySelector('[data-testid="blueprint-trigger-1"]').focus(); true`);
  await delay(850);
  await pressKey("Enter", "Enter", 13);
  await delay(50);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="blueprint-trigger-1"]').getAttribute("aria-expanded")`),
    "true",
  );
  await pressKey("Escape", "Escape", 27);
  await delay(850);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="blueprint-trigger-1"]').getAttribute("aria-expanded")`),
    "false",
  );
  await pressKey("ArrowRight", "ArrowRight", 39);
  assert.equal(
    await evaluate(`document.activeElement?.getAttribute("data-testid")`),
    "blueprint-trigger-2",
    "Blueprint arrow navigation did not move focus.",
  );
  await evaluate(`document.activeElement.blur(); true`);
  await delay(850);

  const touchPoint = await evaluate(`(() => {
    const rect = document.querySelector('[data-testid="blueprint-trigger-3"]').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await touch(touchPoint.x, touchPoint.y);
  await touch(touchPoint.x, touchPoint.y, "touchEnd");
  await delay(80);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="blueprint-trigger-3"]').getAttribute("aria-expanded")`),
    "true",
  );
  await delay(850);
  const secondTouchPoint = await evaluate(`(() => {
    const rect = document.querySelector('[data-testid="blueprint-trigger-3"]').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await touch(secondTouchPoint.x, secondTouchPoint.y);
  await touch(secondTouchPoint.x, secondTouchPoint.y, "touchEnd");
  await delay(80);
  assert.equal(
    await evaluate(`document.querySelector('[data-testid="blueprint-trigger-3"]').getAttribute("aria-expanded")`),
    "false",
    "Touch did not close the selected blueprint stage on the second tap.",
  );

  await evaluate(`document.querySelector('[data-testid="service-trigger-consulting-engineering"]').scrollIntoView({ block: "center", behavior: "instant" }); true`);
  await delay(900);
  const servicePoint = await evaluate(`(() => {
    const rect = document.querySelector('[data-testid="service-trigger-consulting-engineering"]').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await pointer(servicePoint.x, servicePoint.y);
  await delay(900);
  const methodologyPoint = await evaluate(`(() => {
    const links = [...document.querySelectorAll('[data-testid="service-methodologies"] a')];
    const rect = links[0].getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await pointer(methodologyPoint.x, methodologyPoint.y);
  await delay(80);
  const serviceLinks = await evaluate(`(() => {
    const panel = document.querySelector('[data-testid="service-panel-consulting-engineering"]');
    const links = [...panel.querySelectorAll("a")];
    return {
      panelVisible: panel.getAttribute("aria-hidden") === "false",
      pointerOnLink: document.elementFromPoint(${methodologyPoint.x}, ${methodologyPoint.y})?.closest("a") !== null,
      hrefs: links.map((link) => link.getAttribute("href")),
    };
  })()`);
  assert.equal(serviceLinks.panelVisible, true, JSON.stringify(serviceLinks));
  assert.equal(serviceLinks.pointerOnLink, true, JSON.stringify(serviceLinks));
  assert.deepEqual(serviceLinks.hrefs, [
    "/methodologies",
    "/methodologies/idao",
    "/methodologies/agent-authority-model",
    "/what-we-do/agentic-enterprise-transformation",
    "/what-we-do/data-ai-foundations",
    "/what-we-do/engineering-with-ai",
  ]);

  const outcomes = await evaluate(`(() => [...document.querySelectorAll('section[aria-label="Cognirise outcomes in motion"] figure')].map((figure) => {
    const link = figure.querySelector("figcaption a");
    const heading = figure.querySelector("figcaption strong");
    const captionElement = figure.querySelector("figcaption");
    const linkRect = link?.getBoundingClientRect();
    const headingRect = heading?.getBoundingClientRect();
    const captionRect = captionElement?.getBoundingClientRect();
    const caption = figure.querySelector("figcaption")?.innerText ?? "";
    return {
      caption,
      href: link?.getAttribute("href"),
      controls: figure.querySelectorAll("a a, a button, button a, button button").length,
      visible: Boolean(link && link.getBoundingClientRect().width && link.getBoundingClientRect().height),
      belowHeading: Boolean(linkRect && headingRect && linkRect.top >= headingRect.bottom - 1),
      bounded: Boolean(linkRect && captionRect && linkRect.left >= captionRect.left - 1 && linkRect.right <= captionRect.right + 1),
    };
  }))()`);
  assert.equal(outcomes.length, 3);
  assert.match(outcomes[0].caption, /Boundaries you control\./);
  assert.match(outcomes[1].caption, /Work that flows\./);
  assert.match(outcomes[2].caption, /A platform that remembers\./);
  assert.deepEqual(outcomes.map((outcome) => outcome.href), [
    "/methodologies/agent-authority-model",
    "/methodologies/human-agent-operating-model",
    "/platforms/cognios#architecture",
  ]);
  assert.ok(outcomes.every((outcome) => outcome.controls === 0 && outcome.visible && outcome.belowHeading && outcome.bounded), JSON.stringify(outcomes));

  await setViewport(390, 1000, true, true);
  await navigate("/", `location.pathname === "/"`);
  await waitForHome();
  const mobile = await evaluate(`(() => {
    const section = document.querySelector('section[aria-label="Cognirise outcomes in motion"]');
    const links = [...section.querySelectorAll("figcaption a")];
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      linksVisible: links.every((link) => link.getBoundingClientRect().width > 0 && link.getBoundingClientRect().height > 0),
      transitionsStopped: [...document.querySelectorAll(".cps-line-component *, #delivery-blueprint *")]
        .every((element) => parseFloat(getComputedStyle(element).transitionDuration) <= 0.001),
    };
  })()`);
  assert.ok(mobile.overflow <= 1, JSON.stringify(mobile));
  assert.equal(mobile.reducedMotion, true);
  assert.equal(mobile.linksVisible, true, JSON.stringify(mobile));
  assert.equal(mobile.transitionsStopped, true, JSON.stringify(mobile));

  // These are real route checks, not fixture responses.
  await navigate("/methodologies/agent-authority-model", `document.querySelector("h1")`);
  assert.match(await evaluate("document.body.innerText"), /Agent Authority Model/);
  await navigate("/methodologies/human-agent-operating-model", `document.querySelector("h1")`);
  assert.match(await evaluate("document.body.innerText"), /Human.?Agent Operating Model/i);
  await navigate("/platforms/cognios#architecture", `document.querySelector("#architecture")`);
  const architecture = await evaluate(`(() => {
    const section = document.querySelector("#architecture");
    const rect = section?.getBoundingClientRect();
    return { hash: location.hash, visible: Boolean(rect && rect.height > 0), heading: section?.innerText?.slice(0, 120) };
  })()`);
  assert.equal(architecture.hash, "#architecture", JSON.stringify(architecture));
  assert.equal(architecture.visible, true, JSON.stringify(architecture));
  assert.match(architecture.heading, /architecture/i);

  console.log(`Homepage exploration browser test passed${fixturePath ? " with governed homepage fixture" : ""}.`);
  console.log(JSON.stringify({
    desktopBlueprint: initialBlueprint,
    serviceMethodologyAndDestinations: serviceLinks.hrefs,
    outcomes,
    mobile,
    liveRoutes: {
      authority: "/methodologies/agent-authority-model",
      humanAgent: "/methodologies/human-agent-operating-model",
      architecture: architecture.hash,
    },
  }));
} finally {
  socket?.close();
  if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2_000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}