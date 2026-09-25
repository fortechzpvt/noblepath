import type { RideEnquiry } from "@/lib/ride-validation";
import { sanitiseSubjectFragment } from "@/lib/safe-text";
import { vehicleLabel } from "@/lib/transfers";

/**
 * Composes the staff notification email for a validated single-ride request
 * (D-24). Plain text, for the same reason as `lib/booking-email.ts`: there is
 * no markup for a traveller's input to break out of. The grouping mirrors
 * `components/booking/ride-summary.tsx`, which the traveller reviewed.
 */


export function buildRideEmail(
  enquiry: RideEnquiry,
  id: string,
): { readonly subject: string; readonly text: string } {
  const { contact: c, ride: r } = enquiry;
  const lines: string[] = [];
  const add = (line: string = "") => lines.push(line);
  const heading = (title: string) => {
    add(title);
    add("-".repeat(title.length));
  };

  add(`Single ride request ${id}`);
  add();

  heading("Ride");
  add(`From: ${r.pickup}`);
  add(`To: ${r.dropoff}`);
  add(`Outward: ${r.date} at ${r.time} (local Sri Lanka time)`);
  add(r.tripType === "return" ? `Return: ${r.returnDate} at ${r.returnTime}, ${r.dropoff} to ${r.pickup}` : "Return: one way only");
  add(`Vehicle: ${vehicleLabel(r.vehicle)}`);
  add(`Passengers: ${r.passengers}`);
  add(`Luggage: ${r.luggage} pieces`);
  if (r.notes.trim()) add(`Notes: ${r.notes}`);
  add();

  heading("Contact");
  add(`Name: ${c.fullName}`);
  add(`Email: ${c.email}`);
  add(`WhatsApp / phone: ${c.phone}`);
  add();

  heading("Estimated price");
  add("Quotation — price the ride and reply to the traveller.");
  add();

  add(`Reply to this email to reach the traveller directly at ${c.email}.`);

  const subject = sanitiseSubjectFragment(
    `Ride request ${id} — ${r.pickup} to ${r.dropoff}, ${r.date}`,
  );
  return { subject, text: lines.join("\n") };
}
