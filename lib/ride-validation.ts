import { z } from "zod";

import { MAX_TRAVELLERS } from "@/lib/booking-request";
import {
  MAX_DATE_YEARS_AHEAD,
  MAX_LUGGAGE,
  MAX_PLACE_LENGTH,
  MAX_RETURN_DAYS,
  MAX_RIDE_NOTES,
} from "@/lib/ride-request";
import { DIGITS_ONLY, honeypotSchema, isSingleLineText } from "@/lib/safe-text";
import { VEHICLE_IDS } from "@/lib/transfers";

/**
 * Server-side validation for `POST /api/rides` (D-24).
 *
 * Mirrors `RideDraft` in `lib/ride-request.ts` field-for-field, and follows
 * the same rules as `lib/validation.ts`: every object is `strictObject`
 * (unknown keys are rejected), every message is written for a traveller and
 * never quotes the submitted value, and every string is length-bounded.
 *
 * Pickup and drop-off are free text on purpose — a driver collects from a
 * hotel, a house or a station, not only from a destination in our content —
 * so they are bounded and stripped of control characters rather than checked
 * against a list. The notification email is plain text, so nothing here can
 * turn into markup.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const PHONE_PATTERN = /^[+()\d][\d\s()+.\-]{5,23}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseIsoDateUtc(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const date = new Date(ms);
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }
  return ms;
}

function wholeNumberField(min: number, max: number, message: string) {
  return z
    .string({ message })
    .trim()
    .max(10)
    .regex(DIGITS_ONLY, { message })
    .refine(
      (value) => {
        if (value === "") return false;
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed >= min && parsed <= max;
      },
      { message },
    );
}

/** A single-line place name: 2–120 characters, no control, format or line-separator characters. */
function placeField(message: string) {
  return z
    .string({ message })
    .trim()
    .min(2, { message })
    .max(MAX_PLACE_LENGTH, { message: `Please keep this under ${MAX_PLACE_LENGTH} characters.` })
    .refine(isSingleLineText, { message });
}

const samePlace = (a: string, b: string) =>
  a.replace(/\s+/g, " ").toLowerCase() === b.replace(/\s+/g, " ").toLowerCase();

const contactSchema = z.strictObject({
  fullName: z
    .string({ message: "Enter your full name." })
    .trim()
    .min(2, { message: "Enter your full name." })
    .max(100, { message: "Please keep your name under 100 characters." })
    .refine(isSingleLineText, { message: "Please use letters, numbers and ordinary punctuation only." }),
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
});

const rideDetailsSchema = z
  .strictObject({
    pickup: placeField("Enter where we should pick you up."),
    dropoff: placeField("Enter where you are going."),
    date: z.string({ message: "Choose the date of your ride." }).trim().max(10),
    time: z.string({ message: "Choose a pickup time." }).regex(TIME_PATTERN, { message: "Choose a pickup time." }),
    tripType: z.enum(["one-way", "return"], { message: "Choose one way or return." }),
    returnDate: z.string().trim().max(10).default(""),
    returnTime: z.string().trim().max(5).default(""),
    vehicle: z.enum(VEHICLE_IDS, { message: "Choose a vehicle from the list." }),
    passengers: wholeNumberField(1, MAX_TRAVELLERS, `Enter the number of passengers, from 1 to ${MAX_TRAVELLERS}.`),
    luggage: wholeNumberField(0, MAX_LUGGAGE, "Enter the pieces of luggage, or 0."),
    notes: z
      .string()
      .trim()
      .max(MAX_RIDE_NOTES, { message: `Please keep notes under ${MAX_RIDE_NOTES.toLocaleString("en")} characters.` })
      .optional()
      .default(""),
  })
  .superRefine((ride, ctx) => {
    if (samePlace(ride.pickup, ride.dropoff)) {
      ctx.addIssue({ code: "custom", path: ["dropoff"], message: "The drop-off must be different from the pickup." });
    }

    const outward = parseIsoDateUtc(ride.date);
    if (outward === null) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Choose the date of your ride." });
    } else {
      const now = new Date();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const earliest = todayUtc - DAY_MS; // a day of slack for UTC+13 travellers
      const latest = Date.UTC(now.getUTCFullYear() + MAX_DATE_YEARS_AHEAD, now.getUTCMonth(), now.getUTCDate());
      if (outward < earliest) {
        ctx.addIssue({ code: "custom", path: ["date"], message: "Choose a date in the future." });
      } else if (outward > latest) {
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: `We take ride requests up to ${MAX_DATE_YEARS_AHEAD} years ahead. Please choose an earlier date.`,
        });
      }
    }

    if (ride.tripType === "one-way") {
      // The client clears these for a one-way ride; anything else is not a
      // value the traveller could see, so it must not reach the email.
      if (ride.returnDate !== "" || ride.returnTime !== "") {
        ctx.addIssue({ code: "custom", path: ["returnDate"], message: "A one-way ride has no return." });
      }
      return;
    }

    const back = parseIsoDateUtc(ride.returnDate);
    if (back === null) {
      ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Choose the date of your return ride." });
    } else if (outward !== null && back < outward) {
      ctx.addIssue({ code: "custom", path: ["returnDate"], message: "The return must be on or after the outward ride." });
    } else if (outward !== null && back - outward > MAX_RETURN_DAYS * DAY_MS) {
      ctx.addIssue({ code: "custom", path: ["returnDate"], message: "The return must be within a year of the outward ride." });
    }
    if (!TIME_PATTERN.test(ride.returnTime)) {
      ctx.addIssue({ code: "custom", path: ["returnTime"], message: "Choose a pickup time for your return." });
    } else if (back !== null && back === outward && TIME_PATTERN.test(ride.time) && ride.returnTime <= ride.time) {
      ctx.addIssue({
        code: "custom",
        path: ["returnTime"],
        message: "On the same day, the return must be later than the outward pickup.",
      });
    }
  });

export const rideRequestSchema = z.strictObject({
  contact: contactSchema,
  ride: rideDetailsSchema,
  /**
   * Honeypot — same contract as `bookingDraftRequestSchema.website` in
   * `lib/validation.ts`: bounded, never rejected, branched on after
   * validation by `lib/enquiry-endpoint.ts`.
   */
  website: honeypotSchema,
});

export type ValidatedRideRequest = z.output<typeof rideRequestSchema>;

/** The request as handed to the email builder: the honeypot is dropped. */
export type RideEnquiry = Omit<ValidatedRideRequest, "website">;

export function toRideEnquiry(value: ValidatedRideRequest): RideEnquiry {
  const { website: _honeypot, ...enquiry } = value;
  return enquiry;
}
