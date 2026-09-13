import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const baseUrl = process.env.PULSE_BROWSER_BASE_URL || "http://127.0.0.1:80";
const browserPath = process.env.CHROMIUM_PATH || "/repl/tools/bin/chromium";
const fixturePath = process.env.GUARDRAILS_FIXTURE;
const previewRoute = "/preview/guardrails-visual-fixture";
const navigationPath = "/api/public/navigation?market=uae&locale=en";
const evidenceDirectory = new URL("../evidence/guardrails/", import.meta.url);
const profilePath = `/tmp/cognirise-guardrails-browser-test-${process.pid}`;
const debugPort = 9346;
const WAIT = 45_000;
const viewports = [
  { label: "390", width: 390, height: 844, mobile: true },
  { label: "1440", width: 1440, height: 1000, mobile: false },
];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
if (!fixturePath) throw new Error("GUARDRAILS_FIXTURE must point to the saved draft payload JSON.");
const clone = (value) => JSON.parse(JSON.stringify(value));
async function fetchJson(path) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), WAIT);
  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal }); const body = await response.json().catch(() => null);
    assert.equal(response.status, 200, `${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`); assert.ok(body && typeof body === "object" && !Array.isArray(body), `${path} did not return a JSON object.`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const payload = fixture?.payload && typeof fixture.payload === "object" ? fixture.payload
  : fixture?.document && typeof fixture.document === "object" ? fixture.document : fixture;
assert.ok(payload && typeof payload === "object" && !Array.isArray(payload), "Fixture must be a saved cms_revisions.payload object.");
assert.equal(payload.slug, "agent-authority-model", "Fixture payload.slug must be agent-authority-model.");
assert.equal(payload.content?.template, "agent-authority", "Fixture payload.content.template must be agent-authority.");
assert.ok(payload.content && typeof payload.content === "object" && !Array.isArray(payload.content), "Fixture payload.content is required.");
assert.ok(payload.content.guardrails && typeof payload.content.guardrails === "object", "The after fixture must contain content.guardrails.");
assert.equal(payload.content.guardrails.firstFigure?.asset, "aam-guardrails-vs-authority.svg");
assert.equal(payload.content.guardrails.secondFigure?.asset, "aam-how-they-interact.svg");
const afterPayload = clone(payload);
const baselinePayload = clone(payload);
delete baselinePayload.content.guardrails;
assert.equal(Object.hasOwn(baselinePayload.content, "guardrails"), false);
const navigation = await fetchJson(navigationPath);
const fixtureMedia = Array.isArray(fixture?.media) ? fixture.media : [];
const revisionId = typeof fixture?.revisionId === "string" ? fixture.revisionId : "guardrails-visual-fixture";
const revisionNumber = Number.isFinite(Number(fixture?.revisionNumber)) ? Number(fixture.revisionNumber) : 1;
function envelope(document) {
  return { kind: "framework", document, market: "uae", locale: "en", requestedMarket: "uae",
    requestedLocale: "en", revisionId, revisionNumber, usedFallback: false, media: fixtureMedia,
    missingMediaIds: [], validationWarnings: [], navigation };
}

await rm(profilePath, { recursive: true, force: true });
await mkdir(evidenceDirectory, { recursive: true });
const browser = spawn(browserPath, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--window-size=1440,1000",
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profilePath}`, "about:blank",
], { stdio: "ignore" });
const browserExited = new Promise((resolve) => browser.once("exit", resolve));
async function debugTarget() {
  const deadline = Date.now() + WAIT;
  while (Date.now() < deadline) {
    try { const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page"); if (page) return page; } catch {}
    await sleep(100);
  }
  throw new Error("Chromium did not expose a page target within 45 seconds.");
}
const target = await debugTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;
let opened = false;
let fatalError;
let mode = "baseline";
let previewRequestCount = 0;
let previewEndpointSeen;
let previewWaiter;
const imageResponses = new Map();
const imageRequests = new Map();
function rejectPending(error) {
  for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); }
  pending.clear();
}
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") fatalError = new Error(message.params.exceptionDetails.text || "Runtime exception");
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    fatalError = new Error(message.params.entry.text);
  }
  if (message.method === "Network.responseReceived") {
    const response = message.params.response;
    if (message.params.type === "Image" || /\.svg(?:\?|$)/.test(response.url)) {
      imageResponses.set(response.url, { status: response.status });
    }
  }
  if (message.method === "Network.requestWillBeSent" && message.params.type === "Image") {
    imageRequests.set(message.params.requestId, message.params.request.url);
  }
  if (message.method === "Network.loadingFailed" && message.params.type === "Image") {
    imageResponses.set(imageRequests.get(message.params.requestId) || message.params.requestId, { status: 0, error: message.params.error });
  }
  if (message.method === "Fetch.requestPaused") { void pauseRequest(message.params); return; }
  if (!message.id || !pending.has(message.id)) return;
  const item = pending.get(message.id);
  pending.delete(message.id);
  clearTimeout(item.timer);
  if (message.error) item.reject(new Error(message.error.message));
  else item.resolve(message.result);
};
socket.onerror = (error) => {
  const failure = new Error(`CDP websocket error: ${String(error)}`);
  if (!opened) fatalError = failure;
  rejectPending(failure);
};
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("CDP websocket did not open within 45 seconds.")), WAIT);
  socket.onopen = () => { clearTimeout(timer); opened = true; resolve(); };
});
function send(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolve, reject) => { const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP ${method} timed out after 45 seconds.`)); }, WAIT);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
function responseHeaders(body) { return [{ name: "Content-Type", value: "application/json; charset=utf-8" },
  { name: "Content-Length", value: String(Buffer.byteLength(body)) }, { name: "Cache-Control", value: "no-store" }]; }
function isPreviewPath(pathname) { return /^\/api\/(?:cms\/)?preview\/guardrails-visual-fixture$/.test(pathname); }
async function pauseRequest(paused) {
  const pathname = new URL(paused.request.url).pathname;
  if (!isPreviewPath(pathname)) { await send("Fetch.continueRequest", { requestId: paused.requestId }).catch(() => {}); return; }
  try {
    assert.equal(paused.request.method, "GET", "CmsPreview must fetch the protected preview with GET.");
    previewEndpointSeen = pathname;
    const document = mode === "baseline" ? baselinePayload : afterPayload;
    const body = JSON.stringify(envelope(clone(document)));
    await send("Fetch.fulfillRequest", {
      requestId: paused.requestId, responseCode: 200, responseHeaders: responseHeaders(body),
      body: Buffer.from(body).toString("base64"),
    });
    previewRequestCount += 1;
    if (previewWaiter?.mode === mode) {
      const waiter = previewWaiter; previewWaiter = undefined; clearTimeout(waiter.timer); waiter.resolve();
    }
  } catch (error) {
    fatalError = error;
    if (previewWaiter) { const waiter = previewWaiter; previewWaiter = undefined; clearTimeout(waiter.timer); waiter.reject(error); }
    await send("Fetch.continueRequest", { requestId: paused.requestId }).catch(() => {});
  }
}
function waitForPreview(requestMode) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { previewWaiter = undefined; reject(new Error(`CmsPreview request did not arrive within 45 seconds (${requestMode}).`)); }, WAIT);
    previewWaiter = { mode: requestMode, resolve, reject, timer };
  });
}
const sectionCode = `function key(e){const id=e.getAttribute("id");if(id)return"id:"+id;const h=e.querySelector("h1,h2,h3");const t=h?.textContent?.trim().replace(/\\\\s+/g," ");return t?"heading:"+t:e.tagName.toLowerCase()+":"+[...e.parentElement.children].indexOf(e)}`;
async function setViewport(viewport) { await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile }); }
async function waitForArticle() {
  const deadline = Date.now() + WAIT;
  while (Date.now() < deadline) {
    if (fatalError) throw fatalError;
    const ready = await evaluate(`Boolean(location.pathname==="/preview/guardrails-visual-fixture"&&document.querySelector("article h1")&&document.querySelector("#authority-ceiling"))`);
    if (ready) return;
    await sleep(100);
  }
  throw new Error("Protected Agent Authority preview did not become ready within 45 seconds.");
}
async function waitForAssets() {
  await evaluate(`(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(async i=>{i.loading="eager";if(!i.complete)await Promise.race([new Promise(r=>{i.addEventListener("load",r,{once:true});i.addEventListener("error",r,{once:true})}),new Promise(r=>setTimeout(r,12000))]);try{await i.decode()}catch{}}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));scrollTo(0,0);return true})()`);
}
async function navigate(viewport, nextMode) {
  mode = nextMode; imageResponses.clear(); imageRequests.clear();
  await setViewport(viewport);
  await send("Page.navigate", { url: "about:blank" }); await sleep(50);
  const before = previewRequestCount;
  const request = waitForPreview(nextMode);
  await send("Page.navigate", { url: `${baseUrl}${previewRoute}` });
  await request; await waitForArticle(); await waitForAssets();
  assert.equal(previewRequestCount, before + 1, `${nextMode} ${viewport.label}px made an unexpected number of preview requests.`);
}
async function sectionList() {
  return evaluate(`(()=>{${sectionCode}return[...document.querySelectorAll("article>header,article>section")].map(e=>{const r=e.getBoundingClientRect();return{key:key(e),top:r.top+scrollY,bottom:r.bottom+scrollY,height:r.height,guardrails:Boolean(e.querySelector("#guardrails-and-authority"))}})})()`);
}
async function sectionClip(sectionKey) {
  return evaluate(`(()=>{${sectionCode}const e=[...document.querySelectorAll("article>header,article>section")].find(x=>key(x)===${JSON.stringify(sectionKey)});if(!e)return null;const r=e.getBoundingClientRect();return{x:Math.max(0,r.left+scrollX),y:Math.max(0,r.top+scrollY),width:Math.ceil(r.width),height:Math.ceil(r.height),scale:1}})()`);
}
function slug(value) { return value.replace(/^(?:id|heading):/,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase().slice(0,70)||"section"; }
async function screenshot(name, clip) {
  const params = { format: "png", captureBeyondViewport: true };
  if (clip) params.clip = clip;
  else {
    const { contentSize } = await send("Page.getLayoutMetrics");
    params.clip = { x: 0, y: 0, width: Math.ceil(contentSize.width), height: Math.ceil(contentSize.height), scale: 1 };
  }
  const image = await send("Page.captureScreenshot", params);
  await writeFile(new URL(`${name}.png`, evidenceDirectory), Buffer.from(image.data, "base64"));
}
async function inspect(viewport) {
  const result = await evaluate(`(()=>{const s=document.querySelector("#guardrails-and-authority")?.closest("section"),h=document.querySelector("#guardrails-and-authority"),t=s?.querySelector("table"),b=t?.querySelector("tbody"),rows=[...(b?.rows||[])],sr=s?.getBoundingClientRect(),nodes=[...(s?.querySelectorAll("h3,h4,p,th,td,figcaption")||[])],overflow=nodes.filter(n=>{const r=n.getBoundingClientRect();return r.left<(sr?.left??0)-1||r.right>(sr?.right??innerWidth)+1||(getComputedStyle(n).display!=="inline"&&n.scrollWidth>n.clientWidth+2)}).map(n=>({tag:n.tagName,text:n.textContent?.trim().slice(0,100)}));const imgs=[...(s?.querySelectorAll("figure img")||[])].map(i=>{const r=i.getBoundingClientRect(),f=i.closest("figure").getBoundingClientRect();return{src:i.currentSrc||i.src,alt:i.alt,complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,width:r.width,height:r.height,figureLeft:f.left,figureRight:f.right,marginTop:parseFloat(getComputedStyle(i.closest("figure")).marginTop)||0,caption:i.closest("figure").querySelector("figcaption")?.textContent?.trim()||""}});return{sections:[...document.querySelectorAll("article>header,article>section")].map(e=>{${sectionCode};const r=e.getBoundingClientRect();return{key:key(e),top:r.top+scrollY,bottom:r.bottom+scrollY,height:r.height,guardrails:Boolean(e.querySelector("#guardrails-and-authority"))}}),guardrails:Boolean(s),headingTag:h?.tagName||"",headingId:h?.id||"",h4:[...(s?.querySelectorAll("h4")||[])].map(e=>e.textContent?.trim()),local:[...(s?.querySelectorAll("h3,h4")||[])].map(e=>e.tagName),table:t&&{width:t.getBoundingClientRect().width,scrollWidth:t.scrollWidth,clientWidth:t.clientWidth,head:getComputedStyle(t.querySelector("thead")).display,body:getComputedStyle(b).display,rows:rows.map(r=>getComputedStyle(r).display)},images:imgs,overflow,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,viewportWidth:document.documentElement.clientWidth,sectionBounds:sr&&{left:sr.left,right:sr.right,width:sr.width}}})()`);
  assert.ok(result.documentWidth <= result.viewportWidth + 1 && result.bodyWidth <= result.viewportWidth + 1, `${viewport.label}px: body has horizontal overflow.`);
  if (!result.guardrails) return result;
  const g = afterPayload.content.guardrails;
  assert.equal(result.headingTag, "H3", `${viewport.label}px: guardrails anchor must be an h3.`);
  assert.equal(result.headingId, "guardrails-and-authority", `${viewport.label}px: guardrails h3 anchor changed.`);
  assert.deepEqual(result.h4, [g.comparisonHeading, g.unit.heading, g.interaction.heading, g.designRule.heading], `${viewport.label}px: expected four h4 headings.`);
  assert.deepEqual(result.local, ["H3","H4","H4","H4","H4"], `${viewport.label}px: guardrails heading hierarchy changed.`);
  assert.deepEqual(result.overflow, [], `${viewport.label}px: guardrails text overflows or is clipped.`);
  assert.equal(result.images.length, 2, `${viewport.label}px: expected two guardrails figures.`);
  const expected = [g.firstFigure, g.secondFigure];
  for (const [index, image] of result.images.entries()) {
    const figure = expected[index];
    assert.ok(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0, `${viewport.label}px: figure ${index + 1} did not load.`);
    assert.equal(image.alt, figure.altText, `${viewport.label}px: figure ${index + 1} alt text changed.`);
    assert.equal(new URL(image.src).pathname, `/images/cognirise/${figure.asset}`, `${viewport.label}px: wrong figure asset.`);
    assert.ok(Math.abs(image.naturalWidth / image.naturalHeight - (index ? 1200 / 760 : 1200 / 700)) < 0.002, `${viewport.label}px: figure ${index + 1} aspect ratio changed.`);
    assert.ok(image.width > 0 && image.height > 0 && image.marginTop >= 32, `${viewport.label}px: figure ${index + 1} has invalid bounds or margin.`);
    assert.ok(image.figureLeft >= result.sectionBounds.left - 1 && image.figureRight <= result.sectionBounds.right + 1, `${viewport.label}px: figure ${index + 1} escapes section bounds.`);
    assert.ok(image.caption.includes(figure.captionLabel) && image.caption.includes(figure.captionLead) && image.caption.includes(figure.captionBody), `${viewport.label}px: figure ${index + 1} caption changed.`);
    assert.equal(imageResponses.get(image.src)?.status, 200, `${viewport.label}px: ${figure.asset} did not return HTTP 200.`);
  }
  assert.ok(result.table && result.table.width <= result.sectionBounds.width + 1 && result.table.scrollWidth <= result.table.clientWidth + 1, `${viewport.label}px: comparison table overflows.`);
  if (viewport.mobile) {
    assert.equal(result.table.head, "none", `${viewport.label}px: mobile table header is not hidden.`);
    assert.equal(result.table.body, "grid", `${viewport.label}px: mobile table body did not stack.`);
    assert.ok(result.table.rows.every((display) => display === "grid"), `${viewport.label}px: mobile table rows did not stack.`);
  } else assert.notEqual(result.table.head, "none", `${viewport.label}px: desktop table header is hidden.`);
  return result;
}
async function hashCheck(viewport) {
  await evaluate(`history.replaceState(history.state,"",location.pathname+location.search);location.hash="guardrails-and-authority";true`);
  await sleep(200);
  const result = await evaluate(`(()=>{const r=document.querySelector("#guardrails-and-authority")?.getBoundingClientRect();return{hash:location.hash,visible:Boolean(r&&r.top<innerHeight&&r.bottom>0)}})()`);
  assert.equal(result.hash, "#guardrails-and-authority", `${viewport.label}px: hash navigation failed.`);
  assert.equal(result.visible, true, `${viewport.label}px: hash target is not visible.`);
}
const evidence = {
  route: previewRoute, previewEndpoint: "CmsPreview protected fetch (Request-stage browser mock)",
  navigationEndpoint: navigationPath, fixture: fixturePath,
  baselineLabel: "reconstructed baseline: same saved draft payload with content.guardrails removed; not an original screenshot",
  afterLabel: "exact saved draft payload from GUARDRAILS_FIXTURE",
  visualComparison: "browser Fetch interception only; no CMS/database mutation",
  viewports: {},
};
const baselineKeys = [];
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*preview/guardrails-visual-fixture*", requestStage: "Request" }] });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `(()=>{const s=()=>{const e=document.createElement("style");e.textContent="html,body,*{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}";document.head?.append(e)};document.head?s():document.addEventListener("DOMContentLoaded",s,{once:true})})();` });
  for (const viewport of viewports) {
    const before = await (async () => { await navigate(viewport, "baseline"); const inspection = await inspect(viewport); await evaluate("scrollTo(0,0);true"); await screenshot(`baseline-${viewport.label}-fullpage`); const sections = await sectionList(); for (const section of sections) { const clip = await sectionClip(section.key); await screenshot(`baseline-${viewport.label}-section-${slug(section.key)}`, clip); } return { inspection, sections }; })();
    if (!baselineKeys.length) baselineKeys.push(...before.sections.map((section) => section.key));
    assert.deepEqual(before.sections.map((section) => section.key), baselineKeys, `${viewport.label}px: reconstructed baseline section order changed.`);
    assert.equal(before.inspection.guardrails, false, `${viewport.label}px: reconstructed baseline contains guardrails.`);
    evidence.viewports[viewport.label] = { baselineSections: before.sections };
  }
  for (const viewport of viewports) {
    const after = await navigate(viewport, "after");
    const inspection = await inspect(viewport);
    const sections = inspection.sections;
    assert.deepEqual(sections.filter((section) => baselineKeys.includes(section.key)).map((section) => section.key), baselineKeys, `${viewport.label}px: existing section order changed.`);
    const newIndex = sections.findIndex((section) => section.guardrails);
    const authorityIndex = sections.findIndex((section) => section.key === "id:authority-ceiling");
    assert.ok(newIndex > 0 && newIndex < authorityIndex, `${viewport.label}px: guardrails section is not before authority ceiling.`);
    assert.equal(inspection.guardrails, true, `${viewport.label}px: exact preview payload did not render guardrails.`);
    await evaluate("scrollTo(0,0);true"); await screenshot(`after-${viewport.label}-fullpage`);
    for (const section of sections.filter((item) => baselineKeys.includes(item.key) || item.guardrails)) {
      const clip = await sectionClip(section.key); assert.ok(clip?.height > 0, `${viewport.label}px: section capture has no bounds.`);
      await screenshot(`after-${viewport.label}-section-${slug(section.key)}`, clip);
    }
    await hashCheck(viewport);
    const before = evidence.viewports[viewport.label].baselineSections;
    evidence.viewports[viewport.label].afterSections = sections;
    evidence.viewports[viewport.label].sectionDisplacements = before.map((item) => {
      const current = sections.find((section) => section.key === item.key);
      return { key: item.key, beforeY: item.top, afterY: current?.top ?? null, displacement: current ? current.top - item.top : null };
    });
  }
  assert.equal(previewRequestCount, 4, "Expected one intercepted protected preview request per mode and viewport.");
  assert.ok(previewEndpointSeen, "No CmsPreview endpoint was intercepted.");
  assert.deepEqual(fatalError, undefined, `Browser console/runtime error: ${fatalError?.message}`);
  evidence.previewEndpoint = previewEndpointSeen; evidence.previewRequestCount = previewRequestCount;
  evidence.consoleErrors = []; evidence.fixturePayloadKeys = Object.keys(payload).sort();
  await writeFile(new URL("run.json", evidenceDirectory), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Guardrails protected-preview validation passed; evidence saved in ${evidenceDirectory.pathname}`);
} finally {
  if (previewWaiter) { clearTimeout(previewWaiter.timer); previewWaiter.reject(new Error("Browser test ended.")); }
  socket.close(); if (browser.exitCode === null) browser.kill("SIGTERM");
  await Promise.race([browserExited, sleep(2000)]); if (browser.exitCode === null) browser.kill("SIGKILL");
  await rm(profilePath, { recursive: true, force: true }).catch(() => {});
}