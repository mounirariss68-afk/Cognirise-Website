import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

test("generator assigns a deliberate mix of screenshot and diagram compositions", async () => {
  const source = await readFile(new URL("./generate-case-visuals.ts", import.meta.url), "utf8");
  const assignmentSource = source.match(/const COMPOSITIONS = \[([\s\S]*?)\n\s*\];/)?.[1];
  assert.ok(assignmentSource, "composition assignments are declared");
  const assignments = [...assignmentSource.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const families = new Set(assignments);

  assert.equal(assignments.length, 21);
  assert.deepEqual(families, new Set([
    "interface-screenshot",
    "diagram-data-lineage",
    "diagram-journey",
    "diagram-decision-tree",
    "diagram-topology",
    "diagram-evidence",
    "diagram-swimlane",
  ]));
  assert.equal(assignments.filter((item) => item === "interface-screenshot").length, 9);
  for (const family of families) {
    if (family !== "interface-screenshot") {
      assert.ok(assignments.filter((item) => item === family).length >= 2);
      assert.match(source, new RegExp(`composition === "${family}"`));
    }
  }
});

test("all governed case visuals are present and visually distinct", async () => {
  const directory = new URL("../../../artifacts/cognirise-website/public/images/cognirise/cases/", import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".png")).sort();
  const hashes = await Promise.all(files.map(async (file) =>
    createHash("sha256").update(await readFile(new URL(file, directory))).digest("hex"),
  ));

  assert.equal(files.length, 21);
  assert.equal(new Set(hashes).size, 21);
});
