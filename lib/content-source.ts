import rawSnapshot from "@/content/generated/snapshot.json";
import { accommodations as bundledAccommodations } from "@/content/accommodations";
import {
  activities as bundledActivities,
  activityCategories as bundledActivityCategories,
  type Activity,
  type ActivityCategory,
} from "@/content/activities";
import { destinations as bundledDestinations } from "@/content/destinations";
import { experiences as bundledExperiences } from "@/content/experiences";
import { regions as bundledRegions } from "@/content/regions";
import { trips as bundledTrips } from "@/content/trips";
import type { ContentSnapshot } from "@/lib/content-schema";
import type { Accommodation, Destination, Experience, RegionInfo, TripPackage } from "@/lib/types";

/**
 * Where the site's content comes from (D-36).
 *
 * `content/generated/snapshot.json` is written by `scripts/pull-content.ts`
 * before every build. When the build had a database, it holds everything
 * published in the admin app, already validated, and the site uses it. When it
 * did not (local development, or no database configured), it is a placeholder
 * and the site falls back to the content bundled in `content/*.ts`, which is
 * also what `npm run db:seed` loads into a new database.
 *
 * Every page, component and helper reads content through this module (or
 * `lib/content.ts`, built on it), never from `content/*.ts` directly, so the
 * switch happens in exactly one place. It is a plain import, so client
 * components get the same data in the browser.
 */

const snapshot: ContentSnapshot | null =
  (rawSnapshot as { version?: number }).version === 1 ? (rawSnapshot as unknown as ContentSnapshot) : null;

/** True when this build's content came from the admin database. */
export const contentFromDatabase = snapshot !== null;

export const regions: readonly RegionInfo[] = snapshot?.regions ?? bundledRegions;
export const destinations: readonly Destination[] = (snapshot?.destinations as readonly Destination[]) ?? bundledDestinations;
export const experiences: readonly Experience[] = (snapshot?.experiences as readonly Experience[]) ?? bundledExperiences;
export const trips: readonly TripPackage[] = (snapshot?.trips as readonly TripPackage[]) ?? bundledTrips;
export const accommodations: readonly Accommodation[] = snapshot?.accommodations ?? bundledAccommodations;
export const activityCategories: readonly ActivityCategory[] = snapshot?.activityCategories ?? bundledActivityCategories;
export const activities: readonly Activity[] = snapshot?.activities ?? bundledActivities;

/** Admin-editable vehicle labels and prices; `null` means use the defaults in `lib/transfers.ts`. */
export const vehicleOverrides = snapshot?.vehicles ?? null;

export interface SiteSettings {
  readonly heroKicker: string;
  /** Line breaks (`\n`) are kept as breaks on tablet and wider. */
  readonly heroTitle: string;
  readonly heroLead: string;
  readonly heroCta: string;
  readonly trustBar: readonly string[];
  readonly tripsOverline: string;
  readonly tripsTitle: string;
  readonly tripsLead: string;
}

/** The words the site shipped with. Also the seed for the admin's "Site text" page. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroKicker: "Sri Lanka is waiting ….",
  heroTitle: "Explore\nSri Lanka with us",
  heroLead: "Discover breathtaking destinations, unique experiences and unforgettable memories across Sri Lanka.",
  heroCta: "Plan Your Trip",
  // IMPL-01: "Secure Booking", not "Secure Payments" — v1 takes no card payments (ADR-004).
  trustBar: ["Best Price", "24/7 Travel Support", "Flexible Booking", "Secure Booking"],
  tripsOverline: "Ready to go",
  tripsTitle: "Trips you can book today",
  tripsLead:
    "Complete routes with the driving, the stays and the timing already worked out. Take one as it is, or use it as a starting point.",
};

export const siteSettings: SiteSettings = snapshot?.site ?? DEFAULT_SITE_SETTINGS;
