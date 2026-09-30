import type { PoolConfig } from "pg";

/**
 * Connection settings for Aiven PostgreSQL (D-36).
 *
 * Aiven only accepts TLS connections and signs its server certificates with a
 * per-project CA, so the certificate is verified against that CA
 * (`DATABASE_CA_CERT`, the "CA certificate" from the Aiven console) rather
 * than switched off. `rejectUnauthorized: false` would let anyone on the
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
    application_name: "noble-path",
  };
}

function readCa(raw: string | undefined): string | undefined {
  if (!raw || raw.trim() === "") return undefined;
  const value = raw.trim();
  if (value.startsWith("-----BEGIN")) return value.replace(/\\n/g, "\n");
  return Buffer.from(value, "base64").toString("utf8");
}
