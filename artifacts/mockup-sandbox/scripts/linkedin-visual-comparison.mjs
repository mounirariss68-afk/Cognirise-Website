import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";

// Ignore sub-visible per-channel rasterization noise, but fail when more than
// 0.1% of pixels differ. At 1080×1350 this permits at most 1,458 noisy pixels.
export const visualTolerance = {
  fuzzPercent: 2,
  maximumChangedPixelRatio: 0.001,
};

const runImageMagick = (args) => {
  try {
    return execFileSync("magick", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const detail = error.stderr?.trim() || error.message;
    throw new Error(`ImageMagick failed: ${detail}`);
  }
};

export const compareLinkedinExport = ({
  svgPath,
  pngPath,
  width,
  height,
  temporaryDirectory,
  comparisonOutputDirectory,
}) => {
  const assetName = basename(svgPath, ".svg");
  const renderedPath = join(temporaryDirectory, `${assetName}-rendered.png`);

  runImageMagick([
    "-background",
    "none",
    svgPath,
    "-resize",
    `${width}x${height}!`,
    `PNG32:${renderedPath}`,
  ]);

  const comparison = spawnSync(
    "magick",
    [
      "compare",
      "-metric",
      "AE",
      "-fuzz",
      `${visualTolerance.fuzzPercent}%`,
      renderedPath,
      pngPath,
      "null:",
    ],
    { encoding: "utf8" },
  );
  const metric = (comparison.stderr || comparison.stdout).trim();
  const changedPixels = Number(metric.match(/^[0-9.eE+-]+/)?.[0]);

  if (!Number.isFinite(changedPixels)) {
    throw new Error(
      `${assetName}: ImageMagick comparison failed: ${metric || comparison.error?.message || "unknown error"}`,
    );
  }

  const changedPixelRatio = changedPixels / (width * height);
  if (changedPixelRatio <= visualTolerance.maximumChangedPixelRatio) {
    return { changedPixels, changedPixelRatio };
  }

  mkdirSync(comparisonOutputDirectory, { recursive: true });
  const savedRenderedPath = join(comparisonOutputDirectory, `${assetName}-rendered.png`);
  const diffPath = join(comparisonOutputDirectory, `${assetName}-diff.png`);
  copyFileSync(renderedPath, savedRenderedPath);
  spawnSync(
    "magick",
    [
      "compare",
      "-fuzz",
      `${visualTolerance.fuzzPercent}%`,
      renderedPath,
      pngPath,
      diffPath,
    ],
    { encoding: "utf8" },
  );

  throw new Error(
    `${assetName}: ${changedPixels} pixels differ (${(changedPixelRatio * 100).toFixed(3)}%; maximum ${(visualTolerance.maximumChangedPixelRatio * 100).toFixed(3)}%). Comparison files: ${savedRenderedPath}, ${diffPath}`,
  );
};