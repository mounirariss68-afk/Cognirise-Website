import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Serves the real production bundle locally; public API requests still go
// through the managed workspace proxy. Nothing is deployed.
const root = fileURLToPath(new URL("../dist/public/", import.meta.url));
const mime = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".webm": "video/webm" };
const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      const upstream = await fetch(`http://127.0.0.1:80${req.url}`);
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") || "application/json" });
      res.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = path.join(root, pathname);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (!path.extname(file)) file = path.join(root, "index.html");
    const bytes = await readFile(file);
    res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = `/tmp/cognirise-release-nav-${process.pid}`;
const browser = spawn(process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9347",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await fetch("http://127.0.0.1:9347/json/list").then((r) => r.json())).find((t) => t.type === "page"); } catch {}
    if (!target) await delay(100);
  }
  assert.ok(target, "Chromium started");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => { socket.onopen = resolve; });
  let id = 0;
  const pending = new Map();
  const failed = new Set();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400) failed.add(message.params.response.url);
    if (!pending.has(message.id)) return;
    const [resolve, reject] = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, [resolve, reject]); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      try { if (await evaluate(`Boolean(${expression})`)) return; } catch {}
      await delay(100);
    }
    console.log(await evaluate(`({url:location.href, referrer:document.referrer, snapshot:window.__cogniriseNavigationManager?.getSnapshot(), buttonText:[...document.querySelectorAll('button')].map(x=>x.textContent).filter(x=>x.includes('Back')), nav:history.state, ledger:sessionStorage.getItem('cognirise-navigation-v1'), heading:document.querySelector('h1')?.textContent})`));
    throw new Error(`Timed out: ${expression}`);
  };
  const back = `document.querySelector('[data-testid="navigation-back"]')`;
  const backRow = `document.querySelector('[data-navigation-back-row]')`;
  const heroShell = `document.querySelector('.public-hero-shell:not([data-navigation-back-row])')`;
  const assertBackRowGeometry = async () => {
    const geometry = await evaluate(`({
      rowLeft:${backRow}.getBoundingClientRect().left + parseFloat(getComputedStyle(${backRow}).paddingLeft),
      heroLeft:${heroShell}.getBoundingClientRect().left + parseFloat(getComputedStyle(${heroShell}).paddingLeft),
      rowBottom:${backRow}.getBoundingClientRect().bottom,
      heroTop:${heroShell}.firstElementChild.getBoundingClientRect().top,
      rowDisplay:getComputedStyle(${backRow}).display
    })`);
    assert.equal(geometry.rowDisplay, "block");
    assert.ok(Math.abs(geometry.rowLeft - geometry.heroLeft) <= 1, `Back and hero left edges differ: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.heroTop - geometry.rowBottom >= 20, `Back row does not separate the hero: ${JSON.stringify(geometry)}`);
  };
  await send("Page.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/?market=ksa` });
  await wait(`document.querySelector('h1') && document.body.textContent.includes('Market view')`);
  assert.equal(await evaluate(`document.querySelectorAll('select[aria-label="Review version"]').length`), 0);
  assert.equal(await evaluate(`Boolean(${back})`), false);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('header nav')).display !== 'none'`), true);
  assert.equal(await evaluate(`Boolean(document.querySelector('button[aria-label="Open menu"]')) && getComputedStyle(document.querySelector('button[aria-label="Open menu"]')).display === 'none'`), true);
  assert.equal(await evaluate(`document.querySelector('header').scrollWidth <= document.querySelector('header').clientWidth + 1`), true);
  await wait(`document.body.textContent.includes('Saudi Arabia')`);
  // Native hash entry followed by a real full-document link, then shared Back.
  await evaluate(`location.hash='service-lines'`);
  await delay(200);
  await evaluate(`{ const a=document.createElement('a'); a.href='/platforms?market=ksa'; a.textContent='Test internal'; document.body.append(a); a.click(); }`);
  await wait(`location.pathname==='/platforms' && Boolean(${back}) && document.querySelector('h1')`);
  assert.equal(await evaluate(`${back}.className.includes('border')`), false);
  assert.equal(await evaluate(`${back}.getBoundingClientRect().height < 32`), true);
  assert.equal(await evaluate(`${back}.closest('[data-navigation-back-container]').nextElementSibling !== null`), true);
  await assertBackRowGeometry();
  assert.equal(await evaluate(`document.querySelectorAll('[data-method-return]').length`), 0);
  await evaluate(`${back}.click()`);
  await wait(`location.pathname==='/' && location.hash==='#service-lines' && document.querySelector('h1')`);
  assert.equal(await evaluate(`Boolean(${back})`), false);
  console.log("PASS laptop navigation, regional delivery, native hash and subtle full-document Back");
  // Navigate through Wouter to a real dirty assessment; dismiss then accept.
  await evaluate(`document.querySelector('a[href="/methodologies"]').click()`);
  await wait(`location.pathname==='/methodologies'`);
  await assertBackRowGeometry();
  await evaluate(`document.querySelector('a[href="/methodologies/ai-value-to-scale"]').click()`);
  await wait(`document.querySelector('input[type="radio"]')`);
  await delay(600);
  await evaluate(`window.__beforeDirtyPush=history.pushState; document.querySelector('#assessment input[type="radio"]').click(); window.confirm=()=>false`);
  await wait(`document.querySelector('#assessment input[type="radio"]:checked') && history.pushState!==window.__beforeDirtyPush`);
  await delay(300);
  await evaluate(`history.back()`);
  await delay(350);
  assert.equal(await evaluate("location.pathname"), "/methodologies/ai-value-to-scale");
  await evaluate(`window.confirm=()=>true; ${back}.click()`);
  await wait(`location.pathname==='/methodologies'`);
  console.log("PASS canceled dirty-assessment traversal followed by shared Back");
  await send("Emulation.setDeviceMetricsOverride", { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate(`{ const a=document.createElement('a'); a.href='/what-we-do/data-ai-foundations'; a.textContent='Test wide service'; document.body.append(a); a.click(); }`);
  await wait(`location.pathname==='/what-we-do/data-ai-foundations' && Boolean(${back}) && Boolean(${heroShell}) && document.querySelector('h1')`);
  await assertBackRowGeometry();
  console.log("PASS wide-screen shared Back alignment on fixed-gutter service hero");
  await evaluate(`{ const a=document.createElement('a'); a.href='/work/clinic-network?market=uae'; a.textContent='Test wide case study'; document.body.append(a); a.click(); }`);
  await wait(`location.pathname==='/work/clinic-network' && Boolean(${back}) && document.querySelector('.case-detail__hero-wrap') && Boolean(${heroShell})`);
  await assertBackRowGeometry();
  const caseGeometry = await evaluate(`({
    wrapperWidth:document.querySelector('.case-detail__hero-wrap').getBoundingClientRect().width,
    shellWidth:${heroShell}.getBoundingClientRect().width,
    viewportWidth:document.documentElement.clientWidth
  })`);
  assert.ok(caseGeometry.wrapperWidth >= caseGeometry.viewportWidth - 1, `Case-study background is not full bleed: ${JSON.stringify(caseGeometry)}`);
  assert.ok(caseGeometry.shellWidth <= 1440, `Case-study content exceeds the shared maximum: ${JSON.stringify(caseGeometry)}`);
  console.log("PASS wide-screen case-study background and inner content shell");
  const articleGeometry = await evaluate(`{
    const shell=document.createElement('div');
    shell.className='public-hero-shell';
    const article=document.createElement('article');
    article.className='w-full max-w-[900px] py-12 md:py-20';
    shell.append(article);
    document.body.append(shell);
    const result={shellWidth:shell.getBoundingClientRect().width,articleWidth:article.getBoundingClientRect().width};
    shell.remove();
    result;
  }`);
  assert.ok(articleGeometry.shellWidth <= 1440, `Article shell exceeds the shared maximum: ${JSON.stringify(articleGeometry)}`);
  assert.ok(articleGeometry.articleWidth <= 900, `Article reading column exceeds 900px: ${JSON.stringify(articleGeometry)}`);
  console.log("PASS wide-screen article shell preserves the narrow reading column");
  await send("Emulation.setDeviceMetricsOverride", { width: 1279, height: 844, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('header nav')).display === 'none'`), true);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('button[aria-label="Open menu"]')).display !== 'none'`), true);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`{ const a=document.createElement('a'); a.href='/about'; a.textContent='Test mobile internal'; document.body.append(a); a.click(); }`);
  await wait(`location.pathname==='/about' && Boolean(${back}) && Boolean(${heroShell})`);
  await assertBackRowGeometry();
  await evaluate(`document.querySelector('button[aria-label="Open menu"]').click()`);
  await wait(`document.querySelector('button[aria-label="Close menu"]')`);
  assert.equal(await evaluate(`document.querySelectorAll('select[aria-label="Review version"]').length`), 0);
  assert.equal(await evaluate(`Boolean(document.querySelector('.pb-12.border-t.pt-8'))`), false);
  assert.equal(await evaluate(`document.querySelector('header').getBoundingClientRect().right <= document.documentElement.clientWidth + 1`), true);
  console.log("PASS production mobile hiding, no orphan separator or header overflow");
  console.log("Resource failures:", [...failed]);
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  server.closeAllConnections();
  server.close();
  await delay(250);
  await rm(profile, { recursive: true, force: true });
}