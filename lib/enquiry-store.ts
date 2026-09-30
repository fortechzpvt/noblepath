import "server-only";

import { getDb } from "@/lib/db";

/** The summary columns the admin lists and filters by; the whole request goes in `payload`. */
export interface EnquiryRecord {
  readonly kind: "booking" | "ride";
  readonly planChoice: string | null;
  readonly packageSlug: string | null;
  readonly travellerName: string;
  readonly email: string;
  /** ISO date (YYYY-MM-DD), or null when the request has none. */
  readonly travelDate: string | null;
  readonly partySize: number | null;
  /** The validated request, honeypot removed. */
  readonly payload: unknown;
}

export type EmailStatus = "sent" | "failed" | "not-configured";

/**
 * Saves a booking or ride request for the admin app (D-36).
 *
 * Returns whether it was saved. Never throws: a database problem must not stop
 * the email from going out, and the email must not wait on the database.
 * Nothing personal is logged on failure, only the reference.
 */
export async function saveEnquiry(id: string, record: EnquiryRecord, emailStatus: EmailStatus): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await db.query(
      `insert into booking_requests
         (id, kind, plan_choice, package_slug, traveller_name, email, travel_date, party_size, payload, email_status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        record.kind,
        record.planChoice,
        record.packageSlug,
        record.travellerName,
        record.email,
        record.travelDate && /^\d{4}-\d{2}-\d{2}$/.test(record.travelDate) ? record.travelDate : null,
        record.partySize,
        JSON.stringify(record.payload),
        emailStatus,
      ],
    );
    return true;
  } catch (error) {
    console.error(`[enquiry-store] Could not save request ${id}: ${(error as Error).message}`);
    return false;
  }
}
