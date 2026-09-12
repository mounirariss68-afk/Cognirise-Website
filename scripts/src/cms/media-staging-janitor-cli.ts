import {
  DEFAULT_ABANDONED_AFTER_MS,
  productionStagingStorage,
  runMediaStagingJanitor,
} from "./media-staging-janitor.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const ageArgument = args.find((argument) => argument.startsWith("--older-than-hours="));

function usage(): void {
  console.log([
    "Media staging janitor (dry-run by default)",
    "",
    "  pnpm --filter @workspace/scripts cms:media-staging-janitor --",
    "    [--apply] [--older-than-hours=24]",
    "",
    "Apply requires the explicit --apply flag. Only old staging objects with a",
    "generation proof and no asset/version/reference/published",
    "claim are eligible. Immutable object paths are never listed or deleted.",
  ].join("\n"));
}

function abandonedAfterMs(): number {
  if (!ageArgument) return DEFAULT_ABANDONED_AFTER_MS;
  const hours = Number(ageArgument.slice("--older-than-hours=".length));
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 365) {
    throw new Error("--older-than-hours must be between 0 and 8760.");
  }
  return hours * 60 * 60 * 1_000;
}

async function main(): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }
  const { pool } = await import("@workspace/db");
  try {
    const report = await runMediaStagingJanitor(
      pool,
      productionStagingStorage(),
      { apply, abandonedAfterMs: abandonedAfterMs() },
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Media staging janitor failed."}\n`);
  process.exitCode = 1;
});