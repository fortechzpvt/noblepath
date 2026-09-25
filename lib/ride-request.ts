import {
  MAX_TRAVELLERS,
  parseIsoDate,
  postEnquiry,
  todayIso,
  type FormError,
} from "@/lib/booking-request";
import type { VehicleId } from "@/lib/transfers";

/**
 * Single-ride request model (D-24): one point-to-point journey with a driver,
 * for example Matara to Kandy, booked on its own without a full trip.
 *
 * Mirrors `lib/booking-request.ts`: values are held as strings (what an
 * `<input>` gives us), the client-side `validateRide` is a convenience for the
 * traveller and not a security control, and `lib/ride-validation.ts` repeats
 * every check on the server.
 */

export type RideTripType = "one-way" | "return";

export const RIDE_TRIP_TYPES: ReadonlyArray<{ readonly value: RideTripType; readonly label: string }> = [
  { value: "one-way", label: "One way" },
  { value: "return", label: "Return" },
];

export const MAX_LUGGAGE = 50;
export const MAX_PLACE_LENGTH = 120;
export const MAX_RIDE_NOTES = 1000;
/** Shared with `lib/ride-validation.ts` so client and server agree on the date window. */
export const MAX_DATE_YEARS_AHEAD = 2;
export const MAX_RETURN_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` shifted forward by whole years (string compare works on ISO dates). */
function yearsAhead(iso: string, years: number): string {
  return `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`;
}

/**
 * Suggestions for the pickup and drop-off fields. Free text is still accepted —
 * a driver can collect from any address — so this list only speeds up typing
 * the common towns, airports and destinations. Plain strings, not slugs: they
 * are never looked up, only shown back to staff.
 */
export const PLACE_SUGGESTIONS: readonly string[] = [
  "Bandaranaike International Airport (CMB)",
  "Mattala Rajapaksa International Airport (HRI)",
  "Colombo",
  "Negombo",
  "Kandy",
  "Nuwara Eliya",
  "Ella",
  "Sigiriya",
  "Dambulla",
  "Habarana",
  "Polonnaruwa",
  "Anuradhapura",
  "Trincomalee",
  "Jaffna",
  "Arugam Bay",
  "Galle",
  "Unawatuna",
  "Hikkaduwa",
  "Bentota",
  "Mirissa",
  "Weligama",
  "Matara",
  "Tangalle",
  "Hambantota",
  "Tissamaharama (Yala)",
  "Udawalawe",
  "Kitulgala",
  "Kurunegala",
  "Batticaloa",
];

export interface RideContact {
  fullName: string;
  email: string;
  phone: string;
}

export interface RideDetails {
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  tripType: RideTripType;
  returnDate: string;
  returnTime: string;
  vehicle: VehicleId | null;
  passengers: string;
  luggage: string;
  notes: string;
}

export interface RideDraft {
  contact: RideContact;
  ride: RideDetails;
  /** Honeypot, exactly as on `BookingDraft` — always `""` for a real traveller. */
  website: string;
}

export function createEmptyRide(): RideDraft {
  return {
    contact: { fullName: "", email: "", phone: "" },
    ride: {
      pickup: "",
      dropoff: "",
      date: "",
      time: "",
      tripType: "one-way",
      returnDate: "",
      returnTime: "",
      vehicle: null,
      passengers: "2",
      luggage: "2",
      notes: "",
    },
    website: "",
  };
}

/** Field ids shared by the form (to render) and the validator (to point errors at). */
export const rideIds = {
  pickup: "rd-pickup",
  dropoff: "rd-dropoff",
  date: "rd-date",
  time: "rd-time",
  tripType: "rd-tripType",
  returnDate: "rd-returnDate",
  returnTime: "rd-returnTime",
  vehicle: "rd-vehicle",
  passengers: "rd-passengers",
  luggage: "rd-luggage",
  notes: "rd-notes",
  fullName: "rd-fullName",
  email: "rd-email",
  phone: "rd-phone",
  terms: "rd-terms",
  submit: "rd-submit",
} as const;

/** Same patterns as `lib/booking-request.ts`, so both forms accept the same input. */
const PHONE_PATTERN = /^[+()\d][\d\s()+.\-]{5,23}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function wholeNumberOk(value: string, min: number, max: number): boolean {
  if (value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

/** Case- and space-insensitive, so "Kandy" and " kandy " count as the same place. */
export function samePlace(a: string, b: string): boolean {
  const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(a) !== "" && norm(a) === norm(b);
}

/**
 * Validate the ride request. Errors are written for a traveller and never
 * quote what they typed. Terms are checked separately on the review step.
 */
export function validateRide(draft: RideDraft, today: string = todayIso()): FormError[] {
  const errors: FormError[] = [];
  const add = (fieldId: string, message: string) => errors.push({ fieldId, message });
  const r = draft.ride;
  const c = draft.contact;

  if (r.pickup.trim().length < 2) add(rideIds.pickup, "Enter where we should pick you up.");
  if (r.dropoff.trim().length < 2) add(rideIds.dropoff, "Enter where you are going.");
  else if (samePlace(r.pickup, r.dropoff)) {
    add(rideIds.dropoff, "The drop-off must be different from the pickup.");
  }

  const outward = parseIsoDate(r.date);
  if (outward === null) add(rideIds.date, "Choose the date of your ride.");
  else if (r.date < today) add(rideIds.date, "Choose a date in the future.");
  else if (r.date > yearsAhead(today, MAX_DATE_YEARS_AHEAD)) {
    add(rideIds.date, `We take ride requests up to ${MAX_DATE_YEARS_AHEAD} years ahead. Please choose an earlier date.`);
  }
  if (!TIME_PATTERN.test(r.time)) add(rideIds.time, "Choose a pickup time.");

  if (r.tripType === "return") {
    if (parseIsoDate(r.returnDate) === null) add(rideIds.returnDate, "Choose the date of your return ride.");
    else if (outward !== null && r.returnDate < r.date) {
      add(rideIds.returnDate, "The return must be on or after the outward ride.");
    } else if (outward !== null && parseIsoDate(r.returnDate)! - outward > MAX_RETURN_DAYS * DAY_MS) {
      add(rideIds.returnDate, "The return must be within a year of the outward ride.");
    }
    if (!TIME_PATTERN.test(r.returnTime)) add(rideIds.returnTime, "Choose a pickup time for your return.");
    else if (
      r.returnDate !== "" &&
      r.returnDate === r.date &&
      TIME_PATTERN.test(r.time) &&
      r.returnTime <= r.time
    ) {
      add(rideIds.returnTime, "On the same day, the return must be later than the outward pickup.");
    }
  }

  if (r.vehicle === null) add(rideIds.vehicle, "Choose a vehicle.");
  if (!wholeNumberOk(r.passengers, 1, MAX_TRAVELLERS)) {
    add(rideIds.passengers, `Enter the number of passengers, from 1 to ${MAX_TRAVELLERS}.`);
  }
  if (!wholeNumberOk(r.luggage, 0, MAX_LUGGAGE)) {
    add(rideIds.luggage, "Enter the pieces of luggage, or 0.");
  }

  if (c.fullName.trim().length < 2) add(rideIds.fullName, "Enter your full name.");
  if (!EMAIL_PATTERN.test(c.email.trim())) add(rideIds.email, "Enter a valid email address.");
  if (!PHONE_PATTERN.test(c.phone.trim())) {
    add(rideIds.phone, "Enter a WhatsApp or phone number, including the country code.");
  }

  return errors;
}

export function validateRideTerms(accepted: boolean): FormError[] {
  return accepted
    ? []
    : [{ fieldId: rideIds.terms, message: "Accept the terms and conditions to submit your request." }];
}

/**
 * `POST /api/rides` (D-24). A one-way ride's return fields are cleared before
 * sending so the server never receives (or emails) values the traveller can
 * no longer see on screen.
 */
export async function submitRideRequest(draft: RideDraft): Promise<{ readonly id: string }> {
  const ride =
    draft.ride.tripType === "one-way" ? { ...draft.ride, returnDate: "", returnTime: "" } : draft.ride;
  return postEnquiry("/api/rides", { ...draft, ride });
}
