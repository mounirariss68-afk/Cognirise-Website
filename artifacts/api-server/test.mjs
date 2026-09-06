import { readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";

const outputDirectory = ".test-dist";

try {
  const entryPoints = (await readdir("tests"))
    .filter((file) => file.endsWith(".test.ts"))
    .map((file) => `tests/${file}`);

  await build({
    entryPoints,
    outdir: outputDirectory,
    outExtension: { ".js": ".cjs" },
    bundle: true,
    platform: "node",
    format: "cjs",
    external: [
      "@google-cloud/storage",
      "pino",
      "pino-http",
      "pino-pretty",
      "sharp",
      "thread-stream",
    ],
  });

  const testFiles = entryPoints.map(
    (file) => `${outputDirectory}/${file.slice("tests/".length, -".ts".length)}.cjs`,
  );
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}