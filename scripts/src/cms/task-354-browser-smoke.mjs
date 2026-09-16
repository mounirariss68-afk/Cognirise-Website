/**
 * Task 354 maintained browser smoke journey.
 *
 * This deliberately uses Chromium's CDP endpoint rather than Playwright.  It
 * drives the same rendered admin controls a person uses; the fixture command
 * remains responsible for the disposable schema, proxy, and cleanup guards.
 *
 * The expensive journey is opt-in.  Do not run it from the normal test suite.
 */
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const stateFile = process.env.TASK_354_STATE;
const origin = process.env.TASK_354_ORIGIN ?? "http://127.0.0.1:80";
const chromium = process.env.CHROMIUM_PATH ?? "/repl/tools/bin/chromium";
if (!stateFile) throw new Error("TASK_354_STATE must point at the private Task 345 state file");
const state = JSON.parse(await readFile(stateFile, "utf8"));
assert.equal(state.phase, "ready", "fixture must be ready");
assert.match(state.prefix, /^fixture-cms-task-345-/);
assert.ok(state.schema.startsWith("task345_"), "fixture schema is isolated");

function code(secret) {
  const counter = Math.floor(Date.now() / 30_000);
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64BE(BigInt(counter));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const raw = secret.toUpperCase().replace(/=+$/, "");
  let bits = 0; let value = 0; let decoded = "";
  for (const char of raw) {
    value = (value << 5) | alphabet.indexOf(char); bits += 5;
    if (bits >= 8) { decoded += String.fromCharCode((value >> (bits -= 8)) & 255); }
  }
  const digest = createHmac("sha1", Buffer.from(decoded, "binary")).update(bytes).digest();
  const offset = digest.at(-1) & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
const user = (label) => state.users.find((item) => item.label === label);
assert.ok(user("author") && user("reviewer") && user("publisher"));
// Platform has a short, valid summary field and exercises the generic editor.
const document = state.documents.find((item) => item.kind === "platform") ?? state.documents[0];
assert.ok(document?.ksaRevisionId && document.uaeRevisionId);
const profilePath = `/tmp/task-354-cdp-${process.pid}`;
const targetToken = randomUUID();
const initialUrl = `data:text/html,<title>${targetToken}</title>`;
const debuggingPort = await new Promise((resolve, reject) => {
  const reservation = createServer();
  reservation.once("error", reject);
  reservation.listen(0, "127.0.0.1", () => {
    const address = reservation.address();
    if (!address || typeof address === "string") {
      reservation.close();
      reject(new Error("Could not reserve a Chromium debugging port"));
      return;
    }
    reservation.close((error) => error ? reject(error) : resolve(address.port));
  });
});
await rm(profilePath, { recursive: true, force: true });
const browser = spawn(chromium, [
  "--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profilePath}`, initialUrl,
], { stdio: "ignore" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    try {
      target = (await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((r) => r.json()))
        .find((item) => item.type === "page" && item.title === targetToken);
    } catch {}
    if (!target) await pause(100);
  }
  assert.ok(target, "Chromium must expose a page target");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => { socket.onopen = resolve; });
  let id = 0; const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.error ? waiter[1](new Error(message.error.message)) : waiter[0](message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, [resolve, reject]); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result?.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 120; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  const clickText = (text) => evaluate(`(() => {
    const expected = ${JSON.stringify(text)}.toLocaleLowerCase();
    const node = [...document.querySelectorAll('button,a,[role="button"]')].find((item) =>
      item.textContent?.trim().toLocaleLowerCase().includes(expected));
    if (!node) throw new Error("Missing UI control: " + ${JSON.stringify(text)});
    node.click(); return true;
  })()`);
  const logout = async () => {
    await waitFor("document.querySelector('[data-testid=\"account-menu-trigger\"]')");
    await evaluate("document.querySelector('[data-testid=\"account-menu-trigger\"]').click()");
    await waitFor(`[...document.querySelectorAll('[role="menuitem"]')].some((item) => item.textContent.includes('Log out'))`);
    await clickText("Log out");
    await waitFor("location.pathname === '/admin/' || location.pathname === '/admin'");
  };
  const login = async (label) => {
    const account = user(label);
    await send("Page.navigate", { url: `${origin}/admin/` });
    await waitFor("document.querySelector('input[name=\"email\"][autocomplete=\"email\"]')");
    await fill("input[name=\"email\"][autocomplete=\"email\"]", account.email);
    await fill("input[type=password]", account.password);
    await clickText("Sign in");
    await waitFor("document.querySelector('input[inputmode=\"numeric\"],input[autocomplete=\"one-time-code\"]')");
    await fill("input[inputmode=\"numeric\"],input[autocomplete=\"one-time-code\"]", code(account.totpSecret));
    await clickText("Verify");
    await waitFor("location.pathname === '/admin/dashboard'");
  };
  const fill = (selector, value) => evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) throw new Error("Missing field: " + ${JSON.stringify(selector)});
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event("input", {bubbles:true}));
    input.dispatchEvent(new Event("change", {bubbles:true}));
  })()`);
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  // Ordinary auth and MFA: no manufactured session and no email transport.
  await login("author");

  // Edit KSA only, submit the exact revision, and leave UAE untouched.
  await send("Page.navigate", { url: `${origin}/admin/content/${document.id}?market=ksa&locale=en` });
  await waitFor("document.querySelector('#document-summary')");
  const marker = `${state.prefix}-task354-marker`;
  const editor = await evaluate(`document.querySelector('#document-summary')?.outerHTML`);
  assert.ok(editor, "generic editor must expose the Summary field");
  await evaluate(`(() => {
    const node = document.querySelector('#document-summary');
    node.focus();
    node.select();
    return document.activeElement === node;
  })()`);
  await send("Input.insertText", { text: marker });
  await waitFor(`document.querySelector('#document-summary').value === ${JSON.stringify(marker)}`);
  await waitFor("document.querySelector('#save-draft:not([disabled])')");
  await evaluate("document.querySelector('#save-draft').click()");
  await waitFor("document.body.textContent.includes('KSA edition saved successfully')");
  await clickText("Submit for review");
  await waitFor("document.body.textContent.includes('Revision submitted and routed for independent review')");
  await waitFor(`!document.querySelector('#submit-review') || document.querySelector('#submit-review').textContent.includes('Route review')`);
  if (await evaluate(`document.querySelector('#submit-review')?.textContent.includes('Route review')`)) {
    await clickText("Route review");
    await waitFor("!document.querySelector('#submit-review')");
  }

  // The independent reviewer approves the exact KSA revision in the UI.
  await logout(); await login("reviewer");
  await send("Page.navigate", { url: `${origin}/admin/editorial-work` });
  await waitFor("document.body.textContent.includes('Approve revision')");
  await clickText("Approve revision");
  await waitFor("document.body.textContent.includes('Approve exact revision')");
  await clickText("Confirm decision");
  await waitFor("!document.body.textContent.includes('Approve exact revision')");

  // Publisher first publishes the content prerequisite, then approves and
  // releases destination visibility through the reviewed confirmation dialog.
  await logout(); await login("publisher");
  await send("Page.navigate", { url: `${origin}/admin/content/${document.id}?market=ksa&locale=en` });
  await waitFor("document.querySelector('#document-summary')");
  await clickText("Publish...");
  await waitFor("document.querySelector('[role=\"dialog\"]')");
  await clickText("Confirm Publish");
  await waitFor("document.body.textContent.includes('Selected customization published')");
  await clickText("Regions");
  await clickText("Approve destination visibility");
  await waitFor("document.body.textContent.includes('Destination visibility approved')");
  await waitFor("document.querySelector('[data-testid=\"button-publish-reviewed-destinations\"]')");
  await clickText("Publish reviewed visibility");
  await waitFor("document.querySelector('[data-testid=\"button-confirm-publish-reviewed-destinations\"]')");
  await clickText("Confirm visibility release");
  await waitFor("document.body.textContent.includes('Reviewed destinations published')");

  // Public assertions are read-only and prove destination isolation.
  const publicPath = (market, slug = document.slug) =>
    `${origin}/api/public/content/${market}/en/${document.kind}/${slug}`;
  const publicKsa = await fetch(publicPath("ksa", `${document.slug}-ksa`)).then((r) => r.json());
  const publicUae = await fetch(publicPath("uae")).then((r) => r.json());
  const publicOff = await fetch(publicPath("europe"));
  assert.match(JSON.stringify(publicKsa), new RegExp(marker));
  assert.equal(publicUae.revisionId, document.uaeRevisionId);
  assert.match(JSON.stringify(publicUae), new RegExp(`Disposable Task 345 ${document.kind} summary`));
  assert.doesNotMatch(JSON.stringify(publicUae), new RegExp(marker));
  assert.equal(publicOff.status, 404);
  console.log("PASS Task 354 CDP smoke: KSA marker released; UAE and disabled geography preserved");
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await rm(profilePath, { recursive: true, force: true }).catch(() => undefined);
}