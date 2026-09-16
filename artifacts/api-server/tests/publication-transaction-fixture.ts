import assert from "node:assert/strict";

export type QueryResult<Row = Record<string, unknown>> = {
  rowCount: number;
  rows: Row[];
};

export type PublicationTransactionQuery = (
  statement: string,
  values: unknown[],
) => QueryResult | Promise<QueryResult> | undefined;

type TransactionPhase = "idle" | "active" | "committed" | "rolled-back";

export type PublicationTransactionFixtureOptions = {
  documentLocks: ReadonlyMap<string, string> | Record<string, string>;
  editionAccess?: (documentId: string) => QueryResult | undefined;
  workflowReceipts?: PublicationTransactionQuery;
  query: PublicationTransactionQuery;
  unexpectedSqlLabel: string;
};

const emptyResult = (): QueryResult => ({ rowCount: 0, rows: [] });

export function createPublicationTransactionFixture(
  options: PublicationTransactionFixtureOptions,
) {
  let phase: TransactionPhase = "idle";
  const events: string[] = [];
  const documentLocks = options.documentLocks instanceof Map
    ? options.documentLocks
    : new Map(Object.entries(options.documentLocks));

  const client = {
    async query(sql: unknown, values: unknown[] = []) {
      const statement = String(sql);
      if (statement === "BEGIN") {
        assert.equal(phase, "idle", "transaction must begin exactly once");
        phase = "active";
        events.push(statement);
        return emptyResult();
      }
      if (statement === "COMMIT" || statement === "ROLLBACK") {
        assert.equal(phase, "active", `${statement} must follow BEGIN`);
        phase = statement === "COMMIT" ? "committed" : "rolled-back";
        events.push(statement);
        return emptyResult();
      }

      assert.equal(phase, "active", `query outside active transaction: ${statement}`);
      events.push(statement);

      if (statement === "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE") {
        const id = documentLocks.get(String(values[0]));
        return id ? { rowCount: 1, rows: [{ id }] } : emptyResult();
      }
      if (statement.includes("LOCK TABLE cms_user_market_assignments IN SHARE MODE")) {
        return emptyResult();
      }
      if (statement.includes("SELECT role,status") && statement.includes("FROM cms_users")) {
        return { rowCount: 1, rows: [{ role: "administrator", status: "active" }] };
      }
      if (statement.includes("SELECT market_code") && statement.includes("FROM cms_user_market_assignments")) {
        return { rowCount: 1, rows: [{ market_code: "uae" }] };
      }
      if (statement.includes("SELECT 1 FROM cms_user_capability_configurations")
        || statement.includes("FROM cms_user_capability_grants")) {
        return emptyResult();
      }
      if (statement.includes("FROM cms_legacy_administrator_market_snapshots")) {
        return { rowCount: 1, rows: [{ market_codes: ["uae"] }] };
      }
      if (statement.includes("SELECT e.id edition_id,e.content_mode,d.kind")) {
        return options.editionAccess?.(String(values[0])) ?? emptyResult();
      }
      if (statement.includes("SELECT binding.mode,adopted.id baseline_id")
        || statement.includes("SELECT binding.id::text,binding.mode,binding.baseline_id")) {
        return emptyResult();
      }

      const workflowResult = await options.workflowReceipts?.(statement, values);
      if (workflowResult) return workflowResult;
      const result = await options.query(statement, values);
      if (result) return result;

      // Read-only safeguards are intentionally non-order-sensitive. Mutations,
      // including data-changing CTEs, must always be declared by the test.
      if (/^\s*(SELECT|LOCK)\b/i.test(statement)) return emptyResult();
      throw new Error(`unexpected ${options.unexpectedSqlLabel} mutation SQL: ${statement}`);
    },
    release() {},
  };

  return {
    client,
    events,
    get phase() {
      return phase;
    },
    assertCommitted() {
      assert.equal(phase, "committed");
      assert.equal(events[0], "BEGIN");
      assert.equal(events.at(-1), "COMMIT");
    },
    assertRolledBack() {
      assert.equal(phase, "rolled-back");
      assert.equal(events[0], "BEGIN");
      assert.equal(events.at(-1), "ROLLBACK");
    },
  };
}