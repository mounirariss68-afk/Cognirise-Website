import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("generic review and publication validate site configuration and pin requested versions", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  assert.match(source, /validateSnapshot\([^,]+\.kind, [^,]+, "draft"\)/);
  assert.match(source, /validateSnapshot\(revision\.rows\[0\]\.kind, revision\.rows\[0\]\.payload, "publish"\)/);
  assert.match(source, /"\/documents\/:documentId\/publish",[\s\S]*?requirePublisher/);
  assert.match(source, /collectCmsMediaReferences/);
  assert.match(source, /reference\.mediaVersionId/);
  assert.match(source, /id::text=\$4::jsonb->>asset\.id::text/);
  assert.match(source, /Publication references unavailable media/);
});

test("publication aborts before pointer advancement when review transition loses a race", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  assert.match(source, /const approved = directAdministratorPublish[\s\S]*?workflow_state='in-review'/);
  assert.match(source, /if \(approved\.rowCount !== 1\) \{[\s\S]*?ROLLBACK[\s\S]*?selected revision is no longer in review/);
  const transition = source.indexOf("const approved = directAdministratorPublish");
  const pointer = source.indexOf("UPDATE cms_market_editions SET publication_state", transition);
  assert.ok(transition >= 0 && pointer > transition);
  assert.ok(source.indexOf("if (approved.rowCount !== 1)", transition) < pointer);
});

test("public hero selection remains bound to the approved published revision", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/public.ts"), "utf8");
  assert.match(source, /r\.id=e\.published_revision_id/);
  assert.match(source, /r\.workflow_state='approved'/);
  assert.doesNotMatch(source, /e\.published_revision_id=delivery\.shared_source_revision_id/);
  assert.match(source, /e\.published_revision_id=delivery\.published_source_revision_id/);
  assert.match(source, /documentPublishedAvailabilityClause\("d\.id", "\$3", "\$4"\)/);
  assert.match(source, /validateCmsSnapshot\("site-configuration", row\.payload, "publish"\)/);
  assert.match(source, /ref\.field_path=\$2/);
});

test("publishing both hero slots makes their canonical revision-pinned media public", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "hero-publication-test-session-secret-long-enough";

  const [{ pool }, { default: app }, auth, security] = await Promise.all([
    import("@workspace/db"),
    import("../src/app.ts"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const fixtures = {
    homepage: heroFixture("homepage", 1),
    industries: heroFixture("industries", 2),
  } as const;
  const requestedSlugs: string[] = [];
  const publishedSlugs = new Set<string>();
  const now = new Date("2026-09-07T00:00:00Z");

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: values?.[0] ?? security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "Publisher",
          email: "publisher@example.com",
          role: "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae",
          default_locale: "en",
          fallback_market_code: null,
          fallback_locale: null,
          is_canonical: true,
        }],
      };
    }
    if (statement.includes("d.kind='site-configuration'")) {
      const slug = String(values?.[0]);
      requestedSlugs.push(slug);
      const fixture = Object.values(fixtures).find((candidate) => candidate.slug === slug);
      return fixture && publishedSlugs.has(slug)
        ? { rowCount: 1, rows: [fixture.row] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM cms_media_references ref")) {
      const fixture = Object.values(fixtures).find(
        (candidate) => candidate.row.id === String(values?.[0]),
      );
      return fixture
        ? { rowCount: fixture.media.length, rows: fixture.media }
        : { rowCount: 0, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  });
  t.mock.method(pool, "connect", async () => ({
    async query(sql: unknown, values?: unknown[]) {
      const statement = String(sql);
      if (statement.includes("SELECT r.id,r.edition_id,r.payload,d.kind")) {
        const fixture = Object.values(fixtures).find(
          (candidate) =>
            candidate.row.revision_id === String(values?.[0]) &&
            candidate.row.id === String(values?.[1]),
        );
        return fixture
          ? {
              rowCount: 1,
              rows: [{
                id: fixture.row.revision_id,
                edition_id: fixture.editionId,
                payload: fixture.row.payload,
                kind: "site-configuration",
                workflow_state: "in-review",
                publication_state: "in-review",
              }],
            }
          : { rowCount: 0, rows: [] };
      }
      if (statement === "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE") {
        const fixture = Object.values(fixtures).find(
          (candidate) => candidate.row.id === String(values?.[0]),
        );
        return fixture
          ? { rowCount: 1, rows: [{ id: fixture.row.id }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("LOCK TABLE cms_user_market_assignments IN SHARE MODE")) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT role,status") && statement.includes("FROM cms_users")) {
        return { rowCount: 1, rows: [{ role: "administrator", status: "active" }] };
      }
      if (statement.includes("SELECT market_code") && statement.includes("FROM cms_user_market_assignments")) {
        return { rowCount: 1, rows: [{ market_code: "uae" }] };
      }
      if (statement.includes("SELECT e.id") && statement.includes("FROM cms_revisions r")
        && statement.includes("FOR UPDATE OF e")) {
        const fixture = Object.values(fixtures).find(
          (candidate) => candidate.row.revision_id === String(values?.[0])
            && candidate.row.id === String(values?.[1]),
        );
        return fixture
          ? { rowCount: 1, rows: [{ id: fixture.editionId }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT a.id::text id,COALESCE(pinned.id,latest.id)")) {
        const fixture = Object.values(fixtures).find(
          (candidate) => candidate.row.id === String(values?.[1]),
        );
        return fixture
          ? { rowCount: fixture.media.length, rows: fixture.media }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("UPDATE cms_market_editions SET publication_state")) {
        const fixture = Object.values(fixtures).find(
          (candidate) => candidate.row.revision_id === String(values?.[3]),
        );
        if (fixture) publishedSlugs.add(fixture.slug);
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  }) as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolveClose, reject) =>
      server.close((error) => (error ? reject(error) : resolveClose()))
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const publishHeaders = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  for (const slot of ["homepage", "industries"] as const) {
    const fixture = fixtures[slot];
    const publication = await fetch(`${origin}/api/documents/${fixture.row.id}/publish`, {
      method: "POST",
      headers: publishHeaders,
      body: JSON.stringify({ revisionId: fixture.row.revision_id }),
    });
    assert.equal(publication.status, 200);
    const response = await fetch(`${origin}/api/public/hero-films/${slot}?market=uae&locale=en`);
    assert.equal(response.status, 200);
    const payload = await response.json() as {
      slot: string;
      poster: { mediaId: string; mediaVersionId: string; url: string };
      sources: Array<{ mediaId: string; mediaVersionId: string; url: string }>;
    };
    assert.equal(payload.slot, slot);
    assert.deepEqual(
      [payload.poster, ...payload.sources].map(({ mediaId, mediaVersionId }) => ({
        mediaId,
        mediaVersionId,
      })),
      fixture.identities,
    );
    assert.deepEqual(
      [payload.poster, ...payload.sources].map(({ url }) => url),
      fixture.identities.map(
        ({ mediaId, mediaVersionId }) => `/api/public/media/${mediaId}/${mediaVersionId}`,
      ),
    );
  }
  assert.deepEqual(requestedSlugs, ["site-homepage-hero", "site-industries-hero"]);

  function heroFixture(slot: "homepage" | "industries", ordinal: number) {
    const slug = `site-${slot}-hero`;
    const ids = [1, 2, 3].map(
      (offset) => `00000000-0000-4000-8000-${String(ordinal * 10 + offset).padStart(12, "0")}`,
    );
    const versions = [1, 2, 3].map(
      (offset) => `00000000-0000-4000-9000-${String(ordinal * 10 + offset).padStart(12, "0")}`,
    );
    const identities = ids.map((mediaId, index) => ({
      mediaId,
      mediaVersionId: versions[index],
    }));
    const payload = {
      slug,
      title: `${slot} hero`,
      content: {
        schemaVersion: 1,
        page: slot,
        hero: {
          posterMediaId: ids[0],
          posterMediaVersionId: versions[0],
          sources: [
            { mediaId: ids[1], mediaVersionId: versions[1], mimeType: "video/mp4" },
            { mediaId: ids[2], mediaVersionId: versions[2], mimeType: "video/webm" },
          ],
        },
      },
      mediaIds: ids,
      markets: ["uae"],
    };
    return {
      slug,
      editionId: `00000000-0000-4000-c000-${String(ordinal).padStart(12, "0")}`,
      identities,
      row: {
        id: `00000000-0000-4000-a000-${String(ordinal).padStart(12, "0")}`,
        market: "uae",
        locale: "en",
        published_at: new Date("2026-09-09T00:00:00Z"),
        updated_at: new Date("2026-09-09T00:00:00Z"),
        revision_id: `00000000-0000-4000-b000-${String(ordinal).padStart(12, "0")}`,
        revision_number: 2,
        payload,
      },
      media: [
        { id: ids[0], version_id: versions[0], media_type: "image/jpeg", status: "active" },
        { id: ids[1], version_id: versions[1], media_type: "video/mp4", status: "active" },
        { id: ids[2], version_id: versions[2], media_type: "video/webm", status: "active" },
      ],
    };
  }
});

test("hero publication rolls back without moving the pointer on a stored MIME mismatch", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "hero-publication-test-session-secret-long-enough";

  const [{ pool }, { default: app }, auth, security] = await Promise.all([
    import("@workspace/db"),
    import("../src/app.ts"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const documentId = "00000000-0000-4000-8000-000000000201";
  const editionId = "00000000-0000-4000-8000-000000000202";
  const oldRevisionId = "00000000-0000-4000-8000-000000000203";
  const candidateRevisionId = "00000000-0000-4000-8000-000000000204";
  const posterId = "00000000-0000-4000-8000-000000000011";
  const mp4Id = "00000000-0000-4000-8000-000000000012";
  const webmId = "00000000-0000-4000-8000-000000000013";
  const posterVersion = "00000000-0000-4000-8000-000000000111";
  const mp4Version = "00000000-0000-4000-8000-000000000112";
  const webmVersion = "00000000-0000-4000-8000-000000000113";
  const snapshot = {
    slug: "site-homepage-hero",
    title: "Homepage hero",
    content: {
      schemaVersion: 1,
      page: "homepage",
      hero: {
        posterMediaId: posterId,
        posterMediaVersionId: posterVersion,
        sources: [
          { mediaId: mp4Id, mediaVersionId: mp4Version, mimeType: "video/mp4" },
          { mediaId: webmId, mediaVersionId: webmVersion, mimeType: "video/webm" },
        ],
      },
    },
    mediaIds: [posterId, mp4Id, webmId],
    markets: ["uae"],
  };
  const now = new Date("2026-09-07T00:00:00Z");
  let publishedRevisionId = oldRevisionId;
  let rolledBack = false;

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    if (String(sql).includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: values?.[0] ?? security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "Publisher",
          email: "publisher@example.com",
          role: "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });
  const transactionClient = {
    async query(sql: unknown, values?: unknown[]) {
      const statement = String(sql);
      if (statement === "BEGIN" || statement === "COMMIT") return { rowCount: 0, rows: [] };
      if (statement === "ROLLBACK") {
        rolledBack = true;
        return { rowCount: 0, rows: [] };
      }
      if (statement === "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE") {
        return String(values?.[0]) === documentId
          ? { rowCount: 1, rows: [{ id: documentId }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("LOCK TABLE cms_user_market_assignments IN SHARE MODE")) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT role,status") && statement.includes("FROM cms_users")) {
        return { rowCount: 1, rows: [{ role: "administrator", status: "active" }] };
      }
      if (statement.includes("SELECT market_code") && statement.includes("FROM cms_user_market_assignments")) {
        return { rowCount: 1, rows: [{ market_code: "uae" }] };
      }
      if (statement.includes("SELECT e.id") && statement.includes("FROM cms_revisions r")
        && statement.includes("FOR UPDATE OF e")) {
        return String(values?.[0]) === candidateRevisionId && String(values?.[1]) === documentId
          ? { rowCount: 1, rows: [{ id: editionId }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT r.id,r.edition_id,r.payload,d.kind")) {
        return {
          rowCount: 1,
          rows: [{
            id: candidateRevisionId,
            edition_id: editionId,
            payload: snapshot,
            kind: "site-configuration",
            workflow_state: "in-review",
            publication_state: "in-review",
          }],
        };
      }
      if (statement.includes("INSERT INTO cms_media_references")) {
        return { rowCount: 3, rows: [] };
      }
      if (statement.includes("SELECT a.id::text id,COALESCE(pinned.id,latest.id)")) {
        return {
          rowCount: 3,
          rows: [
            { id: posterId, version_id: posterVersion, media_type: "video/mp4" },
            { id: mp4Id, version_id: mp4Version, media_type: "video/mp4" },
            { id: webmId, version_id: webmVersion, media_type: "video/webm" },
          ],
        };
      }
      if (statement.includes("UPDATE cms_market_editions")) {
        publishedRevisionId = candidateRevisionId;
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  t.mock.method(pool, "connect", async () => transactionClient as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolveClose, reject) =>
      server.close((error) => (error ? reject(error) : resolveClose()))
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const response = await fetch(`${origin}/api/documents/${documentId}/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
    },
    body: JSON.stringify({ revisionId: candidateRevisionId }),
  });

  assert.equal(response.status, 422);
  assert.equal(publishedRevisionId, oldRevisionId);
  assert.equal(rolledBack, true);
});
