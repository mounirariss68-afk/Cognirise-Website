import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

// Narrow real-browser check of the production window helpers, without CMS data.
const source = await readFile(new URL("../src/pages/documents/DocumentDetail.tsx", import.meta.url), "utf8");
const helpers = ts.transpileModule(
  source.slice(source.indexOf("function isClosedPreviewWindow"), source.indexOf("// hint: Logic changed on both sides.", source.indexOf("function isClosedPreviewWindow"))),
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText;
const received = [];
const server = createServer((req, res) => {
  received.push({ path: req.url, referrer: req.headers.referer });
  res.setHeader("Content-Type", "text/html");
  res.end("<!doctype html><body>Window probe</body>");
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), "preview-window-"));
const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  "--remote-debugging-port=9348", `--user-data-dir=${profile}`, origin,
], { stdio: "ignore" }); // Deliberately no --disable-popup-blocking.
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      target = (await (await fetch("http://127.0.0.1:9348/json/list")).json()).find(item => item.type === "page");
    } catch {}
    if (!target) await delay(100);
  }
  assert.ok(target, "Chromium must expose a target");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map();
  let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const callback = pending.get(message.id);
    if (!callback) return;
    pending.delete(message.id);
    message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result);
  };
  const send = (method, params) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, result.exceptionDetails?.text);
    return result.result.value;
  };
  for (let i = 0; i < 50; i++) {
    if (await evaluate(`location.origin === '${origin}' && document.readyState === 'complete'`)) break;
    await delay(100);
  }
  await evaluate(`${helpers}
    document.body.innerHTML='<button style="position:fixed;left:0;top:0;width:200px;height:100px">Preview</button>';
    document.querySelector('button').onclick=()=>{
      window.reserved=reservePreviewWindow();
      window.isolated=window.reserved?.opener===null;
      setTimeout(()=>window.navigated=navigateReservedPreview(window.reserved, '${origin}/protected'),6500);
    };`);
  await delay(200);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 40, y: 40, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 40, y: 40, button: "left", clickCount: 1 });
  await delay(7500);
  assert.equal(await evaluate("window.isolated"), true);
  assert.equal(await evaluate("window.navigated"), true);
  assert.equal(received.find(item => item.path === "/protected")?.referrer, undefined);
  assert.ok(received.some(item => item.path === "/protected"));
  assert.equal(await evaluate("window.reserved.document.referrer"), "");
  await evaluate("window.reserved.close()");
  await evaluate(`document.querySelector('button').onclick=()=>setTimeout(()=>window.oldPopup=window.open('${origin}/old', '_blank', 'noopener,noreferrer'),6500)`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 40, y: 40, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 40, y: 40, button: "left", clickCount: 1 });
  await delay(7500);
  assert.ok(!received.some(item => item.path === "/old"), "Original delayed popup must be blocked");
  console.log("PASS: original delayed popup blocked; reserved preview navigates after delay with no opener and no referrer.");
} finally {
  socket?.close();
  browser.kill();
  server.close();
  await delay(300);
  await rm(profile, { recursive: true, force: true });
}