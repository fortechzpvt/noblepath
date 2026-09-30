"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { RETENTION_MONTHS } from "@/lib/retention";

const STATUSES = new Set(["new", "contacted", "confirmed", "closed"]);

export async function updateEnquiry(id: string, form: FormData): Promise<void> {
  const user = await requireAdmin();
  const status = String(form.get("status") ?? "");
  const notes = String(form.get("notes") ?? "").trim().slice(0, 4000);
  if (!STATUSES.has(status)) return;
  await db().query("update booking_requests set status = $2, notes = $3, updated_at = now() where id = $1", [
    id,
    status,
    notes || null,
  ]);
  // The reference only: never the traveller's details.
  await audit(user.id, "enquiry.updated", id, { status });
  revalidatePath("/enquiries");
  redirect(`/enquiries/${encodeURIComponent(id)}?saved=1`);
}

export async function purgeOldEnquiries(): Promise<void> {
  const user = await requireAdmin();
  const result = await db().query(
    "delete from booking_requests where created_at < now() - make_interval(months => $1)",
    [RETENTION_MONTHS],
  );
  await audit(user.id, "enquiry.purged", undefined, { count: result.rowCount ?? 0 });
  revalidatePath("/enquiries");
  redirect(`/enquiries?purged=${result.rowCount ?? 0}`);
}
