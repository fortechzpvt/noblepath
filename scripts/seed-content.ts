/**
 * One-off: load the content bundled in `content/*.ts` into a new Aiven
 * database, as published, so the admin app starts with everything the site
 * already shows (D-36).
 *
 *   ADMIN_DATABASE_URL=postgres://np_admin:…@…/defaultdb?sslmode=require \
 *   DATABASE_CA_CERT="$(cat ca.pem)" npm run db:seed
 *
 * Existing rows are left alone, so it is safe to re-run. `--dry-run` only
 * validates the bundled content against lib/content-schema.ts and connects to
 * nothing. `--force` overwrites rows that already exist (it asks nothing, so
 * only use it on a database with no admin edits you want to keep).
 */
import { Client } from "pg";

import { accommodations } from "../content/accommodations";
import { activities, activityCategories } from "../content/activities";
import { destinations } from "../content/destinations";
import { experiences } from "../content/experiences";
import { regions } from "../content/regions";
import { trips } from "../content/trips";
import { contentSchemas, keyOf, type ContentKind } from "../lib/content-schema";
import { DEFAULT_SITE_SETTINGS } from "../lib/content-source";
import { pgConfig } from "../lib/pg-config";
import { DEFAULT_VEHICLES } from "../lib/transfers";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

const sets: [ContentKind, readonly unknown[]][] = [
  ["region", regions],
  ["destination", destinations],
  ["experience", experiences],
  ["trip", trips],
  ["accommodation", accommodations],
  ["activity-category", activityCategories],
  ["activity", activities],
  ["vehicle", DEFAULT_VEHICLES],
  ["site", [DEFAULT_SITE_SETTINGS]],
];

async function main(): Promise<void> {
  // Validate everything first, so a bad entry writes nothing.
  const rows: { kind: ContentKind; slug: string; data: unknown; position: number }[] = [];
  const problems: string[] = [];
  for (const [kind, items] of sets) {
    items.forEach((item, position) => {
      const parsed = contentSchemas[kind].safeParse(item);
      if (!parsed.success) {
        for (const issue of parsed.error.issues.slice(0, 3)) {
          problems.push(`${kind} #${position}: ${issue.path.join(".")}: ${issue.message}`);
        }
        return;
      }
      rows.push({ kind, slug: keyOf(kind, parsed.data as Record<string, unknown>), data: parsed.data, position });
    });
  }
  if (problems.length > 0) {
    console.error(`[seed] The bundled content does not match lib/content-schema.ts:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`[seed] ${rows.length} items are valid.`);
  if (dryRun) return;

  const url = process.env.ADMIN_DATABASE_URL;
  if (!url) {
    console.error("[seed] Set ADMIN_DATABASE_URL (the np_admin connection string).");
    process.exit(1);
  }
  const client = new Client(pgConfig(url));
  await client.connect();
  try {
    await client.query("begin");
    let written = 0;
    for (const row of rows) {
      const result = await client.query(
        `insert into content_items (kind, slug, data, status, position)
         values ($1, $2, $3, 'published', $4)
         on conflict (kind, slug) do ${force ? "update set data = excluded.data, position = excluded.position, updated_at = now()" : "nothing"}`,
        [row.kind, row.slug, JSON.stringify(row.data), row.position],
      );
      written += result.rowCount ?? 0;
    }
    await client.query("commit");
    console.log(`[seed] Wrote ${written} of ${rows.length} items (the rest already existed).`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(`[seed] ${(error as Error).message}`);
  process.exit(1);
});
