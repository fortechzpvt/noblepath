/**
 * Applies db/migrations/*.sql in name order, each once, each in a transaction (D-36).
 *
 *   MIGRATION_DATABASE_URL=postgres://avnadmin:…@…/defaultdb?sslmode=require \
 *   DATABASE_CA_CERT="$(cat ca.pem)" npm run db:migrate
 *
 * Runs as the Aiven owner account (`avnadmin`), which owns the schema; the
 * apps themselves connect with the narrower roles in db/roles.sql.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

import { pgConfig } from "../lib/pg-config";

async function main(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("Set MIGRATION_DATABASE_URL (the avnadmin connection string).");
  const client = new Client(pgConfig(url));
  await client.connect();
  try {
    await client.query(
      "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())",
    );
    const dir = path.join(__dirname, "..", "db", "migrations");
    const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
    const { rows } = await client.query<{ version: string }>("select version from schema_migrations");
    const applied = new Set(rows.map((row) => row.version));
    for (const file of files) {
      if (applied.has(file)) continue;
      console.log(`[migrate] Applying ${file}…`);
      await client.query("begin");
      try {
        await client.query(readFileSync(path.join(dir, file), "utf8"));
        await client.query("insert into schema_migrations (version) values ($1)", [file]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw new Error(`${file} failed: ${(error as Error).message}`);
      }
    }
    console.log("[migrate] Up to date.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`[migrate] ${(error as Error).message}`);
  process.exit(1);
});
