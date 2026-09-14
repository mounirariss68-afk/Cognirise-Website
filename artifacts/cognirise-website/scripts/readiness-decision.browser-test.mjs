import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9341;
const profilePath = `/tmp/cognirise-readiness-browser-test-${process.pid}`;
const conditionIds = ["stability", "access", "observability", "fallback", "exceptions", "economics"];

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

  const hasCreateControl = await evaluate(`Boolean(document.querySelector("[data-readiness-save]"))`);
  assert.equal(hasCreateControl, false, "Anonymous readiness creation should not be offered");

  const retiredResponse = await evaluate(`fetch("/api/public/readiness-assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answers: {
        stability: "ready",
        access: "prepare",
        observability: "ready",
        fallback: "ready",
        exceptions: "stop",
        economics: "ready",
      },
    }),
  }).then(async (response) => ({
    status: response.status,
    body: await response.json(),
  }))`);
  assert.equal(retiredResponse.status, 410);
  assert.match(retiredResponse.body.error, /anonymous readiness saves are no longer available/i);

  console.log("Readiness decision and retired anonymous creation regression passed");
} finally {
  socket.close();
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {
    // Chromium child processes can briefly retain profile files after the tested page has closed.
  });
}