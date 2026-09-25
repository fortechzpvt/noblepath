/**
 * Noble Path — domain model.
 *
 * Every type in this file is editorial-content shaped: destinations, experiences
 * and trip packages live as typed data in the repository rather than in a
 * database (v1 decision — see docs/database/database-schema.md). The types are
 * therefore the schema, and they are intentionally strict and readonly so that
 * content cannot be mutated at runtime by page code.
 */

/* -------------------------------------------------------------------------- */
/* Geography and taxonomy                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Travel regions used for filtering (FR-1.2).
 *
 * These are trip-planning regions rather than Sri Lanka's nine administrative
 * provinces: visitors think in terms of "hill country" and "south coast", not
 * "Uva Province". `wilderness` groups the national parks, which sit across
 * several provinces but are planned around in the same way.
 */
export type Region =
  | "cultural-triangle"
  | "hill-country"
  | "south-coast"
  | "east-coast"
  | "west-coast"
  | "north"
  | "wilderness";

/** Interest tags used for filtering and for scoring in the planner (FR-1.3, FR-4.1). */
export type Interest =
  | "culture"
  | "nature"
  | "beach"
  | "wildlife"
  | "adventure"
  | "food"
  | "wellness";

/** Calendar month, 1 = January … 12 = December. */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * How good a place or activity is in a given month.
 *
 * Sri Lanka has two opposing monsoons (Yala, roughly May–September, hits the
 * south-west; Maha, roughly November–February, hits the north-east). A single
 * "best time to visit" string cannot express that, so every seasonal entity
 * carries best / shoulder / avoid month sets and anything unlisted resolves to
 * `"fair"`. This is what lets the planner rank an east-coast beach above a
 * south-coast beach in June.
 */
export type SeasonQuality = "excellent" | "good" | "fair" | "poor";

/**
 * The seasonal profile of a destination or experience.
 *
 * Implemented as a mixin interface rather than a nested object so that content
 * files stay flat and readable, and so UI code can render `bestMonths` directly.
 */
export interface Seasonal {
  /** Months when conditions are at their best. Rendered as "best time to visit". */
  readonly bestMonths: readonly Month[];
  /** Months that still work but are not ideal — rain is possible, seas are choppier. */
  readonly shoulderMonths: readonly Month[];
  /** Months to actively steer travellers away from. */
  readonly avoidMonths: readonly Month[];
  /** One traveller-facing sentence explaining the seasonal pattern. */
  readonly seasonNote: string;
}

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * An image plus the metadata required to render it accessibly.
 *
 * `alt` is required, not optional: WCAG 2.2 AA (NFR-4) is a hard requirement and
 * making the field optional would allow a content author to ship an image with
 * no accessible name. `alt` must describe the photograph that is actually shown.
 */
export interface ImageAsset {
  /** Local path under /public, or an absolute https://images.unsplash.com URL. */
  readonly src: string;
  /** Describes what is visible in the photograph. Never a duplicate of the heading. */
  readonly alt: string;
  /** Attribution line, where the licence requires or the photographer is known. */
  readonly credit?: string;
}

/* -------------------------------------------------------------------------- */
/* Destinations                                                               */
/* -------------------------------------------------------------------------- */

/** Mode of travel for an estimated journey between two destinations. */
export type TravelMode = "road" | "train" | "boat" | "flight";

/**
 * An estimated journey from one destination to another.
 *
 * Times are advisory and derived from typical road conditions (requirements
 * §7.5), not from a live routing API. Links are authored once and treated as
 * bidirectional by the travel graph in `lib/content.ts`.
 */
export interface TravelLink {
  /** Slug of the destination being travelled to. */
  readonly to: string;
  /** Typical door-to-door time in minutes. */
  readonly minutes: number;
  /** Defaults to `"road"` when omitted. */
  readonly mode?: TravelMode;
  /** Context a traveller needs, e.g. a scenic but slower rail alternative. */
  readonly note?: string;
}

/** WGS84 coordinates, used for route sanity checks and the map-pin motif. */
export interface Coordinates {
  readonly lat: number;
  readonly lng: number;
}

/** A place a visitor stays in or travels to (FR-1). */
export interface Destination extends Seasonal {
  readonly slug: string;
  readonly name: string;
  /** Short editorial line shown over the hero image. */
  readonly tagline: string;
  /** 2–4 sentences used in cards, search results and metadata descriptions. */
  readonly summary: string;
  /** Long-form body copy, one string per paragraph. */
  readonly description: readonly string[];
  readonly region: Region;
  readonly interests: readonly Interest[];
  /** Typical number of nights to stay. Drives the planner's day budgeting. */
  readonly suggestedNights: number;
  readonly image: ImageAsset;
  /** Concrete things to see or do, rendered as a bullet list. */
  readonly highlights: readonly string[];
  /** Estimated journeys to neighbouring destinations. */
  readonly travel: readonly TravelLink[];
  readonly coordinates: Coordinates;
  /** Experiences editorially attached to this destination. */
  readonly experienceSlugs: readonly string[];
  /** Destinations to suggest next on the detail page (FR-1.4). */
  readonly nearbySlugs: readonly string[];
  /**
   * Editorial weight, 0–100.
   *
   * Used as the tie-breaking base score in the planner and as the ordering for
   * `getFeaturedDestinations`. It exists so that a traveller who selects no
   * interests still gets a credible "greatest hits" route rather than whichever
   * destination happens to sort first alphabetically.
   */
  readonly appeal: number;
}

/* -------------------------------------------------------------------------- */
/* Experiences                                                                */
/* -------------------------------------------------------------------------- */

/** Physical demand of an experience (FR-2.2). */
export type Intensity = "easy" | "moderate" | "challenging";

/** Indicative price band, not a live quote (requirements §7.4). */
export type PriceBand = "$" | "$$" | "$$$";

/** Something a visitor actually does (FR-2). */
export interface Experience extends Seasonal {
  readonly slug: string;
  readonly name: string;
  /** The destination this experience is booked and based from. */
  readonly destinationSlug: string;
  readonly category: Interest;
  readonly summary: string;
  readonly description: readonly string[];
  /** Typical door-to-door duration in hours, used for day packing in the planner. */
  readonly durationHours: number;
  readonly intensity: Intensity;
  readonly priceBand: PriceBand;
  readonly image: ImageAsset;
  /** What the indicative price covers. */
  readonly included: readonly string[];
  /** Practical caveats: dress codes, start times, fitness, ethics. */
  readonly goodToKnow: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* Accommodation                                                              */
/* -------------------------------------------------------------------------- */

/** The budget question the traveller answers before seeing any stays. */
export type AccommodationTier = "budget" | "mid-range" | "luxury";

/** A place to sleep at one destination, shown on the stay map. */
export interface Accommodation {
  readonly slug: string;
  readonly name: string;
  /** The destination this property serves. Stays are chosen per destination. */
  readonly destinationSlug: string;
  readonly tier: AccommodationTier;
  /** Plain-language property type, e.g. "Boutique hotel" or "Homestay". */
  readonly kind: string;
  /** One or two sentences on why a traveller would pick it. */
  readonly summary: string;
  /** Approximate WGS84 position, for the map pin. */
  readonly coordinates: Coordinates;
}

/* -------------------------------------------------------------------------- */
/* Trip packages                                                              */
/* -------------------------------------------------------------------------- */

/** Package length band used for grouping on the trips index (FR-3.1). */
export type TripTier = "short" | "classic" | "grand";

/** One day of a pre-planned package. */
export interface TripDay {
  /** 1-based day number within the package. */
  readonly day: number;
  readonly title: string;
  /** Where the day's activity happens. */
  readonly destinationSlug: string;
  readonly summary: string;
  readonly experienceSlugs: readonly string[];
  /** Where the traveller sleeps that night; `null` on the final departure day. */
  readonly overnightIn: string | null;
  /** Estimated driving on this day, in minutes. Flagged in the UI above 300. */
  readonly driveMinutes: number;
}

/** A pre-planned, bookable package (FR-3). */
export interface TripPackage {
  readonly slug: string;
  readonly name: string;
  readonly tagline: string;
  readonly summary: string;
  readonly durationDays: number;
  readonly tier: TripTier;
  readonly interests: readonly Interest[];
  /** Destinations covered, in route order. */
  readonly destinationSlugs: readonly string[];
  readonly days: readonly TripDay[];
  readonly includes: readonly string[];
  readonly excludes: readonly string[];
  /** Indicative per-person band, not a quote. */
  readonly priceBandPerPerson: PriceBand;
  readonly image: ImageAsset;
  /** Months the package works best in, given the regions it crosses. */
  readonly bestMonths: readonly Month[];
}

/** A travel region with its editorial description (FR-1.2). */
export interface RegionInfo {
  readonly slug: Region;
  readonly name: string;
  /** One-line character summary used on filter chips and region cards. */
  readonly character: string;
  readonly description: string;
}

/* -------------------------------------------------------------------------- */
/* Planner (FR-4)                                                             */
/* -------------------------------------------------------------------------- */

/** How hard the traveller wants to push. Controls nights per stop and activities per day. */
export type Pace = "relaxed" | "balanced" | "packed";

/** Raw planner form input. Values are validated and clamped by `generateItinerary`. */
export interface PlanInput {
  /** Trip length in days. Accepted range after clamping is 2–30. */
  readonly days: number;
  /** Month of arrival, 1–12. Drives seasonal scoring. */
  readonly arrivalMonth: number;
  /** Selected interest tags. An empty array means "surprise me". */
  readonly interests: readonly Interest[];
  /** Destination slug the traveller starts from. Defaults to Colombo (CMB airport). */
  readonly startingPoint?: string;
  /** Defaults to `"balanced"`. */
  readonly pace?: Pace;
}

/** `PlanInput` after clamping and defaulting — echoed back so the UI can show what was used. */
export interface ResolvedPlanInput {
  readonly days: number;
  readonly arrivalMonth: Month;
  readonly interests: readonly Interest[];
  readonly startingPoint: string;
  readonly pace: Pace;
}

/** One generated day of an itinerary (FR-4.2). */
export interface ItineraryDay {
  readonly day: number;
  readonly title: string;
  readonly destinationSlug: string;
  readonly summary: string;
  readonly experienceSlugs: readonly string[];
  /** Where the traveller sleeps; `null` on the final departure day. */
  readonly overnightIn: string | null;
  /** Estimated driving on this day, in minutes. */
  readonly driveMinutes: number;
  /** Where that driving started, for rendering "Kandy → Ella". `null` when static. */
  readonly driveFromSlug: string | null;
  /** True when `driveMinutes` exceeds the comfortable daily limit (FR-4.5). */
  readonly isLongDrive: boolean;
}

/** One stop in the generated route — a destination and the days spent there. */
export interface ItineraryStop {
  readonly destinationSlug: string;
  readonly nights: number;
  /** 1-based inclusive day range this stop occupies. */
  readonly fromDay: number;
  readonly toDay: number;
  readonly driveMinutesFromPrevious: number;
}

/** The generated itinerary returned by `generateItinerary` (FR-4). */
export interface Itinerary {
  /** The normalised input actually used, after clamping and defaulting. */
  readonly input: ResolvedPlanInput;
  readonly days: readonly ItineraryDay[];
  readonly stops: readonly ItineraryStop[];
  /** Distinct destinations in route order. */
  readonly destinationSlugs: readonly string[];
  readonly regions: readonly Region[];
  readonly totalDriveMinutes: number;
  /** Plain-language notes for the traveller: long drives, clamped input, seasonal caveats. */
  readonly warnings: readonly string[];
  /** Engine identifier, so a stored plan can be re-read after the algorithm changes. */
  readonly engineVersion: string;
}

/* -------------------------------------------------------------------------- */
/* Bookings (FR-5, D-19, D-23)                                                */
/* -------------------------------------------------------------------------- */

/**
 * A validated booking request.
 *
 * This is the *output* of `bookingDraftRequestSchema` — the canonical
 * definition lives in `lib/validation.ts` (`ValidatedBookingDraftRequest`,
 * `BookingDraftEnquiry`) and is inferred from the schema, so the schema and
 * the type can never drift; no separate interface is duplicated here for that
 * reason. This section previously documented an older, simpler enquiry shape
 * (`BookingRequest`/`BookingType`) that predated `BookingDraft` in
 * `lib/booking-request.ts` and was never sent anywhere — removed rather than
 * left to describe a shape nothing builds any more (Fortechz policy §18).
 * Every field is PII-adjacent: see the handling rules in
 * `docs/api/endpoints.md`.
 */

/** 200 response body for a successful submission (FR-5.4). */
export interface BookingResponse {
  /** Human-quotable reference of the form `NP-YYYYMMDD-XXXXXX`. */
  readonly id: string;
}

/** Machine-readable error codes returned by the API. */
export type ApiErrorCode =
  | "invalid_content_type"
  | "invalid_json"
  | "payload_too_large"
  | "validation_failed"
  | "rate_limited"
  | "method_not_allowed"
  | "delivery_unavailable"
  | "delivery_failed"
  /** A cross-site request to a same-origin-only endpoint (D-25, F-10). */
  | "forbidden"
  /** The place-search provider is unreachable, slow or busy (D-25). */
  | "lookup_unavailable"
  | "internal_error";

/**
 * The single error envelope used by every Noble Path API route.
 *
 * `fields` is only populated for `validation_failed`. Messages are written for a
 * traveller to read and never echo submitted values back (reflection risk).
 */
export interface ApiErrorBody {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly fields?: Readonly<Record<string, string>>;
  };
  /** Correlation id also written to the server log, for support to quote. */
  readonly correlationId: string;
}
