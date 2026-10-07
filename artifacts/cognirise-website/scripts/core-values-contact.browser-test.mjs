import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const browser = spawn("/repl/tools/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9368", "--user-data-dir=/tmp/core-values-browser", "about:blank"], { stdio: "ignore" });
const delay = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 60; i++) {
    try { target = (await (await fetch("http://127.0.0.1:9368/json/list")).json()).find(t => t.type === "page" && t.url === "about:blank"); } catch {}
    if (target) break;
    await delay(100);
  }
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => socket.onopen = r);
  let id = 0;
  const pending = new Map();
  socket.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { pending.set(++id, r); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  await send("Page.bringToFront");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  for (const width of [390, 768, 1440, 2560]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const path of ["/about/core-values", "/contact"]) {
      await send("Page.navigate", { url: `http://127.0.0.1:80${path}` });
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`document.querySelector('h1')?.textContent.includes(${JSON.stringify(path.includes("core-values") ? "Two values." : "Connect with")})`)) break;
        await delay(100);
      }
      await delay(800);
      await evaluate(`Promise.all([...document.querySelectorAll('main img, section img')].map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); }))`);
      const result = await evaluate(`({
        title: document.title, width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        images: [...document.querySelectorAll('main img, section img')].map(i => ({src:i.src, ok:i.complete && i.naturalWidth > 0})),
        links: [...document.querySelectorAll('a')].map(a => a.getAttribute('href')),
        cities: [...document.querySelectorAll('section h4')].map(n=>n.textContent)
      })`);
      assert.ok(result.scroll <= result.width + 1, `${path} overflow at ${width}`);
      assert.ok(result.images.every(i => i.ok), JSON.stringify(result.images));
      if (width >= 1280) {
        await evaluate(`document.activeElement.blur()`);
        await evaluate(`document.getElementById('desktop-nav-about').focus()`);
        await delay(300);
        assert.ok(await evaluate(`!!document.querySelector('#desktop-menu-about a[href^="/about/core-values"]')`), await evaluate(`JSON.stringify({focus: document.activeElement.outerHTML, about: document.getElementById('desktop-nav-about').parentElement.outerHTML})`));
        if (path.includes("core-values")) assert.equal(await evaluate(`document.querySelector('#desktop-menu-about a[href^="/about/core-values"]').getAttribute('aria-current')`), "page");
        await evaluate(`document.activeElement.blur()`);
      } else {
        await evaluate(`document.querySelector('button[aria-label="Open menu"]').click()`);
        await delay(100);
        await evaluate(`document.querySelector('button[aria-controls="mobile-menu-about"]').click()`);
        await delay(100);
        assert.ok(await evaluate(`!!document.querySelector('#mobile-menu-about a[href^="/about/core-values"]')`));
        if (path.includes("core-values")) assert.equal(await evaluate(`document.querySelector('#mobile-menu-about a[href^="/about/core-values"]').getAttribute('aria-current')`), "page");
        await evaluate(`document.querySelector('button[aria-label="Close menu"]').click()`);
      }
      if (path.includes("core-values")) assert.equal(result.title, "Core Values | Cognirise");
      else {
        assert.ok(result.links.includes("mailto:support@cognirise.ai"));
        const cities = result.cities.filter(c => c !== "Email");
        assert.deepEqual(cities, [...cities].sort((a,b)=>a.localeCompare(b)));
        assert.equal(cities.filter(c => c === "Istanbul").length, 1);
      }
      await evaluate(`document.documentElement.style.fontSize = '200%'`);
      const overflow = await evaluate(`({ok: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, nodes: [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>document.documentElement.clientWidth+2 && getComputedStyle(e).position!=='absolute').map(e=>e.tagName+'.'+e.className).slice(-8)})`);
      assert.ok(overflow.ok, `enlarged text ${path} ${width} ${JSON.stringify(overflow.nodes)}`);
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      assert.ok(await evaluate(`['A','BUTTON'].includes(document.activeElement.tagName)`));
      console.log(`PASS ${path} ${width}px, images, links, keyboard, 200% text`);
    }
  }
} finally { socket?.close(); browser.kill(); }
