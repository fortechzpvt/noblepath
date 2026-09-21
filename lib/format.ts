import { regions } from "@/content/regions";
import type {
  Interest,
  Intensity,
  Month,
  PriceBand,
  Region,
  Seasonal,
  SeasonQuality,
} from "@/lib/types";

/**
 * Presentation helpers shared by server and client components.
 *
 * This module is deliberately pure and depends only on `lib/types.ts` and
 * `content/regions.ts`, so it can be imported from a `"use client"` component
 * without dragging the content graph or any server-only code into the bundle.
 */

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Short month name for a month number, e.g. `3` → `"Mar"`. */
export function formatMonth(month: Month): string {
  return SHORT_MONTH_NAMES[month - 1] ?? "";
}

/**
 * A traveller-facing month range.
 *
 * Contiguous runs collapse to `"Jan–Apr"`, runs are detected across the year
 * boundary so December–March reads `"Dec–Mar"` rather than `"Jan–Mar & Dec"`,
 * and separate runs are listed: `"May, Jul & Sep"`. An empty list means the
 * entity has no seasonal restriction at all, which reads as `"Year round"`.
 */
export function formatMonthRange(months: readonly Month[]): string {
  const present = new Set(months);
  if (present.size === 0 || present.size >= 12) return "Year round";

  const previous = (m: Month): Month => (m === 1 ? 12 : ((m - 1) as Month));
  const next = (m: Month): Month => (m === 12 ? 1 : ((m + 1) as Month));

  // A run starts at any selected month whose predecessor is not selected.
  const starts = [...present].filter((m) => !present.has(previous(m))).sort((a, b) => a - b);

  const runs = starts.map((start) => {
    let end = start;
    while (present.has(next(end))) end = next(end);
    return start === end ? formatMonth(start) : `${formatMonth(start)}–${formatMonth(end)}`;
  });

  if (runs.length === 1) return runs[0] ?? "Year round";
  return `${runs.slice(0, -1).join(", ")} & ${runs[runs.length - 1]}`;
}

const REGION_NAMES: ReadonlyMap<Region, string> = new Map(regions.map((r) => [r.slug, r.name]));

/**
 * Display name for a region slug.
 *
 * Reads `content/regions.ts` rather than keeping a second hand-maintained map,
 * so a rename in the content layer cannot drift from the UI.
 */
export function regionName(region: Region): string {
  return REGION_NAMES.get(region) ?? titleCaseSlug(region);
}

const INTEREST_NAMES: Readonly<Record<Interest, string>> = {
  culture: "Culture",
  nature: "Nature",
  beach: "Beach",
  wildlife: "Wildlife",
  adventure: "Adventure",
  food: "Food",
  wellness: "Wellness",
};

/** Display label for an interest tag, e.g. `"wildlife"` → `"Wildlife"`. */
export function interestName(interest: Interest): string {
  return INTEREST_NAMES[interest] ?? titleCaseSlug(interest);
}

const INTENSITY_NAMES: Readonly<Record<Intensity, string>> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
};

/** Display label for an experience's physical demand. */
export function formatIntensity(intensity: Intensity): string {
  return INTENSITY_NAMES[intensity] ?? titleCaseSlug(intensity);
}

const PRICE_BAND_NAMES: Readonly<Record<PriceBand, string>> = {
  $: "Good value",
  $$: "Mid-range",
  $$$: "Premium",
};

/**
 * Traveller-facing label for a price band.
 *
 * Deliberately returns a band and never a number: the domain model only carries
 * indicative bands and requirements §7.4 states that prices are bands, not live
 * quotes. Rendering a concrete figure here would be inventing data.
 */
export function formatPriceBand(band: PriceBand): string {
  return PRICE_BAND_NAMES[band] ?? band;
}

/** Minutes as `"45m"`, `"4h"` or `"3h 40m"`. Used for every drive time on the site. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Experience duration as a phrase rather than a precise figure.
 *
 * Durations are door-to-door estimates, so a range (`"2–3 hours"`) or a shape
 * (`"Half day"`) is more honest than `"2.5 hours"`.
 */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "Flexible";
  if (hours >= 24) {
    const days = Math.max(1, Math.round(hours / 24));
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (hours >= 7) return "Full day";
  if (hours >= 4) return "Half day";
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (Number.isInteger(hours)) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${Math.floor(hours)}–${Math.ceil(hours)} hours`;
}

/**
 * How good this destination or experience is in a given month.
 *
 * Precedence is best → avoid → shoulder, and anything unlisted is `"fair"`.
 * The planner scores against exactly this function so that what a traveller
 * reads on a card and what the itinerary engine decided can never disagree.
 */
export function seasonQualityFor(entity: Seasonal, month: Month): SeasonQuality {
  if (entity.bestMonths.includes(month)) return "excellent";
  if (entity.avoidMonths.includes(month)) return "poor";
  if (entity.shoulderMonths.includes(month)) return "good";
  return "fair";
}

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part.length > 0 ? part[0]?.toUpperCase() + part.slice(1) : part))
    .join(" ");
}
