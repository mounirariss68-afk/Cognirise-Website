import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { CASE_CINEMATIC_VISUALS } from "./case-studies.js";

test("the case visual verifier is limited to commissioned cinematic artwork", async () => {
  const source = await readFile(new URL("./generate-case-visuals.ts", import.meta.url), "utf8");
  const directory = new URL("../../../artifacts/cognirise-website/public/images/cognirise/cases/cinematic/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".jpg")).sort();

  assert.equal(files.length, 21);
  assert.deepEqual(files, CASE_CINEMATIC_VISUALS.map((visual) => visual.filename).sort());
  assert.doesNotMatch(source, /renderUI|interface-screenshot|diagram-/);
});