import pg from "pg";
import { schemaPreparationSql } from "./schema-preparation.mjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  await pool.query(schemaPreparationSql);
} finally {
  await pool.end();
}