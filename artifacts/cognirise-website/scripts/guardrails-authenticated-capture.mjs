import { createHmac } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Narrow visual capture for the real, MFA-protected Guardrails CMS preview.
 * This is intentionally not a page-journey or interaction test: after the
 * normal login/MFA exchange it only changes viewport size, scroll position,
 * and captures the already-rendered hero and three named sections.
 *
 * Credentials and capability files must remain private mode-600 files below
 * /tmp.  Never print their contents, preview URLs, cookies, or MFA codes.
 *
 * Example:
 *   node artifacts/cognirise-website/scripts/guardrails-authenticated-capture.mjs \
 *     --credentials=/tmp/cognirise-guardrails-screenshot-fixture.json \
 *     --preview-file=/tmp/cognirise-guardrails-screenshot-preview.json
 *
 * The managed development website/API must already be running. This script
 * does not start or restart an application workflow.
 */

const args = process.argv.slice(2);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../../..");
const defaultOutputDirectory = resolve(repositoryRoot, "screenshots/guardrails-pulse-correction");
const browserPath = option("--chromium", process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium");
const baseUrl = option("--base-url", process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80").replace(/\/+$/, "");
const credentialsPath = option("--credentials", "/tmp/cognirise-guardrails-screenshot-fixture.json");
const previewFile = option("--preview-file", "/tmp/cognirise-guardrails-screenshot-preview.json");
const outputDirectory = resolve(option("--output-dir", defaultOutputDirectory));
const debugPort = Number(option("--debug-port", process.env.GUARDRAILS_CAPTURE_DEBUG_PORT || "9398"));
const timeout = 45_000;

function option(name, fallback) {
  const inline = args.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) return args[index + 1];
  return fallback;
}

function requirePrivatePath(filePath, description) {
  const resolved = resolve(filePath);
  if (resolved === "/tmp" || !resolved.startsWith("/tmp/")) {
    throw new Error(`${description} must be a regular file below /tmp.`);
  }
  return resolved;
}

async function readPrivateJson(filePath, description) {
  const resolved = requirePrivatePath(filePath, description);
  const file = await stat(resolved);
  if (!file.isFile() || (file.mode & 0o777) !== 0o600) {
    throw new Error(`${description} must be an owned regular mode-600 file.`);
  }
  if (typeof process.getuid === "function" && file.uid !== process.getuid()) {
    throw new Error(`${description} must be owned by the current user.`);
  }
  return JSON.parse(await readFile(resolved, "utf8"));
}

function fixtureAdministrator(value) {
  const administrator = value?.version === 1 && value?.phase === "ready" && Array.isArray(value.users)
    ? value.users.find((user) => user.role === "administrator")
    : value;
  if (
    typeof administrator?.email !== "string"
    || typeof administrator?.password !== "string"
    || typeof administrator?.totpSecret !== "string"
  ) {
    throw new Error("Credentials file does not contain an enrolled administrator.");
  }
  return administrator;
}

function previewCapability(value) {
  if (
    typeof value?.previewUrl !== "string"
    || !/^\/preview\/[^/]+$/.test(value.previewUrl)
  ) {
    throw new Error("Preview file does not contain a private capability path.");
  }
  return value.previewUrl;
}

function base32Decode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let buffer = 0;
  const output = [];
  for (const character of normalized) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("The fixture TOTP secret is not valid base32.");
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >>> bits) & 0xff);
    }
  }
  return Buffer.from(output);
}

function totp(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const number = (
    ((digest[offset] & 0x7f) << 24)
    | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8)
    | digest[offset + 3]
  ) % 1_000_000;
  return String(number).padStart(6, "0");
}

const pause = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

let socket;
let commandId = 0;
let browser;
let browserExit;
const pending = new Map();

async function pageTarget() {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      const target = targets.find((entry) => entry.type === "page");
      if (target) return target;
    } catch {
      // Chromium is still starting.
    }
    await pause(100);
  }
  throw new Error("Chromium did not expose a page target.");
}

function send(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP command timed out: ${method}`));
    }, timeout);
    pending.set(id, { resolve: resolvePromise, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser page evaluation failed.");
  }
  return result.result.value;
}

async function waitFor(expression, description) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await pause(100);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

async function authenticateInBrowser(administrator) {
  const email = JSON.stringify(administrator.email);
  const password = JSON.stringify(administrator.password);
  const login = await evaluate(`(async () => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({email: ${email}, password: ${password}}),
    });
    return {
      ok: response.ok,
      status: response.status,
      payload: await response.json().catch(() => ({})),
    };
  })()`);
  if (!login?.ok || typeof login.payload?.mfaChallenge?.id !== "string") {
    throw new Error(`CMS login did not issue an MFA challenge (${login?.status ?? "no response"}).`);
  }

  const challengeId = JSON.stringify(login.payload.mfaChallenge.id);
  const code = JSON.stringify(totp(administrator.totpSecret));
  const verified = await evaluate(`(async () => {
    const response = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      credentials: "include",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({challengeId: ${challengeId}, code: ${code}}),
    });
    return {
      ok: response.ok,
      status: response.status,
      payload: await response.json().catch(() => ({})),
    };
  })()`);
  if (!verified?.ok || verified.payload?.authenticated !== true) {
    throw new Error(`CMS MFA verification failed (${verified?.status ?? "no response"}).`);
  }
}

async function capture(fileName) {
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(resolve(outputDirectory, fileName), Buffer.from(screenshot.data, "base64"));
}

async function waitForRenderedPreview() {
  await waitFor(`(() => document.readyState === "complete"
    && Boolean(document.querySelector("[data-guardrails-page]"))
    && Boolean(document.querySelector("[data-guardrails-section='overview']"))
    && Boolean(document.querySelector("[data-guardrails-section='layers']"))
    && Boolean(document.querySelector("[data-guardrails-section='lifecycle']")))()`, "Guardrails draft preview");
  await evaluate(`(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolvePromise) => {
        image.addEventListener("load", resolvePromise, {once: true});
        image.addEventListener("error", resolvePromise, {once: true});
      })));
    await new Promise((resolvePromise) => requestAnimationFrame(() => requestAnimationFrame(resolvePromise)));
  })()`);
}

async function setViewport(width, height, mobile) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    mobile,
    deviceScaleFactor: 1,
  });
  // The visual/layout viewport values can lag the CDP emulation event,
  // especially when switching a loaded page into mobile mode. The screenshot
  // command honors the requested metrics, so allow one render turn instead of
  // making capture depend on a page-reported viewport value.
  await pause(250);
  await evaluate("window.scrollTo(0, 0); true");
  await pause(250);
}

async function captureViewportSet(label, width, height, mobile) {
  await setViewport(width, height, mobile);
  const layout = await evaluate(`(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const offenders = [...document.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          className: typeof element.className === "string" ? element.className.slice(0, 160) : null,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((element) => element.left < -1 || element.right > viewportWidth + 1)
      .slice(0, 20);
    return {innerWidth: viewportWidth, scrollWidth: documentWidth, offenders};
  })()`);
  await capture(`hero-${label}-${width}x${height}.png`);
  for (const [section, fileLabel] of [
    ["overview", "action-map"],
    ["layers", "layers"],
    ["lifecycle", "lifecycle"],
  ]) {
    await evaluate(`(() => {
      const section = document.querySelector("[data-guardrails-section='${section}']");
      section?.scrollIntoView({block: "start", inline: "nearest"});
      return Boolean(section);
    })()`);
    await pause(250);
    await capture(`${fileLabel}-${label}-${width}x${height}.png`);
  }
  return layout;
}

async function run() {
  const administrator = fixtureAdministrator(await readPrivateJson(credentialsPath, "Credentials"));
  const previewMetadata = await readPrivateJson(previewFile, "Preview capability");
  const previewUrl = previewCapability(previewMetadata);
  await mkdir(outputDirectory, {recursive: true});

  const profilePath = `/tmp/cognirise-guardrails-capture-${process.pid}`;
  await rm(profilePath, {recursive: true, force: true});
  browser = spawn(browserPath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1440,1000",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profilePath}`,
    "about:blank",
  ], {stdio: "ignore"});
  browserExit = new Promise((resolvePromise) => browser.once("exit", resolvePromise));

  try {
    const target = await pageTarget();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolvePromise, reject) => {
      socket.onopen = resolvePromise;
      socket.onerror = reject;
    });
    socket.onmessage = ({data}) => {
      const message = JSON.parse(data);
      if (!message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timer);
      message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
    };
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", {url: `${baseUrl}/admin/`});
    await waitFor("document.readyState === 'complete'", "CMS origin");
    await authenticateInBrowser(administrator);
    await send("Page.navigate", {url: `${baseUrl}${previewUrl}`});
    await waitForRenderedPreview();
    const layoutMetrics = {
      desktop: await captureViewportSet("desktop", 1440, 1000, false),
      mobile: await captureViewportSet("mobile", 390, 1000, true),
    };
    await writeFile(
      resolve(outputDirectory, "capture-manifest.json"),
      `${JSON.stringify({
        captureMode: "authenticated-mfa-cms-preview",
        capturedAt: new Date().toISOString(),
        revisionId: typeof previewMetadata.revisionId === "string" ? previewMetadata.revisionId : null,
        revisionNumber: typeof previewMetadata.revisionNumber === "number" ? previewMetadata.revisionNumber : null,
        viewports: [
          {label: "desktop", width: 1440, height: 1000},
          {label: "mobile", width: 390, height: 1000},
        ],
        sections: ["hero", "action-map", "layers", "lifecycle"],
        layoutMetrics,
        files: [
          "hero-desktop-1440x1000.png",
          "action-map-desktop-1440x1000.png",
          "layers-desktop-1440x1000.png",
          "lifecycle-desktop-1440x1000.png",
          "hero-mobile-390x1000.png",
          "action-map-mobile-390x1000.png",
          "layers-mobile-390x1000.png",
          "lifecycle-mobile-390x1000.png",
        ],
      }, null, 2)}\n`,
    );
    console.log(`Guardrails authenticated draft captures written to ${outputDirectory}.`);
  } finally {
    for (const request of pending.values()) request.reject(new Error("Browser capture stopped."));
    socket?.close();
    browser?.kill("SIGTERM");
    if (browserExit) await Promise.race([browserExit, pause(5_000)]);
    await rm(profilePath, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Guardrails capture failed."}\n`);
  process.exitCode = 1;
});