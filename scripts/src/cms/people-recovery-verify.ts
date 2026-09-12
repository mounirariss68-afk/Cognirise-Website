import { pathToFileURL } from "node:url";
import { emitJson, outputPath } from "./common.js";
import { verifyPeopleRecovery } from "./people-recovery.js";

export async function main() {
  const args = process.argv.slice(2);
  const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("People recovery verification is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("People recovery verification requires the explicit --target=development safeguard.");
  }
  if (args.includes("--allow-unpublished")) {
    throw new Error("--allow-unpublished is obsolete; recovery is always draft-only and publication uses the authenticated normal CMS workflow.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const result = await verifyPeopleRecovery();
  const destination = outputPath(
    args.find((argument) => argument.startsWith("--out="))?.slice(6),
    "people-recovery-verification.json",
  );
  await emitJson(result, destination, args.includes("--write"));
  if (!result.ok) {
    throw new Error(`People recovery verification failed: ${result.errors.join("; ")}`);
  }
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}