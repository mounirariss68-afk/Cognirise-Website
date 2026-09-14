import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createPulseReportPdf, type PulseReport } from "./pulse-report-pdf";

const longReport: PulseReport = {
  methodId: "test-report",
  title: "Long evidence report",
  eyebrow: "Cognirise Pulse · test",
  summary: "A report used to prove that long evidence continues on later pages without clipping.",
  resultLabel: "Prepare",
  resultDetail: "The evidence needs a longer record before the next decision.",
  sections: [
    {
      heading: "Evidence record",
      answers: Array.from({ length: 24 }, (_, index) => ({
        label: `Condition ${index + 1}`,
        value: "A deliberately long evidence statement that must wrap and continue through the report pagination without being silently truncated.",
        detail: "Owner: Operations control. Reassess after the next evidence review.",
      })),
    },
  ],
  nextSteps: ["Review the evidence with the accountable owner.", "Reassess after the operating context changes."],
  limitations: ["Generated locally from page memory. No answers were transmitted."],
};

test("Pulse reports paginate long evidence and retain selectable text", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-report-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const pdfPath = join(directory, "long-report.pdf");
  const textPath = join(directory, "long-report.txt");
  await writeFile(pdfPath, createPulseReportPdf(longReport));
  const info = spawnSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert.equal(info.status, 0, info.stderr);
  assert.match(info.stdout, /Pages:\s+[2-9]/);
  const extraction = spawnSync("pdftotext", [pdfPath, textPath], { encoding: "utf8" });
  assert.equal(extraction.status, 0, extraction.stderr);
  const text = await readFile(textPath, "utf8");
  assert.match(text, /Condition 1/);
  assert.match(text, /Condition 24/);
  assert.match(text, /No answers were transmitted/);
});

test("a single oversized field paginates instead of clipping below the page", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-report-single-field-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const pdfPath = join(directory, "single-field.pdf");
  const textPath = join(directory, "single-field.txt");
  const report: PulseReport = {
    ...longReport,
    sections: [{
      heading: "One long field",
      answers: [{
        label: "Workflow notes",
        value: `${"Long evidence that must remain selectable and visible. ".repeat(850)}END-OF-FIELD`,
      }],
    }],
  };
  await writeFile(pdfPath, createPulseReportPdf(report));
  const info = spawnSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert.equal(info.status, 0, info.stderr);
  const pages = Number(info.stdout.match(/Pages:\s+(\d+)/)?.[1] ?? 0);
  assert.ok(pages >= 3, `expected the single field to span pages, got ${pages}`);
  const extraction = spawnSync("pdftotext", [pdfPath, textPath], { encoding: "utf8" });
  assert.equal(extraction.status, 0, extraction.stderr);
  assert.match(await readFile(textPath, "utf8"), /END-OF-FIELD/);
});
