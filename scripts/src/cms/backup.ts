import { createHash } from "node:crypto";
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const output = process.argv.slice(2).find((arg) => arg.startsWith("--out="))?.slice(6);
const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");

async function main() {
  if (!output) throw new Error("Backup output is required: pass --out=/private/backup-directory.");
  const directory = path.resolve(output);
  try {
    await stat(directory);
    throw new Error(`Refusing to write into existing backup directory: ${directory}`);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }
  await mkdir(directory, { recursive: false, mode: 0o700 });
  await chmod(directory, 0o700);
  const {
    cmsDocumentsTable, cmsDocumentTermsTable, cmsMarketEditionsTable, cmsMediaAssetsTable,
    cmsMediaReferencesTable, cmsMediaVersionsTable, cmsRedirectsTable, cmsRevisionsTable,
    cmsTaxonomiesTable, cmsTaxonomyTermsTable, db, marketEditionsTable, pool,
  } = await import("@workspace/db");
  try {
    const data = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      scope: "CMS content metadata only; excludes users/auth secrets/sessions/submissions/analytics/audit events and media binaries.",
      configuration: {
        markets: await db.select().from(marketEditionsTable),
        taxonomies: await db.select().from(cmsTaxonomiesTable),
        taxonomyTerms: await db.select().from(cmsTaxonomyTermsTable),
      },
      documents: await db.select().from(cmsDocumentsTable),
      editions: await db.select().from(cmsMarketEditionsTable),
      revisions: await db.select().from(cmsRevisionsTable),
      documentTerms: await db.select().from(cmsDocumentTermsTable),
      redirects: await db.select().from(cmsRedirectsTable),
      media: {
        assets: await db.select().from(cmsMediaAssetsTable),
        versions: await db.select().from(cmsMediaVersionsTable),
        references: await db.select().from(cmsMediaReferencesTable),
      },
    };
    const backup = `${JSON.stringify(data, null, 2)}\n`;
    const counts = {
      markets: data.configuration.markets.length, taxonomies: data.configuration.taxonomies.length,
      taxonomyTerms: data.configuration.taxonomyTerms.length, documents: data.documents.length,
      editions: data.editions.length, revisions: data.revisions.length,
      documentTerms: data.documentTerms.length, redirects: data.redirects.length,
      mediaAssets: data.media.assets.length, mediaVersions: data.media.versions.length,
      mediaReferences: data.media.references.length,
    };
    const manifest = `${JSON.stringify({
      schemaVersion: 1, createdAt: new Date().toISOString(), backupFile: "content-metadata.json",
      sha256: sha256(backup), counts,
      limitations: ["No database dump", "No media binaries", "No auth secrets/sessions", "No form submissions", "No raw analytics"],
    }, null, 2)}\n`;
    await writeFile(path.join(directory, "content-metadata.json"), backup, { mode: 0o600 });
    await writeFile(path.join(directory, "manifest.json"), manifest, { mode: 0o600 });
    await chmod(path.join(directory, "content-metadata.json"), 0o600);
    await chmod(path.join(directory, "manifest.json"), 0o600);
    console.log(`Exported CMS content metadata backup to ${directory}.`);
  } finally {
    await pool.end();
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });