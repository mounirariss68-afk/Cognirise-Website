import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

// Focused real-browser regression: only the country response is substituted.
const profile = `/tmp/cognirise-launch-${process.pid}`;
const browser = spawn("/repl/tools/bin/chromium", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9359",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await fetch("http://127.0.0.1:9359/json/list").then((r) => r.json())).find((t) => t.type === "page" && t.url === "about:blank"); } catch {}
    if (!target) await delay(100);
  }
  assert.ok(target);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => { socket.onopen = resolve; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 180; i++) {
      if (await evaluate(expression).catch(() => false)) return;
      await delay(100);
    }
    throw new Error(`Timeout: ${expression}; ${await evaluate("document.body.innerText.slice(0,400)")}`);
  };
  await send("Page.enable");
  for (const [country, expected] of [["AE", "uae"], ["SA", "ksa"], ["TR", "turkiye"], ["DE", "europe"], ["US", "europe"], ["FAIL", "europe"]]) {
    await send("Page.navigate", { url: "about:blank" });
    const setup = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
      localStorage.clear(); sessionStorage.clear(); window.__countryCalls=0;
      const realFetch=window.fetch.bind(window);
      window.fetch=(input,init)=>{
        if(String(input).startsWith("https://api.country.is/")){
          window.__countryCalls++;
          return ${country === "FAIL" ? 'Promise.reject(new Error("Country lookup unavailable"))' : `Promise.resolve(new Response(JSON.stringify({country:${JSON.stringify(country)}}),{status:200,headers:{"Content-Type":"application/json"}}))`};
        } return realFetch(input,init);
      };
    ` });
    await send("Page.navigate", { url: "http://127.0.0.1/" });
    await wait(`document.querySelector("h1") && new URLSearchParams(location.search).get("market")===${JSON.stringify(expected)}`);
    assert.equal(await evaluate("window.__countryCalls"), 1, country);
    await wait(`Array.from(document.images).some(i=>i.src.includes(${JSON.stringify(expected === "uae" ? "/blueprint-innovate.jpg" : `/idao/${expected}/innovate.jpg`)}))`);
    // Exercise client-side navigation and retain the selected audience.
    await evaluate(`history.pushState({}, "", "/methodologies/idao"); dispatchEvent(new PopStateEvent("popstate"));`);
    await wait(`document.querySelector("h1")?.textContent.includes("IDAO")`);
    await wait(`Array.from(document.images).some(i=>i.src.includes(${JSON.stringify(expected === "uae" ? "/blueprint-demonstrate.jpg" : `/idao/${expected}/demonstrate.jpg`)}))`);
    assert.equal(await evaluate("window.__countryCalls"), 1, `${country} must not re-detect on navigation`);
    console.log(`PASS ${country} → ${expected}; Home + IDAO; lookup count=1`);
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: setup.identifier });
  }
} finally {
  socket?.close();
  browser.kill("SIGTERM");
  await delay(200);
  await rm(profile, { recursive: true, force: true });
}
