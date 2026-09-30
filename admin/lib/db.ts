import "server-only";

import { Pool, type PoolClient } from "pg";

import { env } from "@/lib/env";
import { pgConfig } from "@/lib/pg-config";

let pool: Pool | undefined;

/** The admin's connection pool, as np_admin (D-36). */
export function db(): Pool {
  if (!pool) {
    pool = new Pool(pgConfig(env().DATABASE_URL, 5));
    pool.on("error", (error) => console.error(`[db] Idle connection error: ${error.message}`));
  }
  return pool;
}

/** Runs `work` in a transaction, rolling back on any error. */
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
