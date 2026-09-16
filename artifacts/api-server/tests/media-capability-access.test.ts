import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { pool } from "@workspace/db";
import * as auth from "../src/lib/auth.ts";
import { hashToken } from "../src/lib/security.ts";
import mediaRouter from "../src/routes/media.ts";

/**
 * This deliberately uses a UAE-only explicit identity against a KSA-bound
 * media reference. It proves that the protected metadata and edit endpoints
 * fail before their asset queries can expose a filename, storage path, or
 * metadata. The database migration suite separately proves the grant table's
 * scope/uniqueness constraints on an isolated PostgreSQL schema.
 */
test("scoped grants cannot read or edit media referenced only by another geography", {
  concurrency: false,
}, async (t) => {
  const now = new Date("2026-11-01T00:00:00Z");
  const rawToken = "scoped-media-token";
  process.env.SESSION_SECRET ??= "x".repeat(32);
  let assetQueryReached = false;
  let configuredEmptyAdministrator = false;

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: hashToken(rawToken),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "uae-editor",
          name: "UAE editor",
          email: "uae-editor@example.test",
          role: configuredEmptyAdministrator ? "administrator" : "viewer",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: ["uae"],
          capability_matrix_configured: configuredEmptyAdministrator,
        }],
      };
    }
    if (statement.includes("SELECT 1 FROM cms_user_capability_grants")) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }
    if (statement.includes("cms_user_capability_configurations")) {
      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }
    if (statement.includes("SELECT a.uploaded_by_user_id,r.id reference_id,r.document_id")) {
      return {
        rowCount: 1,
        rows: [{
          uploaded_by_user_id: "different-user",
          reference_id: "reference-id",
          document_id: "ksa-platform",
          revision_id: "ksa-revision",
          market: "ksa",
          locale: "en",
        }],
      };
    }
    if (statement.includes("SELECT e.id edition_id,e.content_mode,d.kind FROM cms_documents")) {
      return { rowCount: 1, rows: [{ edition_id: "ksa-edition", content_mode: "custom", kind: "platform" }] };
    }
    if (statement.includes("SELECT topic,capability,scope,market_code")) {
      return {
        rowCount: configuredEmptyAdministrator ? 0 : 2,
        rows: configuredEmptyAdministrator ? [] : [
          { topic: "platform", capability: "view", scope: "regional", market_code: "uae" },
          { topic: "platform", capability: "edit", scope: "regional", market_code: "uae" },
        ],
      };
    }
    if (statement.includes("cms_media_assets")) assetQueryReached = true;
    throw new Error(`unexpected SQL after denied media access: ${statement}`);
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", mediaRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  ));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(hashToken(rawToken));
  const cookies = `${auth.SESSION_COOKIE}=${rawToken}; ${auth.CSRF_COOKIE}=${csrf}`;

  const read = await fetch(`${origin}/api/media/private-media`, {
    headers: { cookie: cookies },
  });
  assert.equal(read.status, 404);
  assert.deepEqual(await read.json(), { error: "Media asset not found." });

  const edit = await fetch(`${origin}/api/media/private-media`, {
    method: "PATCH",
    headers: { cookie: cookies, "x-csrf-token": csrf, "content-type": "application/json" },
    body: JSON.stringify({ filename: "leaked-name.png" }),
  });
  assert.equal(edit.status, 403);
  assert.match((await edit.json()).error, /required content capability/);

  // A configured administrator with an intentionally empty matrix must not
  // regain legacy global content access merely because grant rows are absent.
  configuredEmptyAdministrator = true;
  const emptyMatrixRead = await fetch(`${origin}/api/media/private-media`, {
    headers: { cookie: cookies },
  });
  assert.equal(emptyMatrixRead.status, 404);
  assert.equal(assetQueryReached, false, "denied callers must not reach an asset metadata query");
});