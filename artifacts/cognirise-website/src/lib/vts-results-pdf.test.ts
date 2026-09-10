import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { MATURITY_DIMENSIONS, type MaturityAnswers } from "./value-to-scale";
import { createVtsResultsPdf } from "./vts-results-pdf";

const completeAnswers = Object.fromEntries(
  MATURITY_DIMENSIONS.map((dimension, index) => [dimension.id, (index % 5) + 1]),
) as MaturityAnswers;

test("blocks a personalized export until all seven answers are complete", () => {
  assert.throws(
    () => createVtsResultsPdf({ ...completeAnswers, outcomes: undefined }),
    /Complete all seven assessment dimensions/,
  );
});

test("generated PDF text contains the current answers, result, evidence, actions and caveats", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "vts-pdf-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const pdfPath = join(directory, "results.pdf");
  const textPath = join(directory, "results.txt");
  const pdf = createVtsResultsPdf(completeAnswers);

  assert.equal(Buffer.from(pdf.subarray(0, 8)).toString(), "%PDF-1.4");
  await writeFile(pdfPath, pdf);
  const extraction = spawnSync("pdftotext", [pdfPath, textPath], { encoding: "utf8" });
  assert.equal(extraction.status, 0, extraction.stderr);
  const text = await readFile(textPath, "utf8");
  const normalizedText = text.replace(/\s+/g, " ");

  assert.match(normalizedText, /Activating · 2\.6 \/ 5/);
  for (const [index, dimension] of MATURITY_DIMENSIONS.entries()) {
    const score = (index % 5) + 1;
    assert.ok(normalizedText.includes(`${dimension.name} — ${score} / 5`), `missing current answer for ${dimension.name}`);
    assert.ok(normalizedText.includes(dimension.evidence), `missing evidence for ${dimension.name}`);
  }
  assert.match(normalizedText, /Priorities, evidence and next actions/);
  assert.match(normalizedText, /Choose one material outcome, establish its baseline and name the executive owner\./);
  assert.match(normalizedText, /directional planning tool, not an audit, certification or benchmark/);
  assert.match(normalizedText, /not sent to Cognirise/);
});

test("PDF changes when an answer is edited and uses that answer's interpretation", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "vts-pdf-edit-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const edited = { ...completeAnswers, value: 5 };
  const pdfPath = join(directory, "edited.pdf");
  const textPath = join(directory, "edited.txt");
  await writeFile(pdfPath, createVtsResultsPdf(edited));
  const extraction = spawnSync("pdftotext", [pdfPath, textPath], { encoding: "utf8" });
  assert.equal(extraction.status, 0, extraction.stderr);
  const text = await readFile(textPath, "utf8");

  assert.match(text, /Value strategy — 5 \/ 5 · Scaling/);
  assert.match(text, /The organisation repeatedly reuses foundations and operating practices to sustain value\./);
  assert.doesNotMatch(text, /Value strategy — 1 \/ 5/);
});