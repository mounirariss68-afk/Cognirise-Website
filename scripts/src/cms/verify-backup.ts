import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const output = process.argv.slice(2).find((arg) => arg.startsWith("--out="))?.slice(6);
const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");

async function main() {
  if (!output) throw new Error("Backup directory is required: pass --out=/private/backup-directory.");
  const directory = path.resolve(output);
  const [backupText, manifestText, directoryStat, backupStat, manifestStat] = await Promise.all([
    readFile(path.join(directory, "content-metadata.json"), "utf8"),
    readFile(path.join(directory, "manifest.json"), "utf8"),
    stat(directory), stat(path.join(directory, "content-metadata.json")), stat(path.join(directory, "manifest.json")),
  ]);
  if (!directoryStat.isDirectory() || (directoryStat.mode & 0o077) || (backupStat.mode & 0o077) || (manifestStat.mode & 0o077)) {
    throw new Error("Backup directory/files must not be group- or world-accessible.");
  }
  const backup = JSON.parse(backupText) as Record<string, any>;
  const manifest = JSON.parse(manifestText) as { schemaVersion: number; sha256: string; counts: Record<string, number> };
  if (backup.schemaVersion !== 1 || manifest.schemaVersion !== 1) throw new Error("Unsupported backup manifest version.");
  if (manifest.sha256 !== sha256(backupText)) throw new Error("Backup checksum does not match manifest.");
  const counts: Record<string, number> = {
    markets: backup.configuration?.markets?.length, taxonomies: backup.configuration?.taxonomies?.length,
    taxonomyTerms: backup.configuration?.taxonomyTerms?.length, documents: backup.documents?.length,
    editions: backup.editions?.length, revisions: backup.revisions?.length,
    documentTerms: backup.documentTerms?.length, redirects: backup.redirects?.length,
    mediaAssets: backup.media?.assets?.length, mediaVersions: backup.media?.versions?.length,
    mediaReferences: backup.media?.references?.length,
  };
  for (const [key, value] of Object.entries(counts)) if (!Number.isInteger(value) || manifest.counts[key] !== value) throw new Error(`Manifest count mismatch for ${key}.`);
  console.log(`Verified CMS content metadata backup: ${counts.documents} documents, ${counts.revisions} revisions.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });