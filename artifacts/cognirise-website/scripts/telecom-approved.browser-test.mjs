import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const debuggingPort = 9347;
const profilePath = `/tmp/cognirise-industry-images-browser-test-${process.pid}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const requestedRoutes = new Set(
  (process.env.PULSE_INDUSTRY_IMAGES_ROUTES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const routes = [
  { slug: "overview", path: "/industries", selector: ".home-industry-visual img", expected: 6 },
  { slug: "financial-services", path: "/industries/financial-services", selector: ".ind-image img", expected: 1 },
  { slug: "telecoms", path: "/industries/telecoms", selector: ".ind-image img", expected: 1 },
  { slug: "travel-hospitality", path: "/industries/travel-hospitality", selector: ".ind-image img", expected: 1 },
  { slug: "energy-resources", path: "/industries/energy-resources", selector: ".ind-image img", expected: 1 },
  { slug: "public-sector", path: "/industries/public-sector", selector: ".ind-image img", expected: 1 },
  { slug: "education", path: "/industries/education", selector: ".ind-image img", expected: 1 },
];
const viewports = [
  { label: "desktop-1366", width: 1366, height: 768, mobile: false },
  { label: "desktop-1440", width: 1440, height: 900, mobile: false },
  { label: "mobile", width: 390, height: 844, mobile: true },
];

await rm(profilePath, { recursive: true, force: true });
const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profilePath}`,
  "about:blank",
], { stdio: "ignore" });
const browserExited = new Promise((resolve) => browser.once("exit", resolve));

async function getDebugTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
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


try {
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:baseUrl+'/industries/telecoms'});
 for(let n=0;n<80;n++){if(await evaluate('!!document.querySelector(".tv-route-map")'))break;await delay(200);}
 const inspect=await evaluate('({sections:document.querySelectorAll(".telecom-approved").length, mains:document.querySelectorAll("main").length, pools:document.querySelectorAll(".vm-node").length, departments:document.querySelectorAll(".wm-node").length, candidates:document.querySelectorAll(".pm-point").length})');
 assert.equal(inspect.sections,6);assert.equal(inspect.pools,6);assert.equal(inspect.departments,18);assert.equal(inspect.candidates,8);
 async function click(selector){await evaluate('document.querySelector('+JSON.stringify(selector)+').click()');await delay(80);}
 await click('.vm-node:nth-of-type(3)');assert.ok(await evaluate('document.querySelector(".vm-detail h3").textContent.includes("Growth")'));
 await click('.pm-point:nth-of-type(2)');assert.ok(await evaluate('document.querySelector(".pm-brief").textContent.includes("Customer Service")'));
 await click('[data-testid="button-department-fraud-management"]');assert.ok(await evaluate('document.querySelector(".wm-detail").textContent.includes("Fraud")'));
 await click('.at-case-index button:nth-of-type(2)');assert.ok(await evaluate('document.querySelector(".tv-scenarios [aria-pressed=true]").textContent.includes("Qualified")'));
 await click('#lane-stage-3');assert.ok(await evaluate('document.querySelector("#lane-stage-3").getAttribute("aria-selected")==="true"'));
 await click('.tv-path-stage:nth-of-type(4)');assert.ok(await evaluate('document.querySelector(".tv-path-info").textContent.includes("Approve")'));
 console.log('Desktop selection checks passed',inspect);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(200);
 const sizing=await evaluate('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth, sections:[...document.querySelectorAll(".telecom-approved")].map(x=>({id:x.id,width:x.getBoundingClientRect().width}))})');
 assert.equal(sizing.client,390);assert.ok(sizing.scroll<=392,JSON.stringify(sizing));console.log('Mobile sizing passed',sizing);
} finally {
  socket.close();
  browser.kill('SIGTERM');
  await browserExited;
  await rm(profilePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
