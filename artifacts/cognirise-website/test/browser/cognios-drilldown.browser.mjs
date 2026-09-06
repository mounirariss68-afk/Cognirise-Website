import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";

const chromium = [
  process.env.CHROMIUM_PATH,
  "/repl/tools/bin/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((candidate) => candidate && existsSync(candidate));

assert.ok(chromium, "Chromium is required for the CogniOS browser regression");

const availablePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});

const waitFor = async (check, message, timeout = 30_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // The dev server and browser may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${message}`);
};

const stopProcess = (child) => new Promise((resolve) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    resolve();
    return;
  }
  const timeout = setTimeout(() => {
    child.kill("SIGKILL");
    resolve();
  }, 2_000);
  child.once("exit", () => {
    clearTimeout(timeout);
    resolve();
  });
  child.kill("SIGTERM");
});

const serverPort = await availablePort();
let debugPort = await availablePort();
while (debugPort === serverPort) debugPort = await availablePort();
const profileDir = await mkdtemp(join(tmpdir(), "cognios-browser-"));
const appUrl = `http://127.0.0.1:${serverPort}`;
const childEnv = { ...process.env, PORT: String(serverPort), BASE_PATH: "/" };

await new Promise((resolve, reject) => {
  const build = spawn(
    "pnpm",
    ["exec", "vite", "build", "--config", "vite.config.ts"],
    {
      cwd: new URL("../..", import.meta.url),
      env: childEnv,
      stdio: "inherit",
    },
  );
  build.once("error", reject);
  build.once("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`CogniOS browser test build exited with code ${code}`));
  });
});

const vite = spawn(
  "pnpm",
  ["exec", "vite", "preview", "--config", "vite.config.ts", "--host", "127.0.0.1"],
  {
    cwd: new URL("../..", import.meta.url),
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const browser = spawn(
  chromium,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let socket;
let messageId = 0;
const pending = new Map();

try {
  await waitFor(
    async () => (await fetch(appUrl)).ok,
    "the Cognirise website dev server",
  );
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" });
    return response.ok ? response.json() : null;
  }, "a Chromium debugging target");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Fetch.requestPaused") {
      const requestId = message.params.requestId;
      const requestUrl = new URL(message.params.request.url);
      if (requestUrl.pathname.startsWith("/api/")) {
        void call("Fetch.fulfillRequest", {
          requestId,
          responseCode: 502,
          responseHeaders: [
            { name: "Content-Type", value: "application/json" },
            { name: "Cache-Control", value: "no-store" },
          ],
          body: Buffer.from(JSON.stringify({ error: "browser-test-api-outage" })).toString("base64"),
        });
      } else {
        void call("Fetch.continueRequest", { requestId });
      }
      return;
    }
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async (path) => {
    const navigation = await call("Page.navigate", { url: `${appUrl}${path}` });
    assert.ok(!navigation.errorText, `Chromium navigation failed: ${navigation.errorText}`);
    try {
      await waitFor(
        () => evaluate("document.readyState === 'complete' && Boolean(document.querySelector('.co-architecture-stage'))"),
        `architecture page ${path}`,
      );
    } catch (error) {
      const diagnostic = await evaluate(`({
        href: location.href,
        readyState: document.readyState,
        title: document.title,
        text: document.body?.innerText?.slice(0, 500),
        scripts: [...document.scripts].map((script) => script.src),
      })`);
      throw new Error(`${error.message}: ${JSON.stringify(diagnostic)}`);
    }
  };
  const settleAndRectFor = async (expression) => {
    return waitFor(() => evaluate(`(() => {
    const element = ${expression};
    if (!element) return null;
    const settled = element.getBoundingClientRect();
    if (settled.top < 0 || settled.bottom > innerHeight) {
      window.scrollTo({
        top: scrollY + settled.top - (innerHeight - settled.height) / 2,
        behavior: "instant",
      });
      return null;
    }
    const x = settled.left + settled.width / 2;
    const y = settled.top + settled.height / 2;
    const target = document.elementFromPoint(x, y);
    return target === element || element.contains(target) ? { x, y } : null;
  })()`), `a settled hit target for ${expression}`);
  };
  const pointerClick = async (expression) => {
    const point = await settleAndRectFor(expression);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
  };
  const touch = async (expression) => {
    const point = await settleAndRectFor(expression);
    const touchPoints = [{ x: point.x, y: point.y, radiusX: 2, radiusY: 2, force: 1, id: 1 }];
    await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints });
    await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  const press = async (key, code, windowsVirtualKeyCode) => {
    await call("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
      text: key === " " ? " " : "",
      unmodifiedText: key === " " ? " " : "",
    });
    await call("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode,
      nativeVirtualKeyCode: windowsVirtualKeyCode,
    });
  };
  const waitForSelector = (selector) => waitFor(
    () => evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`),
    selector,
  );
  const waitForUrl = (predicate, description) => waitFor(
    async () => predicate(new URL(await evaluate("location.href"))),
    description,
  );
  const experienceButton = `document.querySelector('[data-testid="stage-layer-experience"] .coa-layer-plane')`;
  const experienceApiButton = `[...document.querySelectorAll('.co-component-rail > button')].find((button) => button.textContent.includes('Experience API'))`;
  const layerClose = `document.querySelector('[data-testid="architecture-layer-close"]')`;
  const componentClose = `document.querySelector('[data-testid="architecture-component-close"]')`;

  await call("Page.enable");
  await call("Runtime.enable");
  await call("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] });
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await navigate("/platforms/cognios#architecture");
  await pointerClick(experienceButton);
  await waitForSelector('[data-testid="architecture-layer-close"]');
  await waitForUrl(
    (url) => url.searchParams.get("layer") === "experience" && url.hash === "#architecture",
    "the selected layer URL",
  );

  await pointerClick(experienceApiButton);
  await waitForSelector('[data-testid="architecture-component-close"]');
  await pointerClick(componentClose);
  await waitForUrl(
    (url) => url.searchParams.get("layer") === "experience" && !url.searchParams.has("component") && url.hash === "#architecture",
    "component close to return to the layer",
  );
  await waitFor(
    () => evaluate("document.activeElement?.textContent?.includes('Experience API')"),
    "component focus restoration",
  );

  await pointerClick(experienceApiButton);
  await waitForSelector('[data-testid="architecture-component-close"]');
  await pointerClick(componentClose);
  await waitForUrl((url) => !url.searchParams.has("component"), "rapid in-motion component close");

  await pointerClick(layerClose);
  await waitForUrl(
    (url) => !url.searchParams.has("layer") && !url.searchParams.has("component") && url.hash === "#architecture",
    "layer close to return to the overview",
  );
  await waitFor(
    () => evaluate("document.activeElement?.getAttribute('aria-label') === 'Open Experience layer'"),
    "layer focus restoration",
  );
  assert.equal(await evaluate("document.querySelectorAll('.coa-layer').length"), 6);

  await pointerClick(experienceButton);
  await waitForSelector('[data-testid="architecture-layer-close"]');
  await evaluate(`${layerClose}.focus()`);
  await waitFor(() => evaluate("document.activeElement?.dataset.testid === 'architecture-layer-close'"), "layer X keyboard focus");
  await call("Page.bringToFront");
  await press(" ", "Space", 32);
  await waitForUrl((url) => !url.searchParams.has("layer"), "keyboard layer close");

  await pointerClick(experienceButton);
  await pointerClick(experienceApiButton);
  await waitForSelector('[data-testid="architecture-component-close"]');
  await evaluate(`${componentClose}.focus()`);
  await waitFor(() => evaluate("document.activeElement?.dataset.testid === 'architecture-component-close'"), "component X keyboard focus");
  await press(" ", "Space", 32);
  await waitForUrl((url) => url.searchParams.has("layer") && !url.searchParams.has("component"), "keyboard component close");

  await pointerClick(experienceApiButton);
  await waitForSelector('[data-testid="architecture-component-close"]');
  await press("Escape", "Escape", 27);
  await waitForUrl((url) => url.searchParams.has("layer") && !url.searchParams.has("component"), "Escape from component detail");
  await press("Escape", "Escape", 27);
  await waitForUrl((url) => !url.searchParams.has("layer"), "Escape from layer detail");

  await pointerClick(experienceButton);
  await pointerClick(experienceApiButton);
  await waitForUrl((url) => url.searchParams.has("component"), "component history entry");
  let history = await call("Page.getNavigationHistory");
  await call("Page.navigateToHistoryEntry", { entryId: history.entries[history.currentIndex - 1].id });
  await waitForUrl((url) => url.searchParams.has("layer") && !url.searchParams.has("component"), "browser Back to layer");
  history = await call("Page.getNavigationHistory");
  await call("Page.navigateToHistoryEntry", { entryId: history.entries[history.currentIndex - 1].id });
  await waitForUrl((url) => !url.searchParams.has("layer"), "browser Back to overview");

  await navigate("/platforms/cognios?layer=experience&component=experience-api#architecture");
  await waitForSelector('[data-testid="architecture-component-close"]');
  await pointerClick(componentClose);
  await waitForUrl((url) => url.searchParams.has("layer") && !url.searchParams.has("component"), "direct-linked component close");
  await navigate("/platforms/cognios?layer=experience#architecture");
  await waitForSelector('[data-testid="architecture-layer-close"]');
  await pointerClick(layerClose);
  await waitForUrl((url) => !url.searchParams.has("layer"), "direct-linked layer close");

  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await navigate("/platforms/cognios?layer=experience&component=experience-api#architecture");
  await waitForSelector('[data-testid="architecture-component-close"]');
  assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true);
  await touch(componentClose);
  await waitForUrl((url) => url.searchParams.has("layer") && !url.searchParams.has("component"), "mobile touch component close");
  await call("Emulation.setTouchEmulationEnabled", { enabled: false });
  await call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await navigate("/platforms/cognios?layer=experience#architecture");
  await waitForSelector('[data-testid="architecture-layer-close"]');
  await touch(layerClose);
  await waitForUrl((url) => !url.searchParams.has("layer"), "mobile touch layer close");

  await call("Emulation.setTouchEmulationEnabled", { enabled: false });
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await navigate("/platforms/cognios?layer=experience&component=experience-api#architecture");
  assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
  await pointerClick(componentClose);
  await waitForUrl((url) => !url.searchParams.has("component"), "reduced-motion component close");
  await navigate("/platforms/cognios?layer=experience#architecture");
  await waitForSelector('[data-testid="architecture-layer-close"]');
  await pointerClick(layerClose);
  await waitForUrl((url) => !url.searchParams.has("layer"), "reduced-motion layer close");

  console.log("CogniOS browser regression passed: pointer, touch, keyboard, Escape, Back, direct-link, focus, anchor, and reduced motion.");
} finally {
  socket?.close();
  await Promise.all([stopProcess(vite), stopProcess(browser)]);
  await waitFor(async () => {
    try {
      await rm(profileDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      if (error?.code === "ENOTEMPTY" || error?.code === "EBUSY") return false;
      throw error;
    }
  }, "Chromium profile cleanup", 5_000);
}