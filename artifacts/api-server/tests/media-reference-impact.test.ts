import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { pool } from "@workspace/db";
import * as auth from "../src/lib/auth.ts";
import mediaRouter from "../src/routes/media.ts";

test("media reference impact returns pinned version and document identity", {
  concurrency: false,
}, async (t) => {
  const now = new Date("2026-09-12T00:00:00Z");
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "admin-session",
          token_digest: values?.[0],
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "admin-user",
          name: "Administrator",
          email: "admin@example.com",
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
    if (statement.includes("FROM cms_media_references")) {
      return {
        rowCount: 1,
        rows: [{
          reference_id: "reference-1",
          document_id: "document-1",
          media_version_id: "version-7",
          field_path: "content.hero.image",
          created_at: now,
          document_kind: "case-study",
          document_title: "Governed case study",
          canonical_slug: "governed-case-study",
          document_status: "active",
        }],
      };
    }
    throw new Error(`unexpected SQL: ${statement}`);
  });

  const app = express();
  app.use(cookieParser());
  app.use("/api", mediaRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  ));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const token = "admin-token";
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/media/media-1/reference-impact`,
    {
      headers: {
        cookie: `${auth.SESSION_COOKIE}=${token}`,
      },
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    mediaId: "media-1",
    referenceCount: 1,
    references: [{
      referenceId: "reference-1",
      documentId: "document-1",
      mediaVersionId: "version-7",
      fieldPath: "content.hero.image",
      documentKind: "case-study",
      documentTitle: "Governed case study",
      canonicalSlug: "governed-case-study",
      documentStatus: "active",
      createdAt: now.toISOString(),
    }],
  });
});