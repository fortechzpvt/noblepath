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

test("server field errors map to real form fields (D-39)", async () => {
  const { toBookingFieldId, ids } = await import("../lib/booking-request");
  assert.equal(toBookingFieldId("server:stays.0.checkOut"), ids.stay(0, "checkOut"));
  assert.equal(toBookingFieldId("server:activities.2.date"), ids.activity(2, "date"));
  assert.equal(toBookingFieldId("server:traveller.phone"), ids.phone);
  assert.equal(toBookingFieldId("server:dates.departureDate"), ids.departureDate);
  assert.equal(toBookingFieldId("server:pickup.passengers"), ids.leg("pickup", "passengers"));
  assert.equal(toBookingFieldId("server:packageSlug"), ids.package);
  assert.equal(toBookingFieldId("server:preferences.days"), ids.prefDays);
  assert.equal(toBookingFieldId("server:website"), ids.submit);
});

test("entry dates must fall inside the trip, and trips are capped (D-39)", () => {
  const base = packageDraft();
  const custom: BookingDraft = {
    ...base,
    planChoice: "custom",
    customMode: "choose",
    packageSlug: "",
    activities: [
      { id: "act1", activity: "other", otherName: "Surfing", date: isoInDays(80), participants: "2", sourceActivitySlug: "" },
    ],
  };
  const outside = bookingDraftRequestSchema.safeParse(custom);
  assert.equal(outside.success, false);
  assert.ok(outside.error?.issues.some((issue) => issue.path.join(".") === "activities.0.date"));
  const inside = bookingDraftRequestSchema.safeParse({
    ...custom,
    activities: [{ ...custom.activities[0]!, date: isoInDays(35) }],
  });
  assert.equal(inside.success, true, JSON.stringify(inside.error?.issues));
  const tooLong = bookingDraftRequestSchema.safeParse({
    ...base,
    dates: { ...base.dates, departureDate: "9999-12-31" },
  });
  assert.equal(tooLong.success, false);
});
