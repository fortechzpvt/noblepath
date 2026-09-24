import { z } from "zod";
import {
  AIRPORTS,
  INTEREST_OPTIONS,
  MAX_ACTIVITIES,
  MAX_STAYS,
  MAX_TRANSPORT,
  MAX_TRAVELLERS,
  ROOM_TYPES,
  STAY_KINDS,
  TIERS,
  type StayKind,
} from "@/lib/booking-request";
import {
  getAccommodationBySlug,
  getActivityBySlug,
  isKnownDestinationSlug,
  isKnownExperienceSlug,
  isKnownTripSlug,
} from "@/lib/content";
import { VEHICLE_IDS } from "@/lib/transfers";
import type { AccommodationTier, Interest } from "@/lib/types";

/**
 * Server-side request validation for `POST /api/bookings` (FR-5.3, NFR-7,
 * D-19, D-23).
 *
 * This mirrors `BookingDraft` in `lib/booking-request.ts` field-for-field —
 * that file's own docstring says its client-side `validateDraft` is "a
 * convenience for the traveller, not a security control," and this is the
 * schema that makes that true. Every slug the client sends (a destination, an
 * accommodation, an experience, an activity, a trip) is re-checked against
 * the actual content data here; the client already checked these too, but a
 * request is untrusted the moment it crosses the network, regardless of what
 * checked it on the way out.
 *
 * Every field message is written for a traveller, not for a developer reading
 * a log, and never quotes the value that was submitted, so nothing a user
 * typed can be reflected back into a response. Every object is `strictObject`
 * — unknown keys are rejected rather than ignored — which keeps the accepted
 * request shape exactly what is documented in `docs/api/endpoints.md` and
 * stops an unrelated extra field from silently riding along into the
 * notification email.
 */

const MAX_ARRIVAL_YEARS_AHEAD = 2;

/** Treats an empty or whitespace-only string as "not provided". */
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

/**
 * Permissive international phone format — see `PHONE_PATTERN` in
 * `lib/booking-request.ts`, which this matches exactly so a value that
 * passes the client's check never fails the server's.
 */
const PHONE_PATTERN = /^[+()\d][\d\s()+.\-]{5,23}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Client-minted entry ids (`makeEntryId`, e.g. `"stay1"`) — bookkeeping only, never shown to staff. */
const ENTRY_ID_PATTERN = /^[a-z]+[0-9]+$/;

/** ISO `YYYY-MM-DD` at UTC midnight, or `null` if the string is not a real date. */
function parseIsoDateUtc(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const date = new Date(ms);
  // Rejects 2026-02-31, which Date.UTC would silently roll forward.
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return ms;
}

/**
 * A whole number in `[min, max]`, kept as a string — every count/quantity
 * field in `BookingDraft` is a string (what an `<input>` gives the client;
 * see that file's own docstring), so the validated output stays a string too
 * rather than silently changing shape. Empty is invalid — mirrors
 * `wholeNumber` in `lib/booking-request.ts` exactly.
 */
function wholeNumberField(min: number, max: number, message: string) {
  return z
    .string({ message })
    .trim()
    .max(10)
    .refine(
      (value) => {
        if (value === "") return false;
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed >= min && parsed <= max;
      },
      { message },
    );
}

/** An ISO date string that must be a real calendar date. No range check — callers add their own via `.superRefine`. */
function isoDateField(message: string) {
  return z
    .string({ message })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message })
    .refine((value) => parseIsoDateUtc(value) !== null, { message: "That is not a real date." });
}

const entryIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(ENTRY_ID_PATTERN, { message: "Unrecognised request." });

const vehicleIdSchema = z.enum(VEHICLE_IDS, { message: "Choose a vehicle from the list." });

const tierSchema = z.enum(
  TIERS.map((t) => t.value) as [AccommodationTier, ...AccommodationTier[]],
  { message: "Choose a budget from the list." },
);

const stayKindSchema = z.enum(
  STAY_KINDS.map((k) => k.value) as [StayKind, ...StayKind[]],
  { message: "Choose hotel or villa." },
);

const roomTypeSchema = z.enum(ROOM_TYPES, { message: "Choose a room type from the list." });

const interestSchema = z.enum(INTEREST_OPTIONS as [Interest, ...Interest[]], {
  message: "Unrecognised interest.",
});

/* -------------------------------------------------------------------------- */
/* Traveller, dates, transfers                                                */
/* -------------------------------------------------------------------------- */

const travellerSchema = z.strictObject({
  fullName: z
    .string({ message: "Enter your full name." })
    .trim()
    .min(2, { message: "Enter your full name." })
    .max(100, { message: "Please keep your name under 100 characters." }),
  nationality: z
    .string({ message: "Enter your nationality." })
    .trim()
    .min(2, { message: "Enter your nationality." })
    .max(60, { message: "Please keep your nationality under 60 characters." }),
  email: z
    .string({ message: "Enter a valid email address." })
    .trim()
    .toLowerCase()
    .max(254, { message: "That email address is too long." })
    .pipe(z.email({ message: "Enter a valid email address." })),
  phone: z
    .string({ message: "Enter a WhatsApp or phone number, including the country code." })
    .trim()
    .max(24, { message: "That phone number is too long." })
    .regex(PHONE_PATTERN, {
      message: "Enter a WhatsApp or phone number, including the country code.",
    }),
  adults: wholeNumberField(1, MAX_TRAVELLERS, "There must be at least 1 adult."),
  children: wholeNumberField(0, MAX_TRAVELLERS, "Enter the number of children, or 0."),
  infants: wholeNumberField(0, MAX_TRAVELLERS, "Enter the number of infants, or 0."),
  specialRequirements: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(2000, { message: "Please keep special requirements under 2,000 characters." })
      .optional()
      .default(""),
  ),
});

const datesSchema = z
  .strictObject({
    arrivalDate: isoDateField("Choose your arrival date."),
    arrivalTime: z
      .string({ message: "Choose your arrival time." })
      .regex(TIME_PATTERN, { message: "Choose your arrival time." }),
    departureDate: isoDateField("Choose your departure date."),
    departureTime: z
      .string({ message: "Choose your departure time." })
      .regex(TIME_PATTERN, { message: "Choose your departure time." }),
  })
  .superRefine((value, ctx) => {
    const arrival = parseIsoDateUtc(value.arrivalDate);
    const departure = parseIsoDateUtc(value.departureDate);
    if (arrival === null || departure === null) return; // already flagged above
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const earliest = todayUtc - 24 * 60 * 60 * 1000; // a day of slack for UTC+13 travellers
    const latest = Date.UTC(
      now.getUTCFullYear() + MAX_ARRIVAL_YEARS_AHEAD,
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    if (arrival < earliest) {
      ctx.addIssue({ code: "custom", path: ["arrivalDate"], message: "Choose an arrival date in the future." });
    } else if (arrival > latest) {
      ctx.addIssue({
        code: "custom",
        path: ["arrivalDate"],
        message: `We plan up to ${MAX_ARRIVAL_YEARS_AHEAD} years ahead. Please choose an earlier date.`,
      });
    }
    if (departure - arrival < 24 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: "custom",
        path: ["departureDate"],
        message: "Departure must be at least one night after arrival.",
      });
    }
  });

/**
 * One airport leg. Only checked in depth when `required` is true — an
 * unrequested leg's other fields are not meaningful and are not enforced,
 * mirroring `validateDraft`'s own behaviour exactly so a request the client
 * considered valid never fails here for a field it never asked the traveller
 * to fill in.
 */
const airportLegSchema = z
  .strictObject({
    required: z.boolean(),
    airport: z.string().trim().max(20).default(""),
    vehicle: vehicleIdSchema.nullable(),
    passengers: z.string().trim().max(10).default(""),
    luggage: z.string().trim().max(10).default(""),
  })
  .superRefine((leg, ctx) => {
    if (!leg.required) return;
    if (!AIRPORTS.some((a) => a.value === leg.airport)) {
      ctx.addIssue({ code: "custom", path: ["airport"], message: "Choose an airport for this leg." });
    }
    if (leg.vehicle === null) {
      ctx.addIssue({ code: "custom", path: ["vehicle"], message: "Choose a vehicle for this leg." });
    }
    const passengers = Number(leg.passengers);
    if (!(Number.isInteger(passengers) && passengers >= 1 && passengers <= MAX_TRAVELLERS)) {
      ctx.addIssue({ code: "custom", path: ["passengers"], message: "Enter how many passengers." });
    }
    const luggage = Number(leg.luggage);
    if (!(Number.isInteger(luggage) && luggage >= 0 && luggage <= 50)) {
      ctx.addIssue({ code: "custom", path: ["luggage"], message: "Enter the pieces of luggage, or 0." });
    }
  });

/* -------------------------------------------------------------------------- */
/* Build-your-own entries                                                     */
/* -------------------------------------------------------------------------- */

const stayEntrySchema = z
  .strictObject({
    id: entryIdSchema,
    destination: z.string().trim().max(60).default(""),
    tier: tierSchema,
    kind: stayKindSchema,
    checkIn: z.string().trim().max(10).default(""),
    checkOut: z.string().trim().max(10).default(""),
    roomType: roomTypeSchema,
    guests: z.string().trim().max(10).default(""),
    /** `""`, or an accommodation slug carried in from `/accommodation` (D-21). */
    accommodationSlug: z.string().trim().max(100).default(""),
  })
  .superRefine((stay, ctx) => {
    if (stay.destination === "" || !isKnownDestinationSlug(stay.destination)) {
      ctx.addIssue({ code: "custom", path: ["destination"], message: "Choose a destination." });
    }
    if (parseIsoDateUtc(stay.checkIn) === null) {
      ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Choose a check-in date." });
    }
    if (parseIsoDateUtc(stay.checkOut) === null) {
      ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Choose a check-out date." });
    } else if (parseIsoDateUtc(stay.checkIn) !== null) {
      const nights = (parseIsoDateUtc(stay.checkOut)! - parseIsoDateUtc(stay.checkIn)!) / (24 * 60 * 60 * 1000);
      if (nights < 1) {
        ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out must be after check-in." });
      }
    }
    const guests = Number(stay.guests);
    if (!(Number.isInteger(guests) && guests >= 1 && guests <= MAX_TRAVELLERS)) {
      ctx.addIssue({ code: "custom", path: ["guests"], message: "Enter the number of guests." });
    }
    if (stay.accommodationSlug !== "") {
      const accommodation = getAccommodationBySlug(stay.accommodationSlug);
      // Same cross-check `lib/trip-selections.ts` applies when reading this
      // slug back out of `localStorage` (security review F-2) — a specific
      // property must actually belong to the destination it is filed under.
      if (!accommodation || accommodation.destinationSlug !== stay.destination) {
        ctx.addIssue({
          code: "custom",
          path: ["accommodationSlug"],
          message: "We do not recognise that property.",
        });
      }
    }
  });

const activityEntrySchema = z
  .strictObject({
    id: entryIdSchema,
    /** A known experience slug, or `"other"` — mirrors `ActivityEntry.activity`. */
    activity: z.string().trim().max(100).default(""),
    otherName: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(100).optional().default(""),
    ),
    date: z.string().trim().max(10).default(""),
    participants: z.string().trim().max(10).default(""),
    /** `""`, or an activity slug carried in from `/activities` (D-21). */
    sourceActivitySlug: z.string().trim().max(100).default(""),
  })
  .superRefine((activity, ctx) => {
    if (activity.activity === "") {
      ctx.addIssue({ code: "custom", path: ["activity"], message: "Choose an activity." });
    } else if (activity.activity === "other") {
      if (activity.otherName.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["otherName"], message: "Name the activity." });
      }
    } else if (!isKnownExperienceSlug(activity.activity)) {
      ctx.addIssue({ code: "custom", path: ["activity"], message: "We do not recognise that activity." });
    }
    if (parseIsoDateUtc(activity.date) === null) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Choose a date." });
    }
    const participants = Number(activity.participants);
    if (!(Number.isInteger(participants) && participants >= 1 && participants <= MAX_TRAVELLERS)) {
      ctx.addIssue({ code: "custom", path: ["participants"], message: "Enter the number of participants." });
    }
    if (activity.sourceActivitySlug !== "" && !getActivityBySlug(activity.sourceActivitySlug)) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceActivitySlug"],
        message: "We do not recognise that activity.",
      });
    }
  });

const transportEntrySchema = z
  .strictObject({
    id: entryIdSchema,
    vehicle: vehicleIdSchema.nullable(),
    mode: z.enum(["private", "shared"], { message: "Choose private or shared." }),
    pickup: z.string().trim().max(120).default(""),
    dropoff: z.string().trim().max(120).default(""),
    date: z.string().trim().max(10).default(""),
  })
  .superRefine((entry, ctx) => {
    if (entry.vehicle === null) {
      ctx.addIssue({ code: "custom", path: ["vehicle"], message: "Choose a vehicle." });
    }
    if (entry.pickup.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["pickup"], message: "Enter a pickup location." });
    }
    if (entry.dropoff.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["dropoff"], message: "Enter a drop-off location." });
    }
    if (parseIsoDateUtc(entry.date) === null) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Choose a date." });
    }
  });

const preferencesSchema = z.strictObject({
  destinations: z
    .array(z.string().trim().max(60))
    .max(60)
    .default([])
    .refine((slugs) => slugs.every((slug) => isKnownDestinationSlug(slug)), {
      message: "We do not recognise one of those destinations.",
    }),
  tier: z.union([tierSchema, z.literal("")]).default(""),
  kind: z.union([stayKindSchema, z.literal("")]).default(""),
  interests: z.array(interestSchema).max(INTEREST_OPTIONS.length).default([]),
  vehicle: vehicleIdSchema.nullable().default(null),
  budget: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional().default("")),
  days: z.string().trim().max(10).default(""),
  requests: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(2000, { message: "Please keep special requests under 2,000 characters." }).optional().default(""),
  ),
});

const plannedItinerarySchema = z
  .strictObject({
    days: z.number().int().min(1).max(60),
    destinationSlugs: z
      .array(z.string().trim().max(60))
      .max(60)
      .refine((slugs) => slugs.every((slug) => isKnownDestinationSlug(slug)), {
        message: "We do not recognise one of those destinations.",
      }),
    interests: z.array(interestSchema).max(INTEREST_OPTIONS.length),
  })
  .nullable();

/* -------------------------------------------------------------------------- */
/* The booking draft, as submitted to POST /api/bookings                      */
/* -------------------------------------------------------------------------- */

export const bookingDraftRequestSchema = z
  .strictObject({
    traveller: travellerSchema,
    dates: datesSchema,
    pickup: airportLegSchema,
    drop: airportLegSchema,
    planChoice: z.enum(["package", "custom"], { message: "Choose a pre-planned trip or build your own." }).nullable(),
    packageSlug: z.string().trim().max(100).default(""),
    customMode: z.enum(["choose", "preferences"]).default("choose"),
    stays: z.array(stayEntrySchema).max(MAX_STAYS).default([]),
    activities: z.array(activityEntrySchema).max(MAX_ACTIVITIES).default([]),
    transport: z.array(transportEntrySchema).max(MAX_TRANSPORT).default([]),
    preferences: preferencesSchema,
    plannedItinerary: plannedItinerarySchema,
    /**
     * Honeypot. Hidden from sighted and assistive-technology users alike
     * (`components/booking/booking-form.tsx`) and therefore always empty for
     * a real traveller; bots fill every field they find.
     *
     * Deliberately **not** rejected here (no `.max(0)` / `.refine`) — the
     * whole point of a honeypot is that a bot learns nothing about which
     * check it failed. Failing validation on a filled `website` would return
     * a 400 naming this exact field and rule, telling the bot precisely what
     * to leave blank next time. Instead this is allowed to parse
     * successfully, and the route handler branches on it *after* validation
     * to answer with a normal-looking success while silently dropping the
     * request — the schema's job here is only to keep the value bounded.
     */
    website: z.string().trim().max(200).optional().default(""),
  })
  .superRefine((draft, ctx) => {
    if (draft.planChoice === null) {
      ctx.addIssue({ code: "custom", path: ["planChoice"], message: "Choose a pre-planned trip or build your own." });
      return;
    }

    const adults = Number(draft.traveller.adults);
    const children = Number(draft.traveller.children);
    const infants = Number(draft.traveller.infants);
    const total =
      (Number.isInteger(adults) && adults > 0 ? adults : 0) +
      (Number.isInteger(children) && children > 0 ? children : 0) +
      (Number.isInteger(infants) && infants > 0 ? infants : 0);
    if (total > MAX_TRAVELLERS) {
      ctx.addIssue({
        code: "custom",
        path: ["traveller", "adults"],
        message: `For groups over ${MAX_TRAVELLERS}, please contact us directly.`,
      });
    }

    if (draft.planChoice === "package") {
      if (draft.packageSlug === "" || !isKnownTripSlug(draft.packageSlug)) {
        ctx.addIssue({ code: "custom", path: ["packageSlug"], message: "Choose a pre-planned trip to add." });
      }
      return;
    }

    // planChoice === "custom"
    if (draft.customMode === "choose") {
      if (draft.stays.length + draft.activities.length + draft.transport.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["customEntries"],
          message: "Add at least one stay, activity or transport, or send your preferences instead.",
        });
      }
      return;
    }

    // customMode === "preferences"
    if (draft.preferences.destinations.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["preferences", "destinations"],
        message: "Choose at least one destination you would like to visit.",
      });
    }
    const days = Number(draft.preferences.days);
    if (!(Number.isInteger(days) && days >= 2 && days <= 60)) {
      ctx.addIssue({
        code: "custom",
        path: ["preferences", "days"],
        message: "Enter how many days you would like, between 2 and 60.",
      });
    }
    if (draft.preferences.budget !== "" && !(Number(draft.preferences.budget) > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["preferences", "budget"],
        message: "Enter your budget as a number, or leave it empty.",
      });
    }
  });

/** What the client sends. */
export type BookingDraftRequestInput = z.input<typeof bookingDraftRequestSchema>;

/** What the route handler works with after trimming, coercion and validation. */
export type ValidatedBookingDraftRequest = z.output<typeof bookingDraftRequestSchema>;

/**
 * The request as it is handed to the delivery adapter: the honeypot is
 * dropped so it can never reach the notification email or a log line.
 */
export type BookingDraftEnquiry = Omit<ValidatedBookingDraftRequest, "website">;

export function toBookingDraftEnquiry(value: ValidatedBookingDraftRequest): BookingDraftEnquiry {
  const { website: _honeypot, ...enquiry } = value;
  return enquiry;
}

/**
 * Flattens a Zod error into `{ field: message }` for the API response.
 *
 * Only the first issue per field is returned — a traveller needs one thing to
 * fix per field, not three — and the submitted value is never included.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "form";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
