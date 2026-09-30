import "server-only";

import { Pool } from "pg";

import { serverEnv } from "@/lib/env";
import { pgConfig } from "@/lib/pg-config";

/**
 * The public site's database connection (D-36), as `np_site_runtime`: it can
 * add booking requests and visit counts, and read nothing personal back
 * (admin/db/roles.sql).
 *
 * `null` when `DATABASE_URL` is not set; callers then skip the write, and the
 * site works exactly as it did before the admin app existed.
 */
let pool: Pool | null | undefined;

export function getDb(): Pool | null {
  if (pool !== undefined) return pool;
  if (!serverEnv.DATABASE_URL) {
    pool = null;
    return pool;
  }
  pool = new Pool(pgConfig(serverEnv.DATABASE_URL, 3));
  // An idle client dropped by the server must not crash the process.
  pool.on("error", (error) => console.error(`[db] Idle connection error: ${error.message}`));
  return pool;
}
