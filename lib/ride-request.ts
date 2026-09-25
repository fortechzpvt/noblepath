import {
  MAX_TRAVELLERS,
  parseIsoDate,
  postEnquiry,
  todayIso,
  type FormError,
} from "@/lib/booking-request";
import { haversineKm, isInSriLanka, type GeoPoint } from "@/lib/geo";
import type { VehicleId } from "@/lib/transfers";

/**
 * Single-ride request model (D-24): one point-to-point journey with a driver,
 * for example Matara to Kandy, booked on its own without a full trip. Shown
 * to travellers as "A single trip"; D-25 added map pins for pickup and
 * drop-off (`pickupPoint`, `dropoffPoint`).
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

export interface RideContact {
  fullName: string;
  email: string;
  phone: string;
}

export interface RideDetails {
  /** What the traveller calls the place. Always required; the pin is optional. */
  pickup: string;
  dropoff: string;
  /**
   * Exact spot, set by choosing a search result, tapping the map, dragging a
   * pin or "Use my current location" (D-25). Typing in the field clears it,
   * so a pin can never silently disagree with the text the traveller sees.
   */
  pickupPoint: GeoPoint | null;
  dropoffPoint: GeoPoint | null;
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
      pickupPoint: null,
      dropoffPoint: null,
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
  map: "rd-map",
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

/** Pins under 100 m apart are the same place for a trip. Shared with the server schema. */
export const MIN_TRIP_KM = 0.1;

export function pinsTooClose(a: GeoPoint | null, b: GeoPoint | null): boolean {
  return a !== null && b !== null && haversineKm(a, b) < MIN_TRIP_KM;
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
  else if (samePlace(r.pickup, r.dropoff) || pinsTooClose(r.pickupPoint, r.dropoffPoint)) {
    add(rideIds.dropoff, "The drop-off must be different from the pickup.");
  }
  for (const [point, id] of [
    [r.pickupPoint, rideIds.pickup],
    [r.dropoffPoint, rideIds.dropoff],
  ] as const) {
    if (point !== null && !isInSriLanka(point)) add(id, "Choose a place in Sri Lanka.");
  }

  const outward = parseIsoDate(r.date);
  if (outward === null) add(rideIds.date, "Choose the date of your trip.");
  else if (r.date < today) add(rideIds.date, "Choose a date in the future.");
  else if (r.date > yearsAhead(today, MAX_DATE_YEARS_AHEAD)) {
    add(rideIds.date, `We take trip requests up to ${MAX_DATE_YEARS_AHEAD} years ahead. Please choose an earlier date.`);
  }
  if (!TIME_PATTERN.test(r.time)) add(rideIds.time, "Choose a pickup time.");

  if (r.tripType === "return") {
    if (parseIsoDate(r.returnDate) === null) add(rideIds.returnDate, "Choose the date of your return journey.");
    else if (outward !== null && r.returnDate < r.date) {
      add(rideIds.returnDate, "The return must be on or after the outward journey.");
    } else if (outward !== null && parseIsoDate(r.returnDate)! - outward > MAX_RETURN_DAYS * DAY_MS) {
      add(rideIds.returnDate, "The return must be within a year of the outward journey.");
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
