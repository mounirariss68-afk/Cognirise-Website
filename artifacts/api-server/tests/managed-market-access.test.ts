import assert from "node:assert/strict";
import test from "node:test";
import { canAccessEditionTarget } from "../src/routes/documents";

const restrictedEditor = {
  user: { role: "editor", marketCodes: ["ksa"] },
} as any;

function clientForBinding(row: Record<string, unknown> | null) {
  return {
    async query(sql: string) {
      if (sql.includes("SELECT e.id edition_id,e.content_mode,d.kind FROM cms_documents")) {
        return { rowCount: 1, rows: [{ edition_id: "edition-id", content_mode: "custom", kind: "publication" }] };
      }
      if (sql.includes("SELECT content_mode FROM cms_market_editions")) {
        return { rowCount: 1, rows: [{ content_mode: "custom" }] };
      }
      if (sql.includes("FROM cms_market_edition_bindings binding")) {
        return row ? { rowCount: 1, rows: [row] } : { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected access query: ${sql}`);
    },
  };
}

test("restricted normal save/publish access requires a managed adopted source market", async () => {
  assert.equal(
    await canAccessEditionTarget(
      clientForBinding({ mode: "adapted", source_market: "uae" }),
      restrictedEditor,
      "document-id",
      "ksa",
      "en",
    ),
    false,
  );
  assert.equal(
    await canAccessEditionTarget(
      clientForBinding({ mode: "shared", source_market: null }),
      restrictedEditor,
      "document-id",
      "ksa",
      "en",
    ),
    false,
  );
});

test("independent or unmanaged exact editions retain destination-only access", async () => {
  assert.equal(
    await canAccessEditionTarget(clientForBinding(null), restrictedEditor, "document-id", "ksa", "en"),
    true,
  );
});