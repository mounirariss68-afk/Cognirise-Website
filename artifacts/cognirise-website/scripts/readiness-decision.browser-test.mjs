import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9341;
const profilePath = `/tmp/cognirise-readiness-browser-test-${process.pid}`;
const conditionIds = ["stability", "access", "observability", "fallback", "exceptions", "economics"];
let createdRecord = null;

await rm(profilePath, { recursive: true, force: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--window-size=1440,900",
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
const pausedRequests = [];
const pausedRequestWaiters = [];
let commandId = 0;

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Fetch.requestPaused") {
    const waiter = pausedRequestWaiters.shift();
    if (waiter) waiter(message.params);
    else pausedRequests.push(message.params);
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

function waitForPausedRequest() {
  if (pausedRequests.length > 0) return Promise.resolve(pausedRequests.shift());
  return Promise.race([
    new Promise((resolve) => pausedRequestWaiters.push(resolve)),
    delay(5000).then(() => {
      throw new Error("Timed out waiting for a paused readiness API request");
    }),
  ]);
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

async function pressSpace() {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: " ",
    code: "Space",
    windowsVirtualKeyCode: 32,
    nativeVirtualKeyCode: 32,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: " ",
    code: "Space",
    windowsVirtualKeyCode: 32,
    nativeVirtualKeyCode: 32,
  });
}

async function selectWithKeyboard(conditionId, answer) {
  const selector = `[data-readiness-answer="${conditionId}:${answer}"]`;
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus(); true`);
  await pressSpace();
  await delay(50);
  assert.equal(
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute("aria-checked")`),
    "true",
    `${conditionId} ${answer} should be keyboard selectable`,
  );
}

async function decisionState() {
  return evaluate(`(() => {
    const panel = document.querySelector("[data-readiness-decision]");
    const rect = panel.getBoundingClientRect();
    return {
      text: panel.innerText,
      position: getComputedStyle(panel).position,
      visible: rect.top < innerHeight && rect.bottom > 0,
      unresolved: [...document.querySelectorAll("[data-readiness-unresolved]")]
        .map((element) => element.getAttribute("data-readiness-unresolved")),
    };
  })()`);
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", {
    url: `${baseUrl}/methodologies/agentic-operations-readiness`,
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(`document.readyState === "complete"
      && location.pathname === "/methodologies/agentic-operations-readiness"
      && document.querySelectorAll("[data-readiness-answer]").length === 18`);
    if (ready) break;
    if (attempt === 79) throw new Error("Readiness route did not become interactive");
    await delay(100);
  }

  let state = await decisionState();
  assert.match(state.text, /Current decision · 0\/6 answered[\s\S]*Prepare/i);
  assert.deepEqual(state.unresolved, conditionIds);

  await evaluate(`document.querySelector("[data-readiness-decision]").scrollIntoView({ block: "end" }); true`);
  await delay(100);
  state = await decisionState();
  assert.equal(state.position, "sticky");
  assert.equal(state.visible, true, "The current decision should remain visible while assessing conditions");

  await selectWithKeyboard("stability", "prepare");
  state = await decisionState();
  assert.match(state.text, /Current decision · 1\/6 answered[\s\S]*Prepare/i);
  assert.deepEqual(state.unresolved, conditionIds);

  await selectWithKeyboard("stability", "ready");
  state = await decisionState();
  assert.equal(state.unresolved.includes("stability"), false, "A Ready answer should remove its unresolved condition");

  for (const conditionId of conditionIds.slice(1)) {
    await selectWithKeyboard(conditionId, "ready");
  }
  state = await decisionState();
  assert.match(state.text, /Current decision · 6\/6 answered[\s\S]*Proceed/i);
  assert.deepEqual(state.unresolved, []);

  await selectWithKeyboard("economics", "stop");
  state = await decisionState();
  assert.match(state.text, /Current decision · 6\/6 answered[\s\S]*Stop/i);
  assert.deepEqual(state.unresolved, ["economics"]);

  await send("Fetch.enable", {
    patterns: [{
      urlPattern: "*api/public/readiness-assessments*",
      requestStage: "Request",
    }],
  });
  await evaluate(`document.querySelector("[data-readiness-save]").click(); true`);
  const saveRequest = await waitForPausedRequest();
  assert.equal(saveRequest.request.method, "POST");

  const saveLock = await evaluate(`(() => {
    const answers = [...document.querySelectorAll("[data-readiness-answer]")];
    const reset = document.querySelector('[data-testid="button-reset-assessment"]');
    answers.find((element) => element.dataset.readinessAnswer === "economics:ready").click();
    reset.click();
    return {
      disabledAnswers: answers.filter((element) => element.disabled).length,
      resetDisabled: reset.disabled,
      economicsStopSelected: document.querySelector('[data-readiness-answer="economics:stop"]').getAttribute("aria-checked"),
      answered: answers.filter((element) => element.getAttribute("aria-checked") === "true").length,
    };
  })()`);
  assert.deepEqual(saveLock, {
    disabledAnswers: 18,
    resetDisabled: true,
    economicsStopSelected: "true",
    answered: 6,
  }, "Answer edits and reset should be locked while a save response is pending");

  await send("Fetch.continueRequest", { requestId: saveRequest.requestId });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const saved = await evaluate(`location.search.includes("readiness=")
      && document.body.innerText.includes("Decision saved")`);
    if (saved) break;
    if (attempt === 49) throw new Error("Saved readiness decision did not finish");
    await delay(100);
  }

  const sharedRecord = await evaluate(`(() => {
    const id = new URLSearchParams(location.search).get("readiness");
    return {
      id,
      token: localStorage.getItem("cognirise:readiness-delete:" + id),
      url: location.href,
    };
  })()`);
  createdRecord = sharedRecord;
  assert.match(sharedRecord.id, /^[0-9a-f-]{36}$/);
  assert.ok(sharedRecord.token, "The creator browser should retain the deletion token");
  assert.equal(sharedRecord.url.includes(sharedRecord.token), false, "The share URL must not expose the deletion token");

  await evaluate(`document.querySelector('[data-testid="button-delete-readiness-record"]').click(); true`);
  const deleteRequest = await waitForPausedRequest();
  assert.equal(deleteRequest.request.method, "DELETE");
  const deleteLock = await evaluate(`(() => {
    const answers = [...document.querySelectorAll("[data-readiness-answer]")];
    const reset = document.querySelector('[data-testid="button-reset-assessment"]');
    answers.find((element) => element.dataset.readinessAnswer === "economics:ready").click();
    reset.click();
    return {
      disabledAnswers: answers.filter((element) => element.disabled).length,
      resetDisabled: reset.disabled,
      saveVisible: Boolean(document.querySelector("[data-readiness-save]")),
      economicsStopSelected: document.querySelector('[data-readiness-answer="economics:stop"]').getAttribute("aria-checked"),
    };
  })()`);
  assert.deepEqual(deleteLock, {
    disabledAnswers: 18,
    resetDisabled: true,
    saveVisible: false,
    economicsStopSelected: "true",
  }, "Answer edits, reset, and a subsequent save should be locked while deletion is pending");
  await send("Fetch.continueRequest", { requestId: deleteRequest.requestId });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const removed = await evaluate(`!location.search.includes("readiness=")
      && document.body.innerText.includes("Saved record deleted")`);
    if (removed) break;
    if (attempt === 49) throw new Error("Saved readiness decision did not delete");
    await delay(100);
  }
  createdRecord = null;

  await selectWithKeyboard("economics", "ready");
  await evaluate(`document.querySelector("[data-readiness-save]").click(); true`);
  const replacementSaveRequest = await waitForPausedRequest();
  assert.equal(replacementSaveRequest.request.method, "POST");
  await send("Fetch.continueRequest", { requestId: replacementSaveRequest.requestId });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const saved = await evaluate(`location.search.includes("readiness=")
      && document.body.innerText.includes("Decision saved")`);
    if (saved) break;
    if (attempt === 49) throw new Error("Replacement readiness decision did not save");
    await delay(100);
  }
  const replacementRecord = await evaluate(`(() => {
    const id = new URLSearchParams(location.search).get("readiness");
    return {
      id,
      token: localStorage.getItem("cognirise:readiness-delete:" + id),
      url: location.href,
    };
  })()`);
  createdRecord = replacementRecord;

  await evaluate(`localStorage.removeItem("cognirise:readiness-delete:" + ${JSON.stringify(replacementRecord.id)}); true`);
  await send("Page.navigate", { url: replacementRecord.url });
  const loadRequest = await waitForPausedRequest();
  assert.equal(loadRequest.request.method, "GET");

  const loadLock = await evaluate(`(() => {
    const answers = [...document.querySelectorAll("[data-readiness-answer]")];
    answers.find((element) => element.dataset.readinessAnswer === "stability:stop").click();
    return {
      disabledAnswers: answers.filter((element) => element.disabled).length,
      selectedAnswers: answers.filter((element) => element.getAttribute("aria-checked") === "true").length,
      resetVisible: Boolean(document.querySelector('[data-testid="button-reset-assessment"]')),
    };
  })()`);
  assert.deepEqual(loadLock, {
    disabledAnswers: 18,
    selectedAnswers: 0,
    resetVisible: false,
  }, "Answer edits should be locked from the first render while a saved decision is loading");

  await send("Fetch.continueRequest", { requestId: loadRequest.requestId });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const reopened = await evaluate(`document.body.innerText.includes("Saved decision reopened")
      && document.querySelectorAll('[data-readiness-answer][aria-checked="true"]').length === 6`);
    if (reopened) break;
    if (attempt === 49) throw new Error("Shared readiness decision did not reopen");
    await delay(100);
  }
  state = await decisionState();
  assert.match(state.text, /Current decision · 6\/6 answered[\s\S]*Proceed/i);
  assert.deepEqual(state.unresolved, []);
  assert.equal(
    await evaluate(`document.querySelector('[data-readiness-answer="economics:ready"]').getAttribute("aria-checked")`),
    "true",
  );
  assert.equal(
    await evaluate(`document.body.innerText.includes("Delete saved record")`),
    false,
    "A second browser without the token must not be offered deletion",
  );

  const deleted = await fetch(`${baseUrl}/api/public/readiness-assessments/${replacementRecord.id}`, {
    method: "DELETE",
    headers: {
      Origin: new URL(baseUrl).origin,
      "Sec-Fetch-Site": "same-origin",
      "X-Delete-Token": replacementRecord.token,
    },
  });
  assert.equal(deleted.status, 204);
  createdRecord = null;
  const afterDelete = await fetch(`${baseUrl}/api/public/readiness-assessments/${replacementRecord.id}`);
  assert.equal(afterDelete.status, 404);

  console.log("Readiness save, share, reopen, and delayed lifecycle race regression passed");
} finally {
  if (createdRecord?.id && createdRecord?.token) {
    await fetch(`${baseUrl}/api/public/readiness-assessments/${createdRecord.id}`, {
      method: "DELETE",
      headers: {
        Origin: new URL(baseUrl).origin,
        "Sec-Fetch-Site": "same-origin",
        "X-Delete-Token": createdRecord.token,
      },
    }).catch(() => {});
  }
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {
    // Chromium child processes can briefly retain profile files after the tested page has closed.
  });
}