import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateSvgImages } from "./linkedin-export-integrity.mjs";
import { compareLinkedinExport } from "./linkedin-visual-comparison.mjs";

const expectFailure = (svg, message) => {
  assert.throws(() => validateSvgImages(svg, "fixture.svg"), message);
};

test("rejects an SVG with no Pulse image", () => {
  expectFailure("<svg></svg>", /does not contain an embedded Pulse image/);
});

test("rejects an external mockup-server image", () => {
  expectFailure(
    '<svg><image href="/__mockup/images/cognirise/pulse.jpg"/></svg>',
    /malformed or unsupported embedded image/,
  );
});

test("rejects an empty image data URI", () => {
  expectFailure(
    '<svg><image href="data:image/jpeg;base64,"/></svg>',
    /malformed or unsupported embedded image/,
  );
});

test("rejects corrupt embedded image data", () => {
  expectFailure(
    `<svg><image href="data:image/jpeg;base64,${Buffer.alloc(12_000).toString("base64")}"/></svg>`,
    /invalid JPEG signature/,
  );
});

test("accepts a PNG rendered from its matching SVG", () => {
  const directory = mkdtempSync(join(tmpdir(), "linkedin-visual-test-"));
  try {
    const svgPath = join(directory, "matching.svg");
    const pngPath = join(directory, "matching.png");
    writeFileSync(
      svgPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#142738"/></svg>',
    );
    writeFileSync(
      pngPath,
      readFileSync(
        new URL(
          "../public/images/cognirise/linkedin/cognirise-linkedin-action.png",
          import.meta.url,
        ),
      ),
    );
    execFileSync("magick", ["-background", "none", svgPath, `PNG32:${pngPath}`]);

    const result = compareLinkedinExport({
      svgPath,
      pngPath,
      width: 100,
      height: 100,
      temporaryDirectory: directory,
      comparisonOutputDirectory: join(directory, "comparison-output"),
    });
    assert.equal(result.changedPixels, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects a visibly stale PNG and writes comparison output", () => {
  const directory = mkdtempSync(join(tmpdir(), "linkedin-visual-test-"));
  try {
    const svgPath = join(directory, "stale.svg");
    const pngPath = join(directory, "stale.png");
    const outputDirectory = join(directory, "comparison-output");
    writeFileSync(
      svgPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#142738"/></svg>',
    );
    execFileSync("magick", [
      "-size",
      "100x100",
      "xc:#ffffff",
      `PNG32:${pngPath}`,
    ]);

    assert.throws(
      () =>
        compareLinkedinExport({
          svgPath,
          pngPath,
          width: 100,
          height: 100,
          temporaryDirectory: directory,
          comparisonOutputDirectory: outputDirectory,
        }),
      /10000 pixels differ.*Comparison files:/,
    );
    assert.equal(readFileSync(join(outputDirectory, "stale-rendered.png")).length > 0, true);
    assert.equal(readFileSync(join(outputDirectory, "stale-diff.png")).length > 0, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});