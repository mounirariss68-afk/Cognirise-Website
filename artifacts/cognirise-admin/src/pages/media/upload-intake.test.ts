import assert from "node:assert/strict";
import test from "node:test";
import { droppedFiles, validateIntake } from "./upload-intake";

test("mixed intake preserves valid files and rejects unsupported, empty, oversized and folder files", () => {
  const valid = new File(["image"], "valid.png", { type: "image/png" });
  const oversized = { name: "large.png", type: "image/png", size: 50 * 1024 ** 2 + 1 } as File;
  const folder = { ...oversized, size: 100, webkitRelativePath: "folder/file.png" } as File;
  const result = validateIntake([valid, new File(["bad"], "bad.exe"), new File([], "empty.png", { type: "image/png" }), oversized, folder], "website");
  assert.deepEqual(result.files, [valid]);
  assert.equal(result.errors.length, 4);
  assert.equal(validateIntake([{ ...oversized, size: 50 * 1024 ** 2 } as File], "linkedin").errors.length, 0);
  assert.equal(validateIntake([{ name: "film.mp4", type: "video/mp4", size: 250 * 1024 ** 2 } as File], "motion").errors.length, 0);
  assert.equal(validateIntake([valid], "motion").errors.length, 1);
});

test("drop does not traverse directories and still retains adjacent supported file", () => {
  const file = new File(["image"], "original.png", { type: "image/png" });
  const transfer = { items: [
    { kind: "file", webkitGetAsEntry: () => ({ isDirectory: true, name: "folder" }), getAsFile: () => { throw new Error("must not read directory"); } },
    { kind: "file", webkitGetAsEntry: () => ({ isDirectory: false }), getAsFile: () => file },
  ] } as unknown as DataTransfer;
  const result = droppedFiles(transfer);
  assert.deepEqual(result.files, [file]);
  assert.match(result.errors[0], /folders are not supported/);
});