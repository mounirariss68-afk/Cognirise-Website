import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  CMS_RELEASE_REGISTRY,
  buildReleaseCandidateBodySchema,
  publishReleaseBodySchema,
  releaseScopeSchema,
  rollbackReleaseBodySchema,
} from "@workspace/api-zod";
import { authenticate, requireAdministrator, requireCsrf, requireMfa, type AuthContext } from "../lib/auth";
import { asyncRoute } from "../lib/http";
import {
  audit,
  existingOperationReceipt,
  operationDigest,
  requestDigest,
  reserveOperationReceipt,
  saveOperationReceipt,
} from "../lib/cms";
import {
  buildReleaseCandidate,
  publicReleaseManifest,
  releaseDigest,
  releaseInventory,
} from "../lib/release-contract";

const router: IRouter = Router();
router.use("/releases", authenticate, requireMfa);

function releaseReceipt(row: Record<string, any>) {
  return {
    id: String(row.id),
    releaseNumber: Number(row.release_number),
    releasedAt: row.released_at,
    integrityDigest: row.integrity_digest,
  };
}

router.get("/releases/registry", (_req, res) => res.json(CMS_RELEASE_REGISTRY));
router.get("/releases/inventory", requireAdministrator, asyncRoute(async (_req, res) => {
  const markets = await pool.query(
    `SELECT code,default_locale,fallback_market_code,fallback_locale
       FROM market_editions WHERE enabled=true ORDER BY code`,
  );
  const migration = await pool.query(
    `SELECT record_type,status,count(*)::int count FROM cms_release_migration_records
      GROUP BY record_type,status ORDER BY record_type,status`,
  );
  res.json({ ...releaseInventory(), enabledMarkets: markets.rows, migration: migration.rows });
}));

router.get("/releases/history", requireAdministrator, asyncRoute(async (req, res) => {
  const parsed = releaseScopeSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid release scope." }); return; }
  const result = await pool.query(
    `SELECT id::text,release_number,status,registry_version,validation_digest,
            integrity_digest,released_at,previous_release_id::text,
            publisher_user_id::text,
            (SELECT release_id=receipt.id FROM cms_active_releases
              WHERE market=receipt.market AND locale=receipt.locale) active
       FROM cms_release_receipts receipt
      WHERE market=$1 AND locale=$2
      ORDER BY release_number DESC LIMIT 100`,
    [parsed.data.market, parsed.data.locale],
  );
  res.json({
    scope: parsed.data,
    items: result.rows.map((row) => ({
      id: row.id,
      releaseNumber: Number(row.release_number),
      status: row.status,
      registryVersion: row.registry_version,
      validationDigest: row.validation_digest,
      integrityDigest: row.integrity_digest,
      releasedAt: row.released_at,
      previousReleaseId: row.previous_release_id,
      publisherId: row.publisher_user_id,
      active: Boolean(row.active),
    })),
  });
}));

router.post("/releases/candidates", requireCsrf, requireAdministrator, asyncRoute(async (req, res) => {
  const parsed = buildReleaseCandidateBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid release scope.", details: parsed.error.issues }); return; }
  const auth = res.locals.auth as AuthContext;
  const candidate = await buildReleaseCandidate(pool, parsed.data.market, parsed.data.locale, auth.user.id);
  const saved = await pool.query(
    `INSERT INTO cms_release_candidates
      (market,locale,registry_version,manifest,validation,validation_digest,
       submitted_by_user_id,reviewer_user_id,approver_user_id,separation_of_duties_valid,created_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id::text,created_at`,
    [parsed.data.market, parsed.data.locale, CMS_RELEASE_REGISTRY.version, candidate.manifest,
      candidate.validation, candidate.validationDigest,
      candidate.actors.revisions[0]?.submitterId ?? null,
      candidate.actors.revisions[0]?.reviewerId ?? null,
      candidate.actors.revisions[0]?.approverId ?? null,
      candidate.separationValid, auth.user.id],
  );
  await audit(auth, "release.candidate_created", "release-candidate", saved.rows[0].id, {
    market: parsed.data.market, locale: parsed.data.locale, ready: candidate.validation.ready,
  });
  res.status(201).json({ id: saved.rows[0].id, createdAt: saved.rows[0].created_at, ...candidate });
}));

router.get("/releases/readiness", requireAdministrator, asyncRoute(async (req, res) => {
  const parsed = releaseScopeSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid release scope." }); return; }
  res.json(await buildReleaseCandidate(pool, parsed.data.market, parsed.data.locale, (res.locals.auth as AuthContext).user.id));
}));

router.get("/releases/impact", requireAdministrator, asyncRoute(async (req, res) => {
  const parsed = releaseScopeSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid release scope." }); return; }
  const candidate = await buildReleaseCandidate(pool, parsed.data.market, parsed.data.locale, (res.locals.auth as AuthContext).user.id);
  res.json({
    scope: parsed.data,
    links: candidate.manifest.resolvedLinks,
    media: candidate.manifest.mediaPins,
    unavailableLinks: candidate.validation.errors.filter((error) => error.includes("destination")),
    orphanedMedia: [],
  });
}));

router.post("/releases/publish", requireCsrf, requireAdministrator, asyncRoute(async (req, res) => {
  const parsed = publishReleaseBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid release publication." }); return; }
  const auth = res.locals.auth as AuthContext;
  const operation = "release.published";
  const subjectId = parsed.data.candidateId;
  const bodyDigest = requestDigest({ candidateId: parsed.data.candidateId });
  const operationKey = operationDigest(auth.user.id, operation, subjectId, parsed.data.idempotencyKey);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const prior = await existingOperationReceipt(client, operationKey, operation, subjectId, bodyDigest, auth.user.id);
    if (prior?.response) {
      await client.query("ROLLBACK");
      res.status(prior.statusCode ?? 201).json(prior.response);
      return;
    }
    const reserved = await reserveOperationReceipt(client, {
      idempotencyKey: operationKey, operation, subjectId, requestDigest: bodyDigest, actorUserId: auth.user.id,
    });
    if (!reserved) {
      const committed = await existingOperationReceipt(client, operationKey, operation, subjectId, bodyDigest, auth.user.id);
      if (committed?.response) {
        await client.query("ROLLBACK");
        res.status(committed.statusCode ?? 201).json(committed.response);
        return;
      }
      throw Object.assign(new Error("This release publication is already in progress."), { code: "IDEMPOTENCY_CONFLICT" });
    }
    const candidate = await client.query(
      `SELECT * FROM cms_release_candidates WHERE id=$1 FOR UPDATE`,
      [parsed.data.candidateId],
    );
    if (!candidate.rowCount) { await client.query("ROLLBACK"); res.status(404).json({ error: "Release candidate not found." }); return; }
    const row = candidate.rows[0];
    const alreadyPublished = await client.query(
      `SELECT id::text,release_number,released_at,integrity_digest
         FROM cms_release_receipts WHERE candidate_id=$1 AND status='released'
         ORDER BY release_number LIMIT 1`,
      [row.id],
    );
    if (alreadyPublished.rowCount) {
      const response = releaseReceipt(alreadyPublished.rows[0]);
      await saveOperationReceipt(client, {
        idempotencyKey: operationKey, operation, subjectId, requestDigest: bodyDigest,
        actorUserId: auth.user.id, statusCode: 200, response,
      });
      await client.query("COMMIT");
      res.status(200).json(response);
      return;
    }
    if (!row.validation?.ready || !row.separation_of_duties_valid) {
      await client.query("ROLLBACK"); res.status(409).json({ error: "Only a ready candidate with valid actor separation can be released.", validation: row.validation }); return;
    }
    const previous = await client.query(
      `SELECT release_id::text FROM cms_active_releases WHERE market=$1 AND locale=$2 FOR UPDATE`,
      [row.market, row.locale],
    );
    const integrityDigest = releaseDigest({
      candidateId: parsed.data.candidateId, validationDigest: row.validation_digest,
      market: row.market, locale: row.locale, previousReleaseId: previous.rows[0]?.release_id ?? null,
      publisherId: auth.user.id,
    });
    const inserted = await client.query(
      `INSERT INTO cms_release_receipts
        (market,locale,registry_version,candidate_id,manifest,validation_digest,status,
         previous_release_id,submitter_user_id,reviewer_user_id,approver_user_id,publisher_user_id,
         grant_version,separation_of_duties_valid,integrity_digest)
       VALUES ($1,$2,$3,$4,$5,$6,'released',$7,$8,$9,$10,$11,$12,true,$13)
       ON CONFLICT (integrity_digest) DO NOTHING
       RETURNING id::text,release_number,released_at,integrity_digest`,
      [row.market, row.locale, row.registry_version, row.id, row.manifest, row.validation_digest,
        previous.rows[0]?.release_id ?? null, row.submitted_by_user_id, row.reviewer_user_id,
        row.approver_user_id, auth.user.id, row.grant_version, integrityDigest],
    );
    const publishedReceipt = inserted.rows[0] ?? (await client.query(
      `SELECT id::text,release_number,released_at,integrity_digest
         FROM cms_release_receipts WHERE integrity_digest=$1`,
      [integrityDigest],
    )).rows[0];
    await client.query(
      `INSERT INTO cms_active_releases(market,locale,release_id) VALUES ($1,$2,$3)
       ON CONFLICT (market,locale) DO UPDATE SET release_id=EXCLUDED.release_id,updated_at=now()`,
      [row.market, row.locale, publishedReceipt.id],
    );
    await audit(auth, "release.published", "release", publishedReceipt.id, {
      market: row.market, locale: row.locale, candidateId: row.id,
    }, client);
    const response = releaseReceipt(publishedReceipt);
    await saveOperationReceipt(client, {
      idempotencyKey: operationKey, operation, subjectId, requestDigest: bodyDigest,
      actorUserId: auth.user.id, statusCode: 201, response,
    });
    await client.query("COMMIT");
    res.status(201).json(response);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}));

router.post("/releases/rollback", requireCsrf, requireAdministrator, asyncRoute(async (req, res) => {
  const parsed = rollbackReleaseBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid rollback request." }); return; }
  const auth = res.locals.auth as AuthContext;
  const operation = "release.rolled_back";
  const subjectId = parsed.data.releaseId;
  const bodyDigest = requestDigest({ releaseId: parsed.data.releaseId });
  const operationKey = operationDigest(auth.user.id, operation, subjectId, parsed.data.idempotencyKey);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const prior = await existingOperationReceipt(client, operationKey, operation, subjectId, bodyDigest, auth.user.id);
    if (prior?.response) {
      await client.query("ROLLBACK");
      res.status(prior.statusCode ?? 201).json(prior.response);
      return;
    }
    const reserved = await reserveOperationReceipt(client, {
      idempotencyKey: operationKey, operation, subjectId, requestDigest: bodyDigest, actorUserId: auth.user.id,
    });
    if (!reserved) {
      const committed = await existingOperationReceipt(client, operationKey, operation, subjectId, bodyDigest, auth.user.id);
      if (committed?.response) {
        await client.query("ROLLBACK");
        res.status(committed.statusCode ?? 201).json(committed.response);
        return;
      }
      throw Object.assign(new Error("This rollback is already in progress."), { code: "IDEMPOTENCY_CONFLICT" });
    }
    const target = await client.query(`SELECT * FROM cms_release_receipts WHERE id=$1 FOR UPDATE`, [parsed.data.releaseId]);
    if (!target.rowCount) { await client.query("ROLLBACK"); res.status(404).json({ error: "Release receipt not found." }); return; }
    const row = target.rows[0];
    const active = await client.query(
      `SELECT release_id::text FROM cms_active_releases WHERE market=$1 AND locale=$2 FOR UPDATE`,
      [row.market, row.locale],
    );
    const integrityDigest = releaseDigest({ rollbackTo: row.id, from: active.rows[0]?.release_id ?? null, actor: auth.user.id });
    const receipt = await client.query(
      `INSERT INTO cms_release_receipts
        (market,locale,registry_version,candidate_id,manifest,validation_digest,status,previous_release_id,
         submitter_user_id,reviewer_user_id,approver_user_id,publisher_user_id,grant_version,
         separation_of_duties_valid,integrity_digest)
       VALUES ($1,$2,$3,$4,$5,$6,'rolled-back',$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (integrity_digest) DO NOTHING
       RETURNING id::text,release_number,released_at,integrity_digest`,
      [row.market,row.locale,row.registry_version,row.candidate_id,row.manifest,row.validation_digest,
        active.rows[0]?.release_id ?? null,row.submitter_user_id,row.reviewer_user_id,row.approver_user_id,
        auth.user.id,row.grant_version,row.separation_of_duties_valid,integrityDigest],
    );
    const rollbackReceipt = receipt.rows[0] ?? (await client.query(
      `SELECT id::text,release_number,released_at,integrity_digest
         FROM cms_release_receipts WHERE integrity_digest=$1`,
      [integrityDigest],
    )).rows[0];
    await client.query(
      `UPDATE cms_active_releases SET release_id=$3,updated_at=now() WHERE market=$1 AND locale=$2`,
      [row.market,row.locale,rollbackReceipt.id],
    );
    await audit(auth, "release.rolled_back", "release", rollbackReceipt.id, { targetReleaseId: row.id }, client);
    const response = releaseReceipt(rollbackReceipt);
    await saveOperationReceipt(client, {
      idempotencyKey: operationKey, operation, subjectId, requestDigest: bodyDigest,
      actorUserId: auth.user.id, statusCode: 201, response,
    });
    await client.query("COMMIT");
    res.status(201).json(response);
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}));

router.get("/public/releases/:market/:locale/manifest", asyncRoute(async (req, res) => {
  try {
    const manifest = await publicReleaseManifest(String(req.params.market), String(req.params.locale));
    if (!manifest) {
      res.status(404).json({ code: "RELEASE_ABSENT", error: "No release exists for this market and locale." });
      return;
    }
    res.setHeader("cache-control", "public, max-age=60, stale-while-revalidate=300");
    res.json({
      id: String(manifest.id),
      releaseNumber: Number(manifest.release_number),
      registryVersion: manifest.registry_version,
      manifest: manifest.manifest,
      validationDigest: manifest.validation_digest,
      integrityDigest: manifest.integrity_digest,
      releasedAt: manifest.released_at,
    });
  } catch (error) {
    req.log.error({ err: error }, "Release manifest service failed");
    res.status(503).json({ code: "RELEASE_SERVICE_FAILURE", error: "The release service is temporarily unavailable." });
  }
}));

export default router;