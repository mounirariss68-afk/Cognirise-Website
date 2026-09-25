import { pool } from "@workspace/db";
import {
  assertPulsePlatformDraftStageSafety,
  PULSE_PLATFORM_DRAFT_LOCALE,
  PULSE_PLATFORM_DRAFT_MARKET,
  PULSE_PLATFORM_DRAFT_TARGETS,
  stagePulsePlatformDrafts,
} from "./pulse-platform-draft-staging.js";

function describePlan(
  slug: string,
  plan: Awaited<ReturnType<typeof stagePulsePlatformDrafts>>[number],
) {
  const identity = "documentId" in plan
    ? ` (document ${plan.documentId}${"editionId" in plan ? `, edition ${plan.editionId}` : ""})`
    : "";
  return `${slug}: ${plan.outcome}${identity}${"revisionId" in plan ? `, revision ${plan.revisionId}` : ""}, digest ${plan.digest}`;
}

async function main() {
  const { apply } = assertPulsePlatformDraftStageSafety(process.argv.slice(2));
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    const plans = await stagePulsePlatformDrafts(client, apply);
    await client.query("COMMIT");
    committed = true;
    process.stdout.write(
      `${apply ? "Development-only CMS draft staging completed" : "Dry run only; no CMS rows were changed"} for ${PULSE_PLATFORM_DRAFT_MARKET}/${PULSE_PLATFORM_DRAFT_LOCALE}:\n`,
    );
    for (let index = 0; index < plans.length; index++) {
      process.stdout.write(`- ${describePlan(PULSE_PLATFORM_DRAFT_TARGETS[index].slug, plans[index])}\n`);
    }
    process.stdout.write(
      "Human work still required: editors validate structured fields, references, accessibility text, market inheritance, and an authenticated preview; the content owner verifies facts and evidence-backed claims, named-client permissions, sources, verification dates, review dates, and approvals (this import supplied no evidence); administrators review role boundaries, visibility, canonical routes/redirects, SEO/social metadata, related records, and UAE/override publication state. No media was selected; any later media choice needs its own rights/accessibility review. An authorized human must complete the normal review/MFA and publish flow and record its audit result. This command did none of these things.\n",
    );
  } catch (error) {
    if (!committed) await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});