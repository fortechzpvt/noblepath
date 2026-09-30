import { z } from "zod";

/**
 * Runtime schema for every kind of editable content (D-36).
 *
 * The TypeScript interfaces in `lib/types.ts` describe content the compiler
 * can see. Content edited in the admin app arrives as JSON from Postgres, which
 * the compiler cannot see, so it is checked against these schemas twice:
 *   1. by the admin app before it saves (the `noblepathadmin` repository keeps
 *      a copy at `lib/content-schema.ts`, refreshed there with
 *      `npm run sync-schema -- /path/to/NobalPath`), and
 *   2. by `scripts/pull-content.ts` when the public site is built, which fails
 *      the build rather than ship content that does not match.
 *
 * This file must stay dependency-free apart from zod: the admin app is
 * deployed on its own and compiles a copy of it.
 */

export const slugSchema = z
  .string()
  .trim()
  .min(2, { message: "At least 2 characters." })
  .max(80, { message: "At most 80 characters." })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Lower-case letters, numbers and single hyphens only, e.g. tea-country-loop.",
  });

export const REGIONS = [
  "cultural-triangle",
  "hill-country",
  "south-coast",
  "east-coast",
  "west-coast",
  "north",
  "wilderness",
] as const;
export const INTERESTS = ["culture", "nature", "beach", "wildlife", "adventure", "food", "wellness"] as const;
export const INTENSITIES = ["easy", "moderate", "challenging"] as const;
export const PRICE_BANDS = ["$", "$$", "$$$"] as const;
export const TRIP_TIERS = ["short", "classic", "grand"] as const;
export const ACCOMMODATION_TIERS = ["budget", "mid-range", "luxury"] as const;
export const TRAVEL_MODES = ["road", "train", "boat", "flight"] as const;
/** Vehicle ids are fixed in code (`lib/transfers.ts`): bookings validate against them. */
export const VEHICLE_IDS = [
  "sedan",
  "sedan-electric",
  "mini-car",
  "mini-car-electric",
  "van",
  "bus",
  "scooter",
  "tuk-tuk",
] as const;

const text = (max: number) => z.string().trim().min(1, { message: "Required." }).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const month = z.number().int().min(1).max(12);
const months = z.array(month).max(12);
/** A real price the site shows as "From $X". Optional: without it the band is shown. */
const priceFromUsd = z.number().int().min(1).max(1_000_000).optional();

/**
 * Where an image may come from: a file already in the site (`/images/...`), one
 * uploaded through the admin (`/media/<id>.<ext>`), or an Unsplash URL (the
 * only remote host the CSP allows, ADR-006).
 */
const imageSrc = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) =>
      /^\/(images|media)\/[A-Za-z0-9._\-/]+$/.test(value) || /^https:\/\/images\.unsplash\.com\//.test(value),
    { message: "Use an uploaded image (/media/…), a site image (/images/…) or an Unsplash URL." },
  );

/**
 * Credit links are rendered as `<a href>` on /credits, so only https is
 * accepted: never `javascript:`, `data:` or any other scheme (D-36 security review).
 */
const httpsUrl = z.url({ protocol: /^https$/, message: "Use a full https:// web address." }).max(500);

export const imageSchema = z.object({
  src: imageSrc,
  alt: text(300),
  credit: optionalText(200),
  sourceUrl: httpsUrl.optional(),
  licenceUrl: httpsUrl.optional(),
});

const coordinatesSchema = z.object({
  lat: z.number().min(5.5).max(10.1),
  lng: z.number().min(79.4).max(82.1),
});

const seasonal = {
  bestMonths: months,
  shoulderMonths: months,
  avoidMonths: months,
  seasonNote: text(300),
};

export const regionSchema = z.object({
  slug: z.enum(REGIONS),
  name: text(80),
  character: text(160),
  description: text(2000),
});

export const destinationSchema = z.object({
  slug: slugSchema,
  name: text(80),
  tagline: text(160),
  summary: text(600),
  description: z.array(text(2000)).min(1).max(12),
  region: z.enum(REGIONS),
  interests: z.array(z.enum(INTERESTS)).min(1),
  suggestedNights: z.number().int().min(0).max(14),
  image: imageSchema,
  highlights: z.array(text(200)).max(20),
  travel: z
    .array(
      z.object({
        to: slugSchema,
        minutes: z.number().int().min(1).max(1440),
        mode: z.enum(TRAVEL_MODES).optional(),
        note: optionalText(200),
      }),
    )
    .max(20),
  coordinates: coordinatesSchema,
  experienceSlugs: z.array(slugSchema).max(40),
  nearbySlugs: z.array(slugSchema).max(12),
  appeal: z.number().int().min(0).max(100),
  ...seasonal,
});

export const experienceSchema = z.object({
  slug: slugSchema,
  name: text(120),
  destinationSlug: slugSchema,
  category: z.enum(INTERESTS),
  summary: text(600),
  description: z.array(text(2000)).min(1).max(12),
  durationHours: z.number().min(0.25).max(72),
  intensity: z.enum(INTENSITIES),
  priceBand: z.enum(PRICE_BANDS),
  priceFromUsd,
  image: imageSchema,
  included: z.array(text(200)).max(20),
  goodToKnow: z.array(text(300)).max(20),
  ...seasonal,
});

export const tripDaySchema = z.object({
  day: z.number().int().min(1).max(60),
  title: text(120),
  destinationSlug: slugSchema,
  summary: text(1500),
  experienceSlugs: z.array(slugSchema).max(10),
  overnightIn: slugSchema.nullable(),
  driveMinutes: z.number().int().min(0).max(1440),
});

export const tripSchema = z
  .object({
    slug: slugSchema,
    name: text(120),
    tagline: text(160),
    summary: text(800),
    durationDays: z.number().int().min(1).max(60),
    tier: z.enum(TRIP_TIERS),
    interests: z.array(z.enum(INTERESTS)).min(1),
    destinationSlugs: z.array(slugSchema).min(1).max(30),
    days: z.array(tripDaySchema).min(1).max(60),
    includes: z.array(text(200)).max(30),
    excludes: z.array(text(200)).max(30),
    priceBandPerPerson: z.enum(PRICE_BANDS),
    priceFromUsd,
    image: imageSchema,
    bestMonths: months,
  })
  .superRefine((trip, ctx) => {
    if (trip.days.length !== trip.durationDays) {
      ctx.addIssue({
        code: "custom",
        path: ["days"],
        message: `The trip is ${trip.durationDays} days long but has ${trip.days.length} day entries.`,
      });
    }
    trip.days.forEach((day, index) => {
      if (day.day !== index + 1) {
        ctx.addIssue({ code: "custom", path: ["days", index, "day"], message: `Should be day ${index + 1}.` });
      }
    });
  });

export const accommodationSchema = z.object({
  slug: slugSchema,
  name: text(120),
  destinationSlug: slugSchema,
  tier: z.enum(ACCOMMODATION_TIERS),
  kind: text(60),
  summary: text(400),
  coordinates: coordinatesSchema,
  /** Per room per night. */
  priceFromUsd,
});

export const activityCategorySchema = z.object({
  id: slugSchema,
  label: text(80),
});

export const activitySchema = z.object({
  slug: slugSchema,
  name: text(120),
  categoryId: slugSchema,
  location: text(120),
  duration: text(60),
  difficulty: z.enum(INTENSITIES),
  priceBand: z.enum(PRICE_BANDS),
  priceFromUsd,
});

export const vehicleSchema = z.object({
  id: z.enum(VEHICLE_IDS),
  label: text(60),
  /** Per day with a driver. */
  priceFromUsd,
});

/** Site-wide words the admin can change without a code change. */
export const siteSettingsSchema = z.object({
  heroKicker: text(80),
  heroTitle: text(80),
  heroLead: text(300),
  heroCta: text(40),
  trustBar: z.array(text(40)).length(4),
  tripsOverline: text(40),
  tripsTitle: text(80),
  tripsLead: text(300),
});

export const CONTENT_KINDS = [
  "region",
  "destination",
  "experience",
  "trip",
  "accommodation",
  "activity-category",
  "activity",
  "vehicle",
  "site",
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const contentSchemas = {
  region: regionSchema,
  destination: destinationSchema,
  experience: experienceSchema,
  trip: tripSchema,
  accommodation: accommodationSchema,
  "activity-category": activityCategorySchema,
  activity: activitySchema,
  vehicle: vehicleSchema,
  site: siteSettingsSchema,
} as const satisfies Record<ContentKind, z.ZodType>;

/** The key each kind is stored under (`content_items.slug`). */
export function keyOf(kind: ContentKind, data: Record<string, unknown>): string {
  if (kind === "site") return "settings";
  if (kind === "activity-category" || kind === "vehicle") return String(data.id);
  return String(data.slug);
}

/** Everything the public site needs, written by `scripts/pull-content.ts`. */
export const snapshotSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  regions: z.array(regionSchema),
  destinations: z.array(destinationSchema),
  experiences: z.array(experienceSchema),
  trips: z.array(tripSchema),
  accommodations: z.array(accommodationSchema),
  activityCategories: z.array(activityCategorySchema),
  activities: z.array(activitySchema),
  vehicles: z.array(vehicleSchema),
  site: siteSettingsSchema.nullable(),
});
export type ContentSnapshot = z.infer<typeof snapshotSchema>;
