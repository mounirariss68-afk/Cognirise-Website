import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readPngDimensions,
  validateSvgImages,
} from "./linkedin-export-integrity.mjs";
import {
  archiveName,
  expectedArchiveFiles,
  expectedPngFiles,
  imageLedSvgFiles,
} from "./linkedin-bundle-manifest.mjs";

const assetDirectory = fileURLToPath(
  new URL("../public/images/cognirise/linkedin/", import.meta.url),
);
const fail = (message) => {
  throw new Error(`LinkedIn export integrity check failed: ${message}`);
};

const files = readdirSync(assetDirectory).sort();
for (const svgFile of imageLedSvgFiles) {
  if (!files.includes(svgFile)) fail(`${svgFile} is missing`);
  const svg = readFileSync(join(assetDirectory, svgFile), "utf8");
  validateSvgImages(svg, svgFile);
}

for (const pngFile of expectedPngFiles) {
  if (!files.includes(pngFile)) fail(`${pngFile} is missing`);

  const expected = pngFile.includes("-header-")
    ? { width: 1584, height: 396 }
    : { width: 1080, height: 1350 };
  const actual = readPngDimensions(
    readFileSync(join(assetDirectory, pngFile)),
    pngFile,
  );

  if (actual.width !== expected.width || actual.height !== expected.height) {
    fail(
      `${pngFile} is ${actual.width}×${actual.height}; expected ${expected.width}×${expected.height}`,
    );
  }
}

const archivePath = join(assetDirectory, archiveName);
let archiveFiles;
try {
  archiveFiles = execFileSync("unzip", ["-Z1", archivePath], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replace(/^\.\//, ""));
} catch {
  fail(`${archiveName} is missing or unreadable`);
}

if (!archiveFiles.every((file, index) => file === expectedArchiveFiles[index])) {
  fail(`ZIP entries are not in deterministic order: ${expectedArchiveFiles.join(", ")}`);
}

const missingArchiveFiles = expectedArchiveFiles.filter((file) => !archiveFiles.includes(file));
const unexpectedArchiveFiles = archiveFiles.filter((file) => !expectedArchiveFiles.includes(file));
if (missingArchiveFiles.length > 0 || unexpectedArchiveFiles.length > 0) {
  fail(
    [
      missingArchiveFiles.length > 0
        ? `missing from ZIP: ${missingArchiveFiles.join(", ")}`
        : "",
      unexpectedArchiveFiles.length > 0
        ? `unexpected in ZIP: ${unexpectedArchiveFiles.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
}

for (const file of expectedArchiveFiles) {
  const archivedContents = execFileSync("unzip", ["-p", archivePath, file], {
    maxBuffer: 50 * 1024 * 1024,
  });
  const sourceContents = readFileSync(join(assetDirectory, file));
  if (!archivedContents.equals(sourceContents)) {
    fail(`${file} in the ZIP does not match the current source file`);
  }
}

console.log(
  `LinkedIn exports valid: ${imageLedSvgFiles.length} embedded SVGs, ${expectedPngFiles.length} correctly sized PNGs, and ${archiveFiles.length} complete ZIP entries.`,
);