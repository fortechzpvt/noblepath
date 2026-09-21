import { z } from "zod";
import { isKnownExperienceSlug, isKnownTripSlug } from "@/lib/content";

/**
 * Server-side request validation (FR-5.3, NFR-7).
 *
 * Every field message is written for a traveller filling in a form, not for a
 * developer reading a log: "Please tell us your name" rather than
 * "Expected string, received undefined". Messages never quote the value that
 * was submitted, so nothing a user typed can be reflected back into the page.
 *
 * The schema is strict — unknown keys are rejected rather than ignored — which
 * keeps the accepted request shape exactly what is documented in
 * docs/api/endpoints.md.
 */

const MAX_ARRIVAL_YEARS_AHEAD = 2;

/** Treats an empty or whitespace-only string as "not provided". */
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

/** Accepts `"3"` from a form post as well as `3` from JSON. */
const numericString = (value: unknown): unknown =>
  typeof value === "string" && value.trim() !== "" ? Number(value) : value;

/**
 * Permissive international phone format.
 *
 * Deliberately not an E.164 check: a traveller writing "+94 (0)77 123 4567" is
 * giving us a usable number, and rejecting it would cost a real enquiry. The
 * number is only ever read by a human, so the check exists to reject obvious
 * junk and to bound the length, not to guarantee dialability.
 */
const PHONE_PATTERN = /^[+()\d][\d\s()+.\-]{5,23}$/;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export const BOOKING_TYPES = ["package", "experience", "custom-plan"] as const;

export const bookingRequestSchema = z
  .strictObject({
    name: z
      .string({ message: "Please tell us your name." })
      .trim()
      .min(2, { message: "Please enter your full name (at least 2 characters)." })
      .max(100, { message: "Please keep your name under 100 characters." }),

    email: z
      .string({ message: "Please enter an email address so we can reply." })
      .trim()
      .toLowerCase()
      .max(254, { message: "That email address is too long." })
      .pipe(z.email({ message: "That does not look like a valid email address." })),

    phone: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(24, { message: "That phone number is too long." })
        .regex(PHONE_PATTERN, {
          message: "Please enter a phone number we can call, including the country code.",
        })
        .optional(),
    ),

    partySize: z.preprocess(
      numericString,
      z
        .number({ message: "Please tell us how many people are travelling." })
        .int({ message: "Please enter a whole number of travellers." })
        .min(1, { message: "There needs to be at least one traveller." })
        .max(20, { message: "For groups over 20, please contact us directly." }),
    ),

    arrivalDate: z
      .string({ message: "Please choose your arrival date." })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Please choose your arrival date." })
      .superRefine((value, ctx) => {
        const arrival = parseIsoDateUtc(value);
        if (arrival === null) {
          ctx.addIssue({ code: "custom", message: "That is not a real date." });
          return;
        }
        const now = new Date();
        const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        // One day of slack so a traveller already in UTC+13 can still choose "today".
        const earliest = todayUtc - 24 * 60 * 60 * 1000;
        const latest = Date.UTC(
          now.getUTCFullYear() + MAX_ARRIVAL_YEARS_AHEAD,
          now.getUTCMonth(),
          now.getUTCDate(),
        );
        if (arrival < earliest) {
          ctx.addIssue({ code: "custom", message: "Please choose a date in the future." });
        } else if (arrival > latest) {
          ctx.addIssue({
            code: "custom",
            message: `We plan up to ${MAX_ARRIVAL_YEARS_AHEAD} years ahead. Please choose an earlier date.`,
          });
        }
      }),

    bookingType: z.enum(BOOKING_TYPES, {
      message: "Please tell us what you would like to book.",
    }),

    itemSlug: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(100, { message: "We do not recognise that trip or experience." })
        .regex(SLUG_PATTERN, { message: "We do not recognise that trip or experience." })
        .optional(),
    ),

    notes: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .trim()
        .max(2000, { message: "Please keep your notes under 2,000 characters." })
        .optional(),
    ),

    /**
     * Honeypot. Hidden from sighted and assistive-technology users alike and
     * therefore always empty for a real traveller; bots fill every field they
     * find. The API route checks this before validation and answers a filled
     * honeypot with a normal-looking success, so a bot learns nothing.
     */
    website: z
      .string()
      .max(0, { message: "This field must be left empty." })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.bookingType === "custom-plan") return;

    if (!value.itemSlug) {
      ctx.addIssue({
        code: "custom",
        path: ["itemSlug"],
        message:
          value.bookingType === "package"
            ? "Please choose which trip you would like to book."
            : "Please choose which experience you would like to book.",
      });
      return;
    }

    const known =
      value.bookingType === "package"
        ? isKnownTripSlug(value.itemSlug)
        : isKnownExperienceSlug(value.itemSlug);

    if (!known) {
      ctx.addIssue({
        code: "custom",
        path: ["itemSlug"],
        message:
          value.bookingType === "package"
            ? "We could not find that trip. Please choose one from the trips page."
            : "We could not find that experience. Please choose one from the experiences page.",
      });
    }
  });

/** What the client may send. */
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;

/** What the handler receives after trimming, coercion and validation. */
export type ValidatedBookingRequest = z.output<typeof bookingRequestSchema>;

/**
 * The enquiry as it is handed to the delivery adapter: the honeypot is dropped
 * so it can never reach a downstream system or a log line.
 */
export type BookingEnquiry = Omit<ValidatedBookingRequest, "website">;

export function toBookingEnquiry(value: ValidatedBookingRequest): BookingEnquiry {
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
