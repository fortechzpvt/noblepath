import {
  ACCOMMODATION_TIERS,
  INTENSITIES,
  INTERESTS,
  PRICE_BANDS,
  REGIONS,
  TRAVEL_MODES,
  TRIP_TIERS,
  VEHICLE_IDS,
  type ContentKind,
} from "@/lib/content-schema";

/**
 * How each kind of content is edited in the admin (D-36).
 *
 * The form, the parser (`lib/form-data.ts`) and the list pages are all driven
 * from these definitions, so adding a field to a kind is one entry here plus
 * the schema in `lib/content-schema.ts` (the site's copy is the source).
 */

export type Option = { readonly value: string; readonly label: string };

export type RowColumn =
  | { readonly name: string; readonly label: string; readonly type: "text"; readonly wide?: boolean; readonly optional?: boolean; readonly multiline?: boolean }
  | { readonly name: string; readonly label: string; readonly type: "number" }
  | { readonly name: string; readonly label: string; readonly type: "select"; readonly options?: readonly Option[]; readonly ref?: ContentKind; readonly optional?: boolean }
  | { readonly name: string; readonly label: string; readonly type: "refs"; readonly ref: ContentKind };

export type FieldSpec = { readonly name: string; readonly label: string; readonly hint?: string } & (
  | { readonly type: "key" }
  | { readonly type: "text"; readonly optional?: boolean }
  | { readonly type: "textarea"; readonly rows?: number }
  | { readonly type: "number"; readonly step?: number; readonly min?: number; readonly max?: number }
  | { readonly type: "price" }
  | { readonly type: "select"; readonly options: readonly Option[] }
  | { readonly type: "multi"; readonly options: readonly Option[] }
  | { readonly type: "lines" }
  | { readonly type: "paragraphs" }
  | { readonly type: "months" }
  | { readonly type: "image" }
  | { readonly type: "coordinates" }
  | { readonly type: "ref"; readonly ref: ContentKind }
  | { readonly type: "refs"; readonly ref: ContentKind; readonly ordered?: boolean }
  | { readonly type: "rows"; readonly columns: readonly RowColumn[]; readonly numbered?: string; readonly nullable?: readonly string[] }
);

export interface KindSpec {
  readonly kind: ContentKind;
  readonly label: string;
  readonly plural: string;
  readonly description: string;
  /** The field that names an item; also the unchangeable key for most kinds. */
  readonly keyField: "slug" | "id";
  readonly titleField: string;
  /** Kinds with a fixed set of keys cannot gain or lose items here. */
  readonly fixedSet?: boolean;
  readonly singleton?: boolean;
  /** Extra columns on the list page. */
  readonly listColumns?: readonly { readonly field: string; readonly label: string }[];
  /** Path on the public site, for "View on site". */
  readonly sitePath?: (key: string) => string;
  readonly fields: readonly FieldSpec[];
}

const opts = (values: readonly string[], labels?: Record<string, string>): Option[] =>
  values.map((value) => ({ value, label: labels?.[value] ?? value.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }));

const BANDS = opts(PRICE_BANDS, { $: "$ · Good value", $$: "$$ · Mid-range", $$$: "$$$ · Premium" });
const seasonal: FieldSpec[] = [
  { name: "bestMonths", label: "Best months", type: "months" },
  { name: "shoulderMonths", label: "Shoulder months", type: "months", hint: "Still works, but rain or rougher seas are possible." },
  { name: "avoidMonths", label: "Months to avoid", type: "months" },
  { name: "seasonNote", label: "Season note", type: "text", hint: "One sentence a traveller reads next to the months." },
];

export const KINDS: readonly KindSpec[] = [
  {
    kind: "destination",
    label: "Destination",
    plural: "Destinations",
    description: "Places travellers stay in or visit. Shown on /destinations, the home page and in the planner.",
    keyField: "slug",
    titleField: "name",
    listColumns: [{ field: "region", label: "Region" }],
    sitePath: (slug) => `/destinations/${slug}`,
    fields: [
      { name: "slug", label: "URL slug", type: "key", hint: "Used in the web address, e.g. /destinations/ella. Cannot change after creating." },
      { name: "name", label: "Name", type: "text" },
      { name: "tagline", label: "Tagline", type: "text", hint: "Short line over the hero photo." },
      { name: "summary", label: "Summary", type: "textarea", rows: 3, hint: "2–4 sentences for cards and search results." },
      { name: "description", label: "Description", type: "paragraphs", hint: "Leave a blank line between paragraphs." },
      { name: "region", label: "Region", type: "select", options: opts(REGIONS) },
      { name: "interests", label: "Interests", type: "multi", options: opts(INTERESTS) },
      { name: "suggestedNights", label: "Suggested nights", type: "number", min: 1, max: 14 },
      { name: "appeal", label: "Appeal (0–100)", type: "number", min: 0, max: 100, hint: "Higher appears first on the home page and in 'surprise me' plans." },
      { name: "image", label: "Photo", type: "image" },
      { name: "highlights", label: "Highlights", type: "lines", hint: "One per line." },
      { name: "coordinates", label: "Map position", type: "coordinates" },
      {
        name: "travel",
        label: "Travel times to other destinations",
        type: "rows",
        columns: [
          { name: "to", label: "To", type: "select", ref: "destination" },
          { name: "minutes", label: "Minutes", type: "number" },
          { name: "mode", label: "Mode", type: "select", options: opts(TRAVEL_MODES), optional: true },
          { name: "note", label: "Note", type: "text", wide: true, optional: true },
        ],
      },
      { name: "experienceSlugs", label: "Experiences here", type: "refs", ref: "experience" },
      { name: "nearbySlugs", label: "Nearby destinations", type: "refs", ref: "destination" },
      ...seasonal,
    ],
  },
  {
    kind: "experience",
    label: "Experience",
    plural: "Experiences",
    description: "Things to do, each based at one destination. Shown on /experiences, destination pages and in trips.",
    keyField: "slug",
    titleField: "name",
    listColumns: [{ field: "destinationSlug", label: "Destination" }, { field: "priceFromUsd", label: "From (USD)" }],
    fields: [
      { name: "slug", label: "URL slug", type: "key" },
      { name: "name", label: "Name", type: "text" },
      { name: "destinationSlug", label: "Destination", type: "ref", ref: "destination" },
      { name: "category", label: "Category", type: "select", options: opts(INTERESTS) },
      { name: "summary", label: "Summary", type: "textarea", rows: 3 },
      { name: "description", label: "Description", type: "paragraphs" },
      { name: "durationHours", label: "Duration (hours)", type: "number", step: 0.25, min: 0.25 },
      { name: "intensity", label: "Intensity", type: "select", options: opts(INTENSITIES) },
      { name: "priceBand", label: "Price band", type: "select", options: BANDS },
      { name: "priceFromUsd", label: "Price from (USD per person)", type: "price", hint: "Optional. When set, the site shows “From $X” instead of the band." },
      { name: "image", label: "Photo", type: "image" },
      { name: "included", label: "What's included", type: "lines" },
      { name: "goodToKnow", label: "Good to know", type: "lines" },
      ...seasonal,
    ],
  },
  {
    kind: "trip",
    label: "Trip",
    plural: "Trips",
    description: "Ready-made packages with a day-by-day plan. Shown on /trips and in the home carousel.",
    keyField: "slug",
    titleField: "name",
    listColumns: [{ field: "durationDays", label: "Days" }, { field: "priceFromUsd", label: "From (USD)" }],
    sitePath: (slug) => `/trips/${slug}`,
    fields: [
      { name: "slug", label: "URL slug", type: "key" },
      { name: "name", label: "Name", type: "text" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "summary", label: "Summary", type: "textarea", rows: 4 },
      { name: "durationDays", label: "Length (days)", type: "number", min: 1, max: 60, hint: "Must equal the number of days below." },
      { name: "tier", label: "Length group", type: "select", options: opts(TRIP_TIERS) },
      { name: "interests", label: "Interests", type: "multi", options: opts(INTERESTS) },
      { name: "priceBandPerPerson", label: "Price band", type: "select", options: BANDS },
      { name: "priceFromUsd", label: "Price from (USD per person)", type: "price", hint: "Optional. When set, cards show “From $X”." },
      { name: "image", label: "Photo", type: "image" },
      { name: "destinationSlugs", label: "Route (in order)", type: "refs", ref: "destination", ordered: true },
      {
        name: "days",
        label: "Day by day",
        type: "rows",
        numbered: "day",
        nullable: ["overnightIn"],
        columns: [
          { name: "title", label: "Title", type: "text", wide: true },
          { name: "destinationSlug", label: "Where", type: "select", ref: "destination" },
          { name: "overnightIn", label: "Overnight", type: "select", ref: "destination", optional: true },
          { name: "driveMinutes", label: "Drive (min)", type: "number" },
          { name: "experienceSlugs", label: "Experiences", type: "refs", ref: "experience" },
          { name: "summary", label: "Summary", type: "text", wide: true, multiline: true },
        ],
      },
      { name: "includes", label: "Includes", type: "lines" },
      { name: "excludes", label: "Excludes", type: "lines" },
      { name: "bestMonths", label: "Best months", type: "months" },
    ],
  },
  {
    kind: "accommodation",
    label: "Stay",
    plural: "Stays",
    description: "Places to sleep, per destination and budget tier. Shown on /accommodation and its map.",
    keyField: "slug",
    titleField: "name",
    listColumns: [{ field: "destinationSlug", label: "Destination" }, { field: "tier", label: "Tier" }, { field: "priceFromUsd", label: "From (USD)" }],
    fields: [
      { name: "slug", label: "Slug", type: "key" },
      { name: "name", label: "Name", type: "text" },
      { name: "destinationSlug", label: "Destination", type: "ref", ref: "destination" },
      { name: "tier", label: "Budget tier", type: "select", options: opts(ACCOMMODATION_TIERS) },
      { name: "kind", label: "Property type", type: "text", hint: "e.g. Boutique hotel, Homestay, Eco lodge." },
      { name: "summary", label: "Summary", type: "textarea", rows: 3 },
      { name: "priceFromUsd", label: "Price from (USD per room per night)", type: "price" },
      { name: "coordinates", label: "Map position", type: "coordinates" },
    ],
  },
  {
    kind: "activity",
    label: "Activity",
    plural: "Activities",
    description: "The broad activity catalogue on /activities.",
    keyField: "slug",
    titleField: "name",
    listColumns: [{ field: "categoryId", label: "Category" }, { field: "priceFromUsd", label: "From (USD)" }],
    fields: [
      { name: "slug", label: "Slug", type: "key" },
      { name: "name", label: "Name", type: "text" },
      { name: "categoryId", label: "Category", type: "ref", ref: "activity-category" },
      { name: "location", label: "Where", type: "text" },
      { name: "duration", label: "Duration", type: "text", hint: "Free text, e.g. 2–3 hours or Overnight." },
      { name: "difficulty", label: "Difficulty", type: "select", options: opts(INTENSITIES) },
      { name: "priceBand", label: "Price band", type: "select", options: BANDS },
      { name: "priceFromUsd", label: "Price from (USD per person)", type: "price" },
    ],
  },
  {
    kind: "activity-category",
    label: "Activity category",
    plural: "Activity categories",
    description: "The groups activities are listed under.",
    keyField: "id",
    titleField: "label",
    fields: [
      { name: "id", label: "ID", type: "key" },
      { name: "label", label: "Label", type: "text" },
    ],
  },
  {
    kind: "vehicle",
    label: "Vehicle",
    plural: "Vehicles",
    description: "Vehicle names and daily prices for transfers and rides. The set of vehicle types is fixed; unpublish one to stop offering it.",
    keyField: "id",
    titleField: "label",
    fixedSet: true,
    listColumns: [{ field: "priceFromUsd", label: "From (USD/day)" }],
    fields: [
      { name: "id", label: "Vehicle type", type: "key" },
      { name: "label", label: "Name shown", type: "text" },
      { name: "priceFromUsd", label: "Price from (USD per day with driver)", type: "price" },
    ],
  },
  {
    kind: "region",
    label: "Region",
    plural: "Regions",
    description: "The seven travel regions used for filtering and the journey chapter. The set is fixed; the words are yours.",
    keyField: "slug",
    titleField: "name",
    fixedSet: true,
    fields: [
      { name: "slug", label: "Region", type: "key" },
      { name: "name", label: "Name", type: "text" },
      { name: "character", label: "One-line character", type: "text" },
      { name: "description", label: "Description", type: "textarea", rows: 5 },
    ],
  },
  {
    kind: "site",
    label: "Site text",
    plural: "Site text",
    description: "Words on the home page that are not tied to a destination or trip.",
    keyField: "slug",
    titleField: "heroTitle",
    singleton: true,
    fields: [
      { name: "heroKicker", label: "Hero kicker", type: "text", hint: "Small line above the headline." },
      { name: "heroTitle", label: "Hero headline", type: "textarea", rows: 2, hint: "Each new line becomes a line break on tablet and wider." },
      { name: "heroLead", label: "Hero paragraph", type: "textarea", rows: 3 },
      { name: "heroCta", label: "Hero button", type: "text" },
      { name: "trustBar", label: "Trust bar (exactly 4 lines)", type: "lines" },
      { name: "tripsOverline", label: "Trips section: overline", type: "text" },
      { name: "tripsTitle", label: "Trips section: heading", type: "text" },
      { name: "tripsLead", label: "Trips section: paragraph", type: "textarea", rows: 3 },
    ],
  },
];

export const KIND_BY_NAME = new Map(KINDS.map((spec) => [spec.kind, spec]));

export function kindSpec(kind: string): KindSpec | undefined {
  return KIND_BY_NAME.get(kind as ContentKind);
}

/** Keys the fixed-set kinds must have. */
export const FIXED_KEYS: Partial<Record<ContentKind, readonly string[]>> = {
  vehicle: VEHICLE_IDS,
  region: REGIONS,
};

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
