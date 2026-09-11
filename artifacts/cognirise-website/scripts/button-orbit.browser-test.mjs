import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";

// Run with website + API workflows serving the managed proxy.
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const orbitDuration = 800;
const arrivalDuration = 240;
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
  const touch = (x, y, type = "touchStart") => send("Input.dispatchTouchEvent", {
    type,
    touchPoints: type === "touchEnd" ? [] : [{ x, y, radiusX: 1, radiusY: 1, force: 1 }],
  });
  const captureMidTravel = async () => {
    const clip = await evaluate(`(() => {
      const rect = document.querySelector('#orbit-test').getBoundingClientRect();
      return { x: Math.max(0, rect.x - 24), y: Math.max(0, rect.y - 24), width: rect.width + 48, height: rect.height + 48, scale: 2 };
    })()`);
    const screenshot = await send("Page.captureScreenshot", { format: "jpeg", quality: 92, fromSurface: true, clip });
    await mkdir("screenshots", { recursive: true });
    await writeFile("screenshots/button-dot-trail.jpg", Buffer.from(screenshot.data, "base64"));
  };
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
  // Isolate the real React button. A clone would not retain the motion lifecycle handlers.
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('.pulse-action')].find(el => el.getBoundingClientRect().width > 0);
    button.id = 'orbit-test';
    button.style.setProperty('position', 'fixed', 'important');
    button.style.setProperty('left', '100px', 'important');
    button.style.setProperty('top', '100px', 'important');
    button.style.setProperty('width', '400px', 'important');
    button.style.setProperty('min-width', '0', 'important');
    button.style.setProperty('height', '52px', 'important');
    button.style.setProperty('display', 'inline-flex', 'important');
    button.style.setProperty('z-index', '99999', 'important');
    button.tabIndex = 0;
    window.orbitSample = () => {
      const circle = button.querySelector('.pulse-action-icon');
      const dot = circle.querySelector('.pulse-action-dot');
      const trail = circle.querySelector('.pulse-action-trail');
      const c = getComputedStyle(circle), d = getComputedStyle(dot);
      const pulse = getComputedStyle(dot, '::before');
      const t = getComputedStyle(trail), tp = getComputedStyle(trail, '::before');
      const angle = parseFloat(d.rotate);
      const matrix = new DOMMatrix().rotate(angle);
      const [ox, oy] = d.transformOrigin.split(' ').map(parseFloat);
      const w = parseFloat(d.width), h = parseFloat(d.height);
      const dx = parseFloat(d.left) + ox + matrix.a * (w/2-ox) + matrix.c * (h/2-oy) + matrix.e - circle.clientWidth/2;
      const dy = parseFloat(d.top) + oy + matrix.b * (w/2-ox) + matrix.d * (h/2-oy) + matrix.f - circle.clientHeight/2;
      const circleRect = circle.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      const trailRect = trail.getBoundingClientRect();
      const circleCenter = { x: circleRect.left + circleRect.width / 2, y: circleRect.top + circleRect.height / 2 };
      const dotCenter = { x: dotRect.left + dotRect.width / 2, y: dotRect.top + dotRect.height / 2 };
      const dotRadius = Math.hypot(dotCenter.x - circleCenter.x, dotCenter.y - circleCenter.y);
      return { left: parseFloat(c.left), angle,
        radius: Math.hypot(dx,dy), arrow: getComputedStyle(circle.querySelector('svg')).transform,
        trailAngle: parseFloat(t.rotate), trailOpacity: parseFloat(t.opacity),
        trailMask: tp.maskImage || tp.webkitMaskImage || "", trailBackground: tp.backgroundImage || "",
        dotFillWidth: parseFloat(pulse.width), dotFillHeight: parseFloat(pulse.height),
        dotScale: parseFloat(pulse.scale), dotAnimationIterationCount: pulse.animationIterationCount,
        trailRadius: parseFloat(t.width) / 2,
        trailGap: Math.abs(parseFloat(t.width) / 2 - dotRadius),
        trailArcLength: (86 / 360) * 2 * Math.PI * dotRadius,
        motion: button.dataset.pulseActionMotion,
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
  const motion = async (x, y, duration = orbitDuration + arrivalDuration + 80, capture = false) => {
    const frames = evaluate(`orbitFrames(${duration})`);
    await pointer(x, y);
    if (capture) {
      await delay(orbitDuration / 2);
      await captureMidTravel();
    }
    return frames;
  };
  const check = (frames, end, direction) => {
    assert.ok(frames.some((s) => s.angle < -2 && s.angle > -358), "intermediate orbital frames");
    assert.ok(frames.some((s) => s.trailOpacity > .1), "coral trail appears during travel");
    assert.ok(frames.some((s) => s.trailOpacity < .1), "coral trail starts hidden at rest");
    assert.ok(frames.some((s) => s.motion === "moving"), "travel phase stays visible during motion");
    assert.ok(frames.some((s) => s.motion === "arriving"), "arrival phase follows transition completion");
    assert.ok(frames.every((s) => s.trailMask.includes("radial-gradient")), "trail is a masked orbital arc");
    assert.ok(frames.every((s) => s.trailBackground.includes("conic-gradient")), "trail follows a curved path");
    assert.ok(frames.every((s) => s.dotFillWidth > 0 && s.dotFillHeight > 0), "dot retains a visible coral fill");
    assert.ok(frames.every((s) => s.trailGap < 3), "trail ring abuts the dot orbit");
    assert.ok(frames.every((s) => s.trailArcLength >= 3 * 7 && s.trailArcLength <= 4 * 7), "trail arc is 3–4 dot widths");
    for (let i = 0; i < frames.length; i++) {
      const s = frames[i];
      assert.ok(Math.abs(s.radius - Math.hypot(11.5,11.5)) < .02, "constant circle-centered radius");
      assert.equal(s.arrow, "none", "arrow remains upright");
      assert.ok(Math.abs(s.angle / -360 - s.left / end) < .003, `orbit synchronized with travel: ${JSON.stringify({ s, end })}`);
      assert.ok(Math.abs(s.trailAngle - s.angle) < .02, "trail follows the dot's orbital frame");
      if (i) assert.ok((s.angle - frames[i-1].angle) * direction >= -.02, "angular direction");
    }
  };
  for (const variant of ["primary", "secondary", "inverse", "submit"]) {
    await pointer(5, 5);
    await delay(orbitDuration + arrivalDuration + 80);
    await evaluate(`document.querySelector('#orbit-test').className = document.querySelector('#orbit-test').className.replace(/pulse-action-(primary|secondary|inverse|submit)/g, 'pulse-action-${variant}')`);
    const right = await motion(160, 125, undefined, variant === "primary");
    const end = right.at(-1).left;
    assert.ok(end > 0, JSON.stringify(await evaluate(`(() => { const b = document.querySelector('#orbit-test'); return { rect: b.getBoundingClientRect().toJSON(), hover: b.matches(':hover'), media: matchMedia('(hover: hover) and (pointer: fine)').matches, sample: orbitSample(), hit: document.elementFromPoint(160,125)?.outerHTML.slice(0,300) }; })()`)));
    assert.ok(Math.abs(right.at(-1).angle + 360) < .01, "one complete counterclockwise orbit");
    check(right, end, -1);
    assert.equal(right.at(-1).dotAnimationIterationCount, "1", "arrival pulse is one-shot");
    assert.ok(right.some((s) => s.dotScale > 1.01), "dot enlargement is visible after travel");
    assert.equal(right.at(-1).dotScale, 1, "forward pulse settles at the held scale");
    assert.equal(right.at(-1).motion, "rest", "forward lifecycle settles without idle animation");
    assert.equal(right.at(-1).trailOpacity, 0, "forward trail fades at rest");
    await delay(300);
    assert.equal((await sample()).dotScale, right.at(-1).dotScale, "arrival pulse settles and holds");
    const rightTrailBackground = right.at(-1).trailBackground;
    const left = await motion(5, 5);
    check(left, end, 1);
    assert.ok(left.some((s) => s.dotScale > 1.01), "return pulse is visible after travel");
    assert.equal(left.at(-1).dotScale, 1, "return pulse settles at the held scale");
    assert.equal(left.at(-1).motion, "rest", "return lifecycle settles without idle animation");
    assert.equal(left.at(-1).trailOpacity, 0, "return trail fades at rest");
    assert.equal(left.at(-1).angle, 0);
    assert.notEqual(left.at(-1).trailBackground, rightTrailBackground, "trail reverses its fading direction");
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
  await delay(orbitDuration + arrivalDuration + 80);
  assert.ok((await sample()).focus);
  assert.ok(Math.abs((await sample()).angle + 360) < .01);
  assert.notEqual((await sample()).shadow, "none");
  await motion(160,125);
  await motion(5,5);
  assert.ok(Math.abs((await sample()).angle + 360) < .01, "focus keeps orbit at end when hover exits");
  await evaluate("document.querySelector('#orbit-test').blur()");
  await delay(orbitDuration + arrivalDuration + 80);
  await send("Emulation.setEmulatedMedia", { features: [
    { name: "hover", value: "none" }, { name: "pointer", value: "coarse" },
    { name: "prefers-reduced-motion", value: "no-preference" },
  ] });
  await delay(orbitDuration + arrivalDuration + 80);
  await touch(160, 125, "touchStart");
  await delay(40);
  await touch(160, 125, "touchEnd");
  await delay(orbitDuration + arrivalDuration + 80);
  const touchSamples = await evaluate(`orbitFrames(160)`);
  assert.ok(touchSamples.every((s) => s.angle === 0 && s.trailOpacity === 0), JSON.stringify({ message: "coarse touch input stays static", samples: touchSamples.filter((s) => s.angle !== 0 || s.trailOpacity !== 0).slice(0, 4) }));
  await send("Emulation.setEmulatedMedia", { features: [
    { name: "hover", value: "hover" }, { name: "pointer", value: "fine" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ] });
  const reduced = await motion(160,125);
  assert.ok(reduced.every((s) => s.angle === 0), "reduced motion dot stays at rest");
  assert.ok(reduced.every((s) => s.trailOpacity === 0), "reduced motion trail stays hidden");
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