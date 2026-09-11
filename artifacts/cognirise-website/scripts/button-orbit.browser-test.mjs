import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

// Run with website + API workflows serving the managed proxy.
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const port = 9357;
const profile = `/tmp/pulse-orbit-${process.pid}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  "--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
let socket;
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      target = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()))
        .find((item) => item.type === "page");
    } catch { /* Wait for Chromium. */ }
    if (!target) await delay(100);
  }
  assert.ok(target, "Chromium page available");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => { socket.onopen = resolve; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const result = JSON.parse(data);
    const entry = pending.get(result.id);
    if (!entry) return;
    pending.delete(result.id);
    clearTimeout(entry.timer);
    if (result.error) entry.reject(new Error(result.error.message));
    else entry.resolve(result.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 15000);
    pending.set(key, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: key, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const pointer = (x, y) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [
    { name: "hover", value: "hover" }, { name: "pointer", value: "fine" },
    { name: "prefers-reduced-motion", value: "no-preference" },
  ] });
  await send("Page.navigate", { url: baseUrl });
  let found = false;
  for (let i = 0; i < 100 && !found; i++) {
    found = await evaluate(`!!document.querySelector('.pulse-action-icon')`);
    if (!found) await delay(100);
  }
  assert.ok(found, "Live website renders shared buttons");
  // Isolate a copy of the real button from page entrance/scroll animations.
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('.pulse-action')].find(el => el.getBoundingClientRect().width > 0).cloneNode(true);
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:0;z-index:99999;background:white;padding:100px';
    button.id = 'orbit-test'; button.removeAttribute('href');
    button.style.setProperty('display', 'inline-flex', 'important');
    button.tabIndex = 0; panel.append(button); document.body.append(panel);
    window.orbitSample = () => {
      const circle = button.querySelector('.pulse-action-icon');
      const c = getComputedStyle(circle), d = getComputedStyle(circle, '::after');
      const angle = parseFloat(d.rotate);
      const matrix = new DOMMatrix().rotate(angle);
      const [ox, oy] = d.transformOrigin.split(' ').map(parseFloat);
      const w = parseFloat(d.width), h = parseFloat(d.height);
      const dx = parseFloat(d.left) + ox + matrix.a * (w/2-ox) + matrix.c * (h/2-oy) + matrix.e - circle.clientWidth/2;
      const dy = parseFloat(d.top) + oy + matrix.b * (w/2-ox) + matrix.d * (h/2-oy) + matrix.f - circle.clientHeight/2;
      return { left: parseFloat(c.left), angle,
        radius: Math.hypot(dx,dy), arrow: getComputedStyle(circle.querySelector('svg')).transform,
        focus: button.matches(':focus-visible'), shadow: getComputedStyle(button).boxShadow };
    };
    window.orbitFrames = (duration) => new Promise(resolve => {
      const samples = [], start = performance.now();
      const frame = () => { samples.push(window.orbitSample());
        if(performance.now()-start < duration) requestAnimationFrame(frame); else resolve(samples); };
      requestAnimationFrame(frame);
    });
  })()`);
  const sample = () => evaluate("orbitSample()");
  const motion = async (x, y, duration = 550) => {
    const frames = evaluate(`orbitFrames(${duration})`);
    await pointer(x, y);
    return frames;
  };
  const check = (frames, end, direction) => {
    assert.ok(frames.some((s) => s.angle < -2 && s.angle > -358), "intermediate orbital frames");
    for (let i = 0; i < frames.length; i++) {
      const s = frames[i];
      assert.ok(Math.abs(s.radius - Math.hypot(11.5,11.5)) < .02, "constant circle-centered radius");
      assert.equal(s.arrow, "none", "arrow remains upright");
      assert.ok(Math.abs(s.angle / -360 - s.left / end) < .003, `orbit synchronized with travel: ${JSON.stringify({ s, end })}`);
      if (i) assert.ok((s.angle - frames[i-1].angle) * direction >= -.02, "angular direction");
    }
  };
  for (const variant of ["primary", "secondary", "inverse", "submit"]) {
    await pointer(5, 5);
    await delay(550);
    await evaluate(`document.querySelector('#orbit-test').className = document.querySelector('#orbit-test').className.replace(/pulse-action-(primary|secondary|inverse|submit)/g, 'pulse-action-${variant}')`);
    const right = await motion(160, 125);
    const end = right.at(-1).left;
    assert.ok(end > 0, JSON.stringify(await evaluate(`(() => { const b = document.querySelector('#orbit-test'); return { rect: b.getBoundingClientRect().toJSON(), hover: b.matches(':hover'), media: matchMedia('(hover: hover) and (pointer: fine)').matches, sample: orbitSample(), hit: document.elementFromPoint(160,125)?.outerHTML.slice(0,300) }; })()`)));
    assert.ok(Math.abs(right.at(-1).angle + 360) < .01, "one complete counterclockwise orbit");
    check(right, end, -1);
    const left = await motion(5, 5);
    check(left, end, 1);
    assert.equal(left.at(-1).angle, 0);
    await motion(160, 125, 70);
    const before = await sample();
    const reversal = await motion(5, 5);
    check(reversal, end, 1);
    assert.ok(Math.abs(reversal[0].angle-before.angle) < 105, "interruption has no endpoint snap");
    console.log(`${variant}: direction, radius, timing, stopping and reversal passed`);
  }
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await evaluate("document.querySelector('#orbit-test').focus()");
  await delay(550);
  assert.ok((await sample()).focus);
  assert.ok(Math.abs((await sample()).angle + 360) < .01);
  assert.notEqual((await sample()).shadow, "none");
  await motion(160,125);
  await motion(5,5);
  assert.ok(Math.abs((await sample()).angle + 360) < .01, "focus keeps orbit at end when hover exits");
  await evaluate("document.querySelector('#orbit-test').blur()");
  await delay(550);
  await send("Emulation.setEmulatedMedia", { features: [
    { name: "hover", value: "hover" }, { name: "pointer", value: "fine" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ] });
  const reduced = await motion(160,125);
  assert.ok(reduced.every((s) => s.angle === 0), "reduced motion dot stays at rest");
  await evaluate("document.querySelector('#orbit-test').focus()");
  assert.equal((await sample()).angle, 0);
  console.log("Keyboard, combined hover/focus, focus visibility and reduced motion passed");
} finally {
  socket?.close();
  const exited = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill();
  await exited;
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}