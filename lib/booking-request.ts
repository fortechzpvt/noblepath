import { formatPriceBand } from "@/lib/format";
import type { AccommodationTier, Interest, PriceBand } from "@/lib/types";
import type { VehicleId } from "@/lib/transfers";

/**
 * Booking request model, client-side validation and helpers.
 *
 * FRONT END ONLY. Nothing here talks to a server: `submitBookingRequest` makes a
 * reference ID in the browser and stops. Until delivery is connected (see
 * `DELIVERY_CONNECTED`) a submitted request reaches nobody, and the UI says so.
 * When the server route exists, validation must be repeated there: this file is
 * a convenience for the traveller, not a security control.
 *
 * Form values are held as strings (what an <input> gives us) and converted only
 * where they are checked or shown.
 */

/** Flip to `true` only once submission is delivered to the team (email or database). */
export const DELIVERY_CONNECTED = false;

export type PlanChoice = "package" | "custom";
export type CustomMode = "choose" | "preferences";
export type StayKind = "hotel" | "villa";
export type TransportMode = "private" | "shared";

export const TIERS: ReadonlyArray<{ readonly value: AccommodationTier; readonly label: string }> = [
  { value: "budget", label: "Budget" },
  { value: "mid-range", label: "Mid-range" },
  { value: "luxury", label: "Luxury" },
];

export const STAY_KINDS: ReadonlyArray<{ readonly value: StayKind; readonly label: string }> = [
  { value: "hotel", label: "Hotel" },
  { value: "villa", label: "Villa" },
];

export const ROOM_TYPES = [
  "Single",
  "Double",
  "Twin",
  "Triple",
  "Family room",
  "Suite",
] as const;

export const AIRPORTS: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: "CMB", label: "Bandaranaike International Airport, Colombo (CMB)" },
  { value: "HRI", label: "Mattala Rajapaksa International Airport (HRI)" },
  { value: "other", label: "Another airport (tell us in the special requirements)" },
];

export const INTEREST_OPTIONS: readonly Interest[] = [
  "culture",
  "nature",
  "beach",
  "wildlife",
  "adventure",
  "food",
  "wellness",
];

export const MAX_TRAVELLERS = 20;
export const MAX_STAYS = 8;
export const MAX_ACTIVITIES = 15;
export const MAX_TRANSPORT = 10;

export interface TravellerDetails {
  fullName: string;
  nationality: string;
  email: string;
  phone: string;
  adults: string;
  children: string;
  infants: string;
  specialRequirements: string;
}

export interface TripDates {
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
}

/** One airport transfer leg. Date and time come from `TripDates`, not a second copy. */
export interface AirportLeg {
  required: boolean;
  airport: string;
  vehicle: VehicleId | null;
  passengers: string;
  luggage: string;
}

export interface StayEntry {
  id: string;
  destination: string;
  tier: AccommodationTier;
  kind: StayKind;
  checkIn: string;
  checkOut: string;
  roomType: string;
  guests: string;
}

export interface ActivityEntry {
  id: string;
  /** A known experience slug, or `"other"`. */
  activity: string;
  otherName: string;
  date: string;
  participants: string;
}

export interface TransportEntry {
  id: string;
  vehicle: VehicleId | null;
  mode: TransportMode;
  pickup: string;
  dropoff: string;
  date: string;
}

export interface Preferences {
  destinations: string[];
  tier: AccommodationTier | "";
  kind: StayKind | "";
  interests: Interest[];
  vehicle: VehicleId | null;
  budget: string;
  days: string;
  requests: string;
}

export interface BookingDraft {
  traveller: TravellerDetails;
  dates: TripDates;
  pickup: AirportLeg;
  drop: AirportLeg;
  planChoice: PlanChoice | null;
  packageSlug: string;
  customMode: CustomMode;
  stays: StayEntry[];
  activities: ActivityEntry[];
  transport: TransportEntry[];
  preferences: Preferences;
}

const emptyLeg: AirportLeg = {
  required: false,
  airport: "CMB",
  vehicle: null,
  passengers: "",
  luggage: "",
};

export function createEmptyDraft(): BookingDraft {
  return {
    traveller: {
      fullName: "",
      nationality: "",
      email: "",
      phone: "",
      adults: "2",
      children: "0",
      infants: "0",
      specialRequirements: "",
    },
    dates: { arrivalDate: "", arrivalTime: "", departureDate: "", departureTime: "" },
    pickup: { ...emptyLeg },
    drop: { ...emptyLeg },
    planChoice: null,
    packageSlug: "",
    customMode: "choose",
    stays: [],
    activities: [],
    transport: [],
    preferences: {
      destinations: [],
      tier: "",
      kind: "",
      interests: [],
      vehicle: null,
      budget: "",
      days: "",
      requests: "",
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Derived values                                                             */
/* -------------------------------------------------------------------------- */

/** ISO `YYYY-MM-DD` to UTC midnight in ms, or `null` when it is not a real date. */
export function parseIsoDate(value: string): number | null {
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Nights and days from arrival and departure dates.
 *
 * Days count the day you land and the day you fly out, so 5 nights is 6 days
 * (the same rule the rest of the site uses). `null` until both dates are valid
 * and the departure is after the arrival.
 */
export function tripLength(
  arrivalDate: string,
  departureDate: string,
): { readonly nights: number; readonly days: number } | null {
  const arrival = parseIsoDate(arrivalDate);
  const departure = parseIsoDate(departureDate);
  if (arrival === null || departure === null) return null;
  const nights = Math.round((departure - arrival) / DAY_MS);
  if (nights < 1) return null;
  return { nights, days: nights + 1 };
}

function toInt(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

export function totalTravellers(traveller: TravellerDetails): number {
  const parts = [traveller.adults, traveller.children, traveller.infants].map(toInt);
  return parts.reduce((sum, part) => sum + (Number.isInteger(part) && part > 0 ? part : 0), 0);
}

export type PriceEstimate =
  | { readonly kind: "band"; readonly text: string }
  | { readonly kind: "quote"; readonly text: string };

/**
 * The site only carries indicative price bands, never figures, so a package shows
 * its band and a custom trip is a quotation. Inventing a number here would be
 * inventing data (requirements §7.4).
 */
export function estimatePrice(
  draft: BookingDraft,
  packageBand: PriceBand | null,
): PriceEstimate {
  if (draft.planChoice === "package" && packageBand !== null) {
    return {
      kind: "band",
      text: `${formatPriceBand(packageBand)} per person, indicative. Your quotation confirms the real price.`,
    };
  }
  return {
    kind: "quote",
    text: "Custom quotation. We will price your request and reply with a quote.",
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export interface FormError {
  readonly fieldId: string;
  readonly message: string;
}

/** Permissive on purpose: it only rejects obvious junk; a human reads the number. */
const PHONE_PATTERN = /^[+()\d][\d\s()+.\-]{5,23}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Field ids shared by the form (to render) and the validator (to point errors at). */
export const ids = {
  fullName: "bk-fullName",
  nationality: "bk-nationality",
  email: "bk-email",
  phone: "bk-phone",
  adults: "bk-adults",
  children: "bk-children",
  infants: "bk-infants",
  arrivalDate: "bk-arrivalDate",
  arrivalTime: "bk-arrivalTime",
  departureDate: "bk-departureDate",
  departureTime: "bk-departureTime",
  planChoice: "bk-planChoice",
  package: "bk-package",
  customEntries: "bk-customEntries",
  prefDestinations: "bk-prefDestinations",
  prefDays: "bk-prefDays",
  prefBudget: "bk-prefBudget",
  terms: "bk-terms",
  leg: (leg: "pickup" | "drop", field: string) => `bk-${leg}-${field}`,
  stay: (index: number, field: string) => `bk-stay-${index}-${field}`,
  activity: (index: number, field: string) => `bk-activity-${index}-${field}`,
  transport: (index: number, field: string) => `bk-transport-${index}-${field}`,
} as const;

export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function wholeNumber(
  value: string,
  min: number,
  max: number,
): "ok" | "empty" | "invalid" {
  if (value.trim() === "") return "empty";
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? "ok" : "invalid";
}

/**
 * Validate the request. Errors are written for a traveller and never quote what
 * they typed. Terms acceptance is checked separately (`validateTerms`) because it
 * is asked for on the review step.
 */
export function validateDraft(draft: BookingDraft, today: string = todayIso()): FormError[] {
  const errors: FormError[] = [];
  const add = (fieldId: string, message: string) => errors.push({ fieldId, message });
  const t = draft.traveller;

  if (t.fullName.trim().length < 2) add(ids.fullName, "Enter your full name.");
  if (t.nationality.trim().length < 2) add(ids.nationality, "Enter your nationality.");
  if (!EMAIL_PATTERN.test(t.email.trim())) add(ids.email, "Enter a valid email address.");
  if (!PHONE_PATTERN.test(t.phone.trim())) {
    add(ids.phone, "Enter a WhatsApp or phone number, including the country code.");
  }

  const adults = wholeNumber(t.adults, 1, MAX_TRAVELLERS);
  if (adults !== "ok") add(ids.adults, "There must be at least 1 adult.");
  if (wholeNumber(t.children, 0, MAX_TRAVELLERS) !== "ok") {
    add(ids.children, "Enter the number of children, or 0.");
  }
  if (wholeNumber(t.infants, 0, MAX_TRAVELLERS) !== "ok") {
    add(ids.infants, "Enter the number of infants, or 0.");
  }
  if (totalTravellers(t) > MAX_TRAVELLERS) {
    add(ids.adults, `For groups over ${MAX_TRAVELLERS}, please contact us directly.`);
  }

  const d = draft.dates;
  const arrival = parseIsoDate(d.arrivalDate);
  const departure = parseIsoDate(d.departureDate);
  if (arrival === null) add(ids.arrivalDate, "Choose your arrival date.");
  else if (d.arrivalDate < today) add(ids.arrivalDate, "Choose an arrival date in the future.");
  if (!TIME_PATTERN.test(d.arrivalTime)) add(ids.arrivalTime, "Choose your arrival time.");
  if (departure === null) add(ids.departureDate, "Choose your departure date.");
  else if (arrival !== null && tripLength(d.arrivalDate, d.departureDate) === null) {
    add(ids.departureDate, "Departure must be at least one night after arrival.");
  }
  if (!TIME_PATTERN.test(d.departureTime)) add(ids.departureTime, "Choose your departure time.");

  for (const [key, leg] of [
    ["pickup", draft.pickup],
    ["drop", draft.drop],
  ] as const) {
    if (!leg.required) continue;
    const word = key === "pickup" ? "pickup" : "drop-off";
    if (leg.airport === "") add(ids.leg(key, "airport"), `Choose the airport for your ${word}.`);
    if (leg.vehicle === null) add(ids.leg(key, "vehicle"), `Choose a vehicle for your ${word}.`);
    if (wholeNumber(leg.passengers, 1, MAX_TRAVELLERS) !== "ok") {
      add(ids.leg(key, "passengers"), `Enter how many passengers for your ${word}.`);
    }
    if (wholeNumber(leg.luggage, 0, 50) !== "ok") {
      add(ids.leg(key, "luggage"), `Enter the pieces of luggage for your ${word}, or 0.`);
    }
  }

  if (draft.planChoice === null) {
    add(ids.planChoice, "Choose a pre-planned trip or build your own.");
  } else if (draft.planChoice === "package") {
    if (draft.packageSlug === "") add(ids.package, "Choose a pre-planned trip to add.");
  } else if (draft.customMode === "choose") {
    if (draft.stays.length + draft.activities.length + draft.transport.length === 0) {
      add(ids.customEntries, "Add at least one stay, activity or transport, or send your preferences instead.");
    }
    draft.stays.forEach((stay, index) => {
      if (stay.destination === "") add(ids.stay(index, "destination"), `Stay ${index + 1}: choose a destination.`);
      if (parseIsoDate(stay.checkIn) === null) add(ids.stay(index, "checkIn"), `Stay ${index + 1}: choose a check-in date.`);
      if (parseIsoDate(stay.checkOut) === null) add(ids.stay(index, "checkOut"), `Stay ${index + 1}: choose a check-out date.`);
      else if (tripLength(stay.checkIn, stay.checkOut) === null && parseIsoDate(stay.checkIn) !== null) {
        add(ids.stay(index, "checkOut"), `Stay ${index + 1}: check-out must be after check-in.`);
      }
      if (stay.roomType === "") add(ids.stay(index, "roomType"), `Stay ${index + 1}: choose a room type.`);
      if (wholeNumber(stay.guests, 1, MAX_TRAVELLERS) !== "ok") {
        add(ids.stay(index, "guests"), `Stay ${index + 1}: enter the number of guests.`);
      }
    });
    draft.activities.forEach((activity, index) => {
      if (activity.activity === "") add(ids.activity(index, "activity"), `Activity ${index + 1}: choose an activity.`);
      if (activity.activity === "other" && activity.otherName.trim().length < 2) {
        add(ids.activity(index, "otherName"), `Activity ${index + 1}: name the activity.`);
      }
      if (parseIsoDate(activity.date) === null) add(ids.activity(index, "date"), `Activity ${index + 1}: choose a date.`);
      if (wholeNumber(activity.participants, 1, MAX_TRAVELLERS) !== "ok") {
        add(ids.activity(index, "participants"), `Activity ${index + 1}: enter the number of participants.`);
      }
    });
    draft.transport.forEach((entry, index) => {
      if (entry.vehicle === null) add(ids.transport(index, "vehicle"), `Transport ${index + 1}: choose a vehicle.`);
      if (entry.pickup.trim().length < 2) add(ids.transport(index, "pickup"), `Transport ${index + 1}: enter a pickup location.`);
      if (entry.dropoff.trim().length < 2) add(ids.transport(index, "dropoff"), `Transport ${index + 1}: enter a drop-off location.`);
      if (parseIsoDate(entry.date) === null) add(ids.transport(index, "date"), `Transport ${index + 1}: choose a date.`);
    });
  } else {
    const p = draft.preferences;
    if (p.destinations.length === 0) add(ids.prefDestinations, "Choose at least one destination you would like to visit.");
    if (wholeNumber(p.days, 2, 60) !== "ok") add(ids.prefDays, "Enter how many days you would like, between 2 and 60.");
    if (p.budget.trim() !== "" && !(Number(p.budget) > 0)) {
      add(ids.prefBudget, "Enter your budget as a number, or leave it empty.");
    }
  }

  return errors;
}

export function validateTerms(accepted: boolean): FormError[] {
  return accepted
    ? []
    : [{ fieldId: ids.terms, message: "Accept the terms and conditions to submit your request." }];
}

/* -------------------------------------------------------------------------- */
/* Submission                                                                 */
/* -------------------------------------------------------------------------- */

/** No I, L, O, 0 or 1, so an ID read over the phone cannot be misheard. */
const ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * `NP-YYYYMMDD-XXXXXX`. Random from the browser's crypto source; the date makes
 * collisions across days impossible and 31^6 values make them very unlikely
 * within one. That is a reference for the traveller, not a guarantee: true
 * uniqueness has to be enforced by whichever server stores the request.
 */
export function generateBookingRequestId(now: Date = new Date()): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
  const date = todayIso(now).replaceAll("-", "");
  return `NP-${date}-${suffix}`;
}

/**
 * The one place submission happens. Today it only makes an ID. Replace the body
 * with a `fetch` to the server route when delivery is connected, and set
 * `DELIVERY_CONNECTED` to `true`.
 */
export async function submitBookingRequest(
  draft: BookingDraft,
): Promise<{ readonly id: string }> {
  void draft;
  return { id: generateBookingRequestId() };
}
