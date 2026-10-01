import type { PoolConfig } from "pg";

/**
 * Connection settings for Supabase PostgreSQL (D-36, moved from Aiven in D-37).
 *
 * Supabase signs its database and pooler certificates with its own root
 * ("Supabase Root 2021 CA", `prod-ca-2021.crt` from Project Settings →
 * Database → SSL), which is not in Node's trust store. So the certificate is
 * verified against that CA (`DATABASE_CA_CERT`) rather than switched off. `rejectUnauthorized: false` would let anyone on the
 * network path impersonate the database, so it is never used.
 *
 * `DATABASE_CA_CERT` may hold the PEM text itself or its base64 encoding,
 * because some hosting dashboards mangle multi-line values.
 *
 * Used by server code and by the build scripts, so it must not import
 * `server-only` or anything from Next.
 */
export function pgConfig(connectionString: string, max = 3): PoolConfig {
  const ca = readCa(process.env.DATABASE_CA_CERT);
  // pg gives `sslmode` in the URL precedence over the `ssl` object, so strip it
  // and state the TLS settings explicitly below.
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return {
    connectionString: url.toString(),
    // A local development database may run without TLS; anything else must use it.
    ssl: local && !ca ? undefined : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 15_000,
    // Client-side cap as well (D-39, F-39-15): on Supabase's transaction
    // pooler a startup parameter like statement_timeout is not reliably
    // applied to the shared server connection, so a stalled query could hold
    // a request open until the platform's own limit.
    query_timeout: 15_000,
    application_name: "noble-path",
  };
}

function readCa(raw: string | undefined): string | undefined {
  if (!raw || raw.trim() === "") return undefined;
  const value = raw.trim();
  if (value.startsWith("-----BEGIN")) return value.replace(/\\n/g, "\n");
  return Buffer.from(value, "base64").toString("utf8");
}
