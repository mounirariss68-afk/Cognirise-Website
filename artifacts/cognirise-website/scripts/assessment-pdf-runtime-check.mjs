import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

// Focused runtime check: exercise the real browser font/export module, not UI navigation.
const port = 9357;
const browser = spawn("/repl/tools/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/pulse-pdf-runtime-${process.pid}`, "about:blank"], { stdio: "ignore" });
let socket;
try {
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page"); } catch {}
    if (!target) await new Promise(r => setTimeout(r, 100));
  }
  assert(target, "Chromium did not start");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data), waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send("Page.navigate", { url: "http://127.0.0.1:80/methodologies" });
  await new Promise(r => setTimeout(r, 2500));
  const result = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const {createPulseReportPdfAsync} = await import('/src/lib/pulse-report-pdf.ts');
    const {createVtsPulseReport} = await import('/src/lib/vts-results-pdf.ts');
    const {MATURITY_DIMENSIONS} = await import('/src/lib/value-to-scale.ts');
    const {createPrioritizationPulseReport, createReadinessPulseReport, createAuthorityPulseReport} = await import('/src/lib/pulse-assessment-reports.ts');
    const {OVERSIGHT_LABELS} = await import('/src/lib/agent-authority.ts');
    const longText = 'Evidence retained for operational review. '.repeat(350) + ' ' + 'W'.repeat(200) + ' LAST_MARKER_RETAINED';
    const cases = [{id:'runtime-fixture',name:'Invoice exception review',description:'Shorten review time',scores:{value:4,feasibility:4,timeToEvidence:4,adoptionFriction:4,controlBurden:4,reusePotential:4},caveats:longText,dependencies:'Approved data access'}];
    const conditions = ['stability','access','observability','fallback','exceptions','economics'].map(id=>({id,title:id,ready:'Evidence confirmed',prepare:'Evidence requires review',stop:'Do not proceed',resolve:'Review with the accountable owner'}));
    const oversight = Object.keys(OVERSIGHT_LABELS)[0];
    const reports = [
      ['value-to-scale',createVtsPulseReport(Object.fromEntries(MATURITY_DIMENSIONS.map(d=>[d.id,3])))],
      ['use-case-prioritization',createPrioritizationPulseReport(cases)],
      ['readiness',createReadinessPulseReport({answers:Object.fromEntries(conditions.map(c=>[c.id,'prepare'])),conditions,workflowScope:'Invoice review · مراجعة الفواتير',governanceReview:longText,conditionRecords:{},result:'prepare',resultLabel:'Prepare',resultLine:'Operating conditions need evidence.',resultDetail:'Review the unresolved conditions.'})],
      ['authority',createAuthorityPulseReport({handoverDescription:'Review a bounded invoice exception',handoverType:'Action',rScore:2,hScore:2,eBand:2,ceiling:oversight,requestedOversight:oversight,aboveCeiling:false,artefactRequired:false,accountableRole:'Accounts payable lead',promotionEvidence:'Reviewed test cases',automaticDemotion:'New unexplained exceptions'})]
    ];
    const output = [];
    const legacy = createReadinessPulseReport({answers:Object.fromEntries(conditions.map(c=>[c.id,'ready'])),conditions,workflowScope:'',governanceReview:'',conditionRecords:{},result:'proceed',resultLabel:'Proceed',resultLine:'Evidence confirmed.',resultDetail:'Review IDAO entry.',legacyRecord:true});
    if (!JSON.stringify(legacy).includes('Not stored in this legacy record')) throw new Error('Legacy missing evidence is not identified');
    let incompleteRejected = false;
    try { createPrioritizationPulseReport([]); } catch { incompleteRejected = true; }
    if (!incompleteRejected) throw new Error('Incomplete report was accepted');
    incompleteRejected = false;
    try { createPrioritizationPulseReport([{...cases[0],description:''}]); } catch { incompleteRejected = true; }
    if (!incompleteRejected) throw new Error('Missing outcome was accepted');
    for (const [name,report] of reports) {
      const bytes = await createPulseReportPdfAsync(report);
      let binary=''; for(const byte of bytes) binary+=String.fromCharCode(byte);
      output.push({name,base64:btoa(binary)});
    }
    return output;
  })()` });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  const out = "artifacts/cognirise-website/evidence/assessment-runtime";
  await mkdir(out, { recursive: true });
  for (const { name, base64 } of result.result.value) {
    const path = `${out}/${name}.pdf`;
    await writeFile(path, Buffer.from(base64, "base64"));
    const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
    assert.match(text, /Cognirise|COGNIRISE/);
    assert.match(text, /Next steps/);
    assert.match(text, /Privacy and limitations/);
    assert.doesNotMatch(text, /__PAGE_COUNT__/);
    const bbox = execFileSync("pdftotext", ["-bbox", path, "-"], { encoding: "utf8" });
    for (const match of bbox.matchAll(/<word xMin="([^"]+)" yMin="[^"]+" xMax="([^"]+)"/g)) {
      assert(Number(match[1]) >= 47 && Number(match[2]) <= 549, `${name}: word exceeded report margins`);
    }
    if (name === "readiness" || name === "use-case-prioritization") assert.match(text, /LAST_MARKER_RETAINED/);
    await writeFile(`${out}/${name}.txt`, text);
    execFileSync("pdftoppm", ["-f","1","-l","2","-scale-to","1200","-png",path,`${out}/${name}`]);
    console.log(`${name}: embedded browser PDF rendered; text and final evidence verified`);
  }
} finally {
  socket?.close();
  browser.kill("SIGTERM");
}