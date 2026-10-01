import assert from "node:assert/strict";
import { test } from "node:test";

import { createEmptyDraft, draftForSubmission, type BookingDraft } from "../lib/booking-request";
import { bookingDraftRequestSchema } from "../lib/validation";

function isoInDays(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** A complete, valid "pre-planned trip" request. */
function packageDraft(): BookingDraft {
  const draft = createEmptyDraft();
  return {
    ...draft,
    traveller: {
      ...draft.traveller,
      fullName: "Amaya Perera",
      nationality: "Sri Lankan",
      email: "amaya@example.com",
      phone: "+94 77 123 4567",
    },
    dates: { arrivalDate: isoInDays(30), arrivalTime: "10:00", departureDate: isoInDays(40), departureTime: "18:00" },
    planChoice: "package",
    packageSlug: "classic-sri-lanka",
  };
}

test("a valid pre-planned request passes the server schema", () => {
  const result = bookingDraftRequestSchema.safeParse(packageDraft());
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
});

test("hidden seeded entries no longer block a pre-planned request (F-39-21)", () => {
  // An incomplete stay and activity seeded from /accommodation and /activities.
  const seeded: BookingDraft = {
    ...packageDraft(),
    stays: [
      { id: "stay1", destination: "kandy", tier: "mid-range", kind: "hotel", checkIn: "", checkOut: "", roomType: "", guests: "2", accommodationSlug: "" },
    ],
    activities: [
      { id: "activity1", activity: "other", otherName: "Surfing", date: "", participants: "2", sourceActivitySlug: "" },
    ],
  };
  assert.equal(bookingDraftRequestSchema.safeParse(seeded).success, false, "the raw draft is what the server used to reject");
  const sent = draftForSubmission(seeded);
  assert.deepEqual(sent.stays, []);
  assert.deepEqual(sent.activities, []);
  const result = bookingDraftRequestSchema.safeParse(sent);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
});

test("phone numbers need at least 7 digits (D-39)", () => {
  const draft = packageDraft();
  assert.equal(bookingDraftRequestSchema.safeParse({ ...draft, traveller: { ...draft.traveller, phone: "+....." } }).success, false);
  assert.equal(bookingDraftRequestSchema.safeParse({ ...draft, traveller: { ...draft.traveller, phone: "+12 345" } }).success, false);
});

test("airport-leg numbers must be plain digits (F-39-16)", () => {
  const draft = packageDraft();
  const withLeg = (passengers: string): BookingDraft => ({
    ...draft,
    pickup: { required: true, airport: "CMB", vehicle: "sedan", passengers, luggage: "1" },
  });
  const ok = bookingDraftRequestSchema.safeParse(withLeg("2"));
  assert.equal(ok.success, true, JSON.stringify(ok.error?.issues));
  for (const bad of ["0x2", "2.0", "+2", "1e1", "Infinity"]) {
    assert.equal(bookingDraftRequestSchema.safeParse(withLeg(bad)).success, false, `${bad} should be rejected`);
  }
});
