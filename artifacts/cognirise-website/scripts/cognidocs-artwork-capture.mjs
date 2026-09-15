import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";

const dir = "screenshots/cognidocs-pulse";
const profile = `/tmp/cognidocs-artwork-${process.pid}`;
const browser = spawn("/repl/tools/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9357", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = (await (await fetch("http://127.0.0.1:9357/json")).json()).find(t => t.type === "page"); } catch {}
    if (!target) await pause(100);
  }
  if (!target) throw new Error("Chromium unavailable");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = async (method, params = {}) => {
    const key = ++id;
    const reply = new Promise(resolve => pending.set(key, resolve));
    socket.send(JSON.stringify({ id: key, method, params }));
    const response = await reply;
    if (response.error) throw new Error(JSON.stringify(response.error));
    return response.result;
  };
  const evaluate = async expression => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  await mkdir(dir, { recursive: true });
  const metrics = [];
  for (const width of [1440, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width === 390 });
    await send("Page.navigate", { url: "http://127.0.0.1:80/platforms/cognidocs" });
    await pause(2200);
    await evaluate("document.fonts.ready");
    await evaluate("Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))");
    for (const section of ["hero", "layers", "layer-art"]) {
      await evaluate(section === "hero" ? "window.scrollTo(0,0)" : section === "layer-art" ? "document.querySelector('#extraction-layers figure').scrollIntoView(); window.scrollBy(0,-90)" : "document.querySelector('#extraction-layers').scrollIntoView()");
      await pause(500);
      const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
      await writeFile(`${dir}/${section}-${width}.jpg`, Buffer.from(shot.data, "base64"));
    }
    const result = await evaluate("({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.querySelectorAll('main img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,alt:i.alt}))})");
    metrics.push({ width, ...result });
    if (result.scrollWidth > width || result.images.some(i => !i.loaded)) throw new Error(`Invalid layout/images at ${width}`);
  }
  await writeFile(`${dir}/metrics.json`, JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics));
} finally {
  socket?.close();
  browser.kill();
  await pause(300);
  await rm(profile, { recursive: true, force: true });
}