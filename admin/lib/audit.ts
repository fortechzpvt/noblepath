import "server-only";

import { db } from "@/lib/db";

/**
 * Records who did what (D-36): every sign-in, failed sign-in, content change,
 * upload, publish and enquiry status change. Shown on the Activity page.
 * `detail` must never hold a password, code, token or traveller data.
 */
export async function audit(
  userId: string | null,
  action: string,
  entity?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await db().query("insert into audit_log (user_id, action, entity, detail) values ($1, $2, $3, $4)", [
      userId,
      action,
      entity ?? null,
      detail ? JSON.stringify(detail) : null,
    ]);
  } catch (error) {
    console.error(`[audit] Could not record ${action}: ${(error as Error).message}`);
  }
}
