import { accommodations } from "@/content/accommodations";
import { activities, type Activity } from "@/content/activities";
import { destinations } from "@/content/destinations";
import { experiences } from "@/content/experiences";
import { regions } from "@/content/regions";
import { trips } from "@/content/trips";
import { ROAD_SPEED_KMH, ROAD_WINDING_FACTOR, haversineKm } from "@/lib/geo";
import type {
  Accommodation,
  AccommodationTier,
  Destination,
  Experience,
  Interest,
  Region,
  RegionInfo,
  TripPackage,
  TripTier,
} from "@/lib/types";

/**
 * Typed, synchronous accessors over the editorial content.
 *
 * Everything here is pure and reads from compiled-in data, so every function is
 * safe to call during static rendering. Nothing in this module touches the
 * network, the filesystem or the environment.
 */

const destinationBySlug = new Map(destinations.map((d) => [d.slug, d]));
const experienceBySlug = new Map(experiences.map((e) => [e.slug, e]));
const accommodationBySlug = new Map(accommodations.map((a) => [a.slug, a]));
const activityBySlug = new Map(activities.map((a) => [a.slug, a]));
const tripBySlug = new Map(trips.map((t) => [t.slug, t]));
const regionBySlugMap = new Map(regions.map((r) => [r.slug, r]));

/* -------------------------------------------------------------------------- */
/* Accommodation                                                              */
/* -------------------------------------------------------------------------- */

export function getAccommodationBySlug(slug: string): Accommodation | undefined {
  return accommodationBySlug.get(slug);
}

/** Every curated stay at a destination in one budget tier, in editorial order. */
export function getAccommodations(
  destinationSlug: string,
  tier: AccommodationTier,
): readonly Accommodation[] {
  return accommodations.filter((a) => a.destinationSlug === destinationSlug && a.tier === tier);
}

/** Every curated stay across the island, optionally limited to one tier. */
export function getAllAccommodations(tier?: AccommodationTier): readonly Accommodation[] {
  return tier === undefined ? accommodations : accommodations.filter((a) => a.tier === tier);
}

/** True when at least one stay is curated for the destination, in any tier. */
export function hasAccommodations(destinationSlug: string): boolean {
  return accommodations.some((a) => a.destinationSlug === destinationSlug);
}

/* -------------------------------------------------------------------------- */
/* Regions                                                                    */
/* -------------------------------------------------------------------------- */

export function getAllRegions(): readonly RegionInfo[] {
  return regions;
}

export function getRegionBySlug(slug: string): RegionInfo | undefined {
  return regionBySlugMap.get(slug as Region);
}

/* -------------------------------------------------------------------------- */
/* Destinations                                                               */
/* -------------------------------------------------------------------------- */

export function getAllDestinations(): readonly Destination[] {
  return destinations;
}

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinationBySlug.get(slug);
}

export function getDestinationsByRegion(region: Region): readonly Destination[] {
  return destinations.filter((d) => d.region === region);
}

export function getDestinationsByInterest(interest: Interest): readonly Destination[] {
  return destinations.filter((d) => d.interests.includes(interest));
}

/**
 * The most compelling destinations first.
 *
 * Ordered by the editorial `appeal` weight, with the slug as a tie-break so the
 * result is stable across renders and across builds.
 */
export function getFeaturedDestinations(limit = 6): readonly Destination[] {
  return [...destinations]
    .sort((a, b) => b.appeal - a.appeal || a.slug.localeCompare(b.slug))
    .slice(0, Math.max(0, limit));
}

/**
 * What to suggest next on a destination page (FR-1.4).
 *
 * Authored `nearbySlugs` come first because they are an editorial judgement,
 * then same-region destinations by appeal, then the geographically closest — so
 * the list is always full even if an author only named one neighbour.
 */
export function getRelatedDestinations(slug: string, limit = 3): readonly Destination[] {
  const origin = destinationBySlug.get(slug);
  if (!origin) return [];

  const picked: Destination[] = [];
  const seen = new Set<string>([slug]);

  const add = (candidate: Destination | undefined): void => {
    if (!candidate || seen.has(candidate.slug) || picked.length >= limit) return;
    seen.add(candidate.slug);
    picked.push(candidate);
  };

  origin.nearbySlugs.forEach((s) => add(destinationBySlug.get(s)));

  if (picked.length < limit) {
    [...getDestinationsByRegion(origin.region)]
      .sort((a, b) => b.appeal - a.appeal || a.slug.localeCompare(b.slug))
      .forEach(add);
  }

  if (picked.length < limit) {
    [...destinations]
      .filter((d) => d.slug !== slug)
      .sort(
        (a, b) =>
          getTravelMinutes(slug, a.slug) - getTravelMinutes(slug, b.slug) ||
          a.slug.localeCompare(b.slug),
      )
      .forEach(add);
  }

  return picked;
}

/* -------------------------------------------------------------------------- */
/* Experiences                                                                */
/* -------------------------------------------------------------------------- */

export function getAllExperiences(): readonly Experience[] {
  return experiences;
}

export function getExperienceBySlug(slug: string): Experience | undefined {
  return experienceBySlug.get(slug);
}

export function getExperiencesByCategory(category: Interest): readonly Experience[] {
  return experiences.filter((e) => e.category === category);
}

/**
 * Experiences to show on a destination page (FR-2.3).
 *
 * Union of the destination's authored `experienceSlugs` (in the order the
 * author chose) and every experience based at that destination. The two differ
 * on purpose: the Kandy–Ella train is based at Kandy but is a practical option
 * from Nuwara Eliya and Ella as well.
 */
export function getExperiencesForDestination(slug: string): readonly Experience[] {
  const destination = destinationBySlug.get(slug);
  const result: Experience[] = [];
  const seen = new Set<string>();

  for (const experienceSlug of destination?.experienceSlugs ?? []) {
    const experience = experienceBySlug.get(experienceSlug);
    if (experience && !seen.has(experience.slug)) {
      seen.add(experience.slug);
      result.push(experience);
    }
  }
  for (const experience of experiences) {
    if (experience.destinationSlug === slug && !seen.has(experience.slug)) {
      seen.add(experience.slug);
      result.push(experience);
    }
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                 */
/*                                                                             */
/* Deliberately separate from Experiences above: `content/activities.ts` is   */
/* the broad catalogue behind `/activities`, not the seasonal, photographed   */
/* set the planner uses. See that file's header comment.                     */
/* -------------------------------------------------------------------------- */

export function getActivityBySlug(slug: string): Activity | undefined {
  return activityBySlug.get(slug);
}

/* -------------------------------------------------------------------------- */
/* Trips                                                                      */
/* -------------------------------------------------------------------------- */

export function getAllTrips(): readonly TripPackage[] {
  return trips;
}

export function getTripBySlug(slug: string): TripPackage | undefined {
  return tripBySlug.get(slug);
}

export function getTripsByTier(tier: TripTier): readonly TripPackage[] {
  return trips.filter((t) => t.tier === tier);
}

/* -------------------------------------------------------------------------- */
/* Slug sets — used by request validation                                     */
/* -------------------------------------------------------------------------- */

export function isKnownDestinationSlug(slug: string): boolean {
  return destinationBySlug.has(slug);
}

export function isKnownExperienceSlug(slug: string): boolean {
  return experienceBySlug.has(slug);
}

export function isKnownTripSlug(slug: string): boolean {
  return tripBySlug.has(slug);
}

/* -------------------------------------------------------------------------- */
/* Travel graph                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Used when two destinations have no path through the authored travel graph and
 * at least one has no usable coordinates. Large enough that the planner treats
 * the pair as "far apart" rather than adjacent.
 */
const UNKNOWN_TRAVEL_MINUTES = 300;


const slugOrder: readonly string[] = destinations.map((d) => d.slug);
const indexBySlug = new Map(slugOrder.map((slug, i) => [slug, i]));

/**
 * All-pairs shortest travel times, computed once on first use.
 *
 * Authored `travel` links are sparse and one-directional in the content files,
 * but a road works in both directions, so the graph is symmetric and the
 * shortest path through intermediate stops fills in the pairs nobody authored
 * (Jaffna to Mirissa, for example). Floyd–Warshall is O(n³) on 21 nodes, which
 * is a few thousand operations — cheap enough to do eagerly on first call and
 * far simpler than an on-demand Dijkstra.
 */
let travelMatrix: number[][] | null = null;

function buildTravelMatrix(): number[][] {
  const n = slugOrder.length;
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : Number.POSITIVE_INFINITY)),
  );

  for (const destination of destinations) {
    const from = indexBySlug.get(destination.slug);
    if (from === undefined) continue;
    for (const link of destination.travel) {
      const to = indexBySlug.get(link.to);
      if (to === undefined || from === to) continue;
      const minutes = Math.max(0, link.minutes);
      const rowFrom = matrix[from];
      const rowTo = matrix[to];
      if (!rowFrom || !rowTo) continue;
      if (minutes < (rowFrom[to] ?? Number.POSITIVE_INFINITY)) rowFrom[to] = minutes;
      if (minutes < (rowTo[from] ?? Number.POSITIVE_INFINITY)) rowTo[from] = minutes;
    }
  }

  for (let k = 0; k < n; k++) {
    const rowK = matrix[k];
    if (!rowK) continue;
    for (let i = 0; i < n; i++) {
      const rowI = matrix[i];
      if (!rowI) continue;
      const viaK = rowI[k];
      if (viaK === undefined || viaK === Number.POSITIVE_INFINITY) continue;
      for (let j = 0; j < n; j++) {
        const kToJ = rowK[j];
        if (kToJ === undefined) continue;
        const candidate = viaK + kToJ;
        if (candidate < (rowI[j] ?? Number.POSITIVE_INFINITY)) rowI[j] = candidate;
      }
    }
  }

  return matrix;
}

/**
 * Estimated travel time in minutes between two destinations.
 *
 * Returns the shortest authored road route where one exists, otherwise an
 * estimate from the coordinates, otherwise a deliberately large constant.
 * Times are advisory (requirements §7.5) and always symmetric.
 */
export function getTravelMinutes(fromSlug: string, toSlug: string): number {
  if (fromSlug === toSlug) return 0;

  const from = indexBySlug.get(fromSlug);
  const to = indexBySlug.get(toSlug);

  if (from !== undefined && to !== undefined) {
    travelMatrix ??= buildTravelMatrix();
    const minutes = travelMatrix[from]?.[to];
    if (minutes !== undefined && Number.isFinite(minutes)) return Math.round(minutes);
  }

  const a = destinationBySlug.get(fromSlug)?.coordinates;
  const b = destinationBySlug.get(toSlug)?.coordinates;
  if (a && b) {
    return Math.round(((haversineKm(a, b) * ROAD_WINDING_FACTOR) / ROAD_SPEED_KMH) * 60);
  }

  return UNKNOWN_TRAVEL_MINUTES;
}

/* -------------------------------------------------------------------------- */
/* Content integrity                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Validates that every cross-reference in the editorial content resolves.
 *
 * Broken slug references are by far the most likely failure mode in a
 * file-based content model: nothing in the type system stops an author writing
 * `experienceSlugs: ["yala-safri"]`. Exported so it can be called from a test
 * or a script; it also runs at module load (below) so a dangling reference
 * fails `next build` instead of producing a 404 in front of a visitor.
 */
export function checkContentIntegrity(): string[] {
  const problems: string[] = [];
  const regionSlugs = new Set(regions.map((r) => r.slug));

  const seenDestinations = new Set<string>();
  for (const destination of destinations) {
    if (seenDestinations.has(destination.slug)) {
      problems.push(`Duplicate destination slug "${destination.slug}".`);
    }
    seenDestinations.add(destination.slug);

    if (!regionSlugs.has(destination.region)) {
      problems.push(`Destination "${destination.slug}" has unknown region "${destination.region}".`);
    }
    for (const experienceSlug of destination.experienceSlugs) {
      if (!experienceBySlug.has(experienceSlug)) {
        problems.push(
          `Destination "${destination.slug}" references unknown experience "${experienceSlug}".`,
        );
      }
    }
    for (const nearbySlug of destination.nearbySlugs) {
      if (!destinationBySlug.has(nearbySlug)) {
        problems.push(
          `Destination "${destination.slug}" references unknown nearby destination "${nearbySlug}".`,
        );
      }
      if (nearbySlug === destination.slug) {
        problems.push(`Destination "${destination.slug}" lists itself as nearby.`);
      }
    }
    for (const link of destination.travel) {
      if (!destinationBySlug.has(link.to)) {
        problems.push(
          `Destination "${destination.slug}" has a travel link to unknown destination "${link.to}".`,
        );
      }
      if (!Number.isFinite(link.minutes) || link.minutes <= 0) {
        problems.push(
          `Destination "${destination.slug}" has a non-positive travel time to "${link.to}".`,
        );
      }
    }
    if (destination.suggestedNights < 1) {
      problems.push(`Destination "${destination.slug}" has suggestedNights below 1.`);
    }
    if (destination.image.alt.trim().length === 0) {
      problems.push(`Destination "${destination.slug}" has an image with empty alt text.`);
    }
    for (const month of destination.bestMonths) {
      if (destination.avoidMonths.includes(month)) {
        problems.push(
          `Destination "${destination.slug}" lists month ${month} as both best and avoid.`,
        );
      }
    }
  }

  const seenStays = new Set<string>();
  for (const stay of accommodations) {
    if (seenStays.has(stay.slug)) problems.push(`Duplicate accommodation slug "${stay.slug}".`);
    seenStays.add(stay.slug);
    if (!destinationBySlug.has(stay.destinationSlug)) {
      problems.push(
        `Accommodation "${stay.slug}" references unknown destination "${stay.destinationSlug}".`,
      );
    }
    if (!Number.isFinite(stay.coordinates.lat) || !Number.isFinite(stay.coordinates.lng)) {
      problems.push(`Accommodation "${stay.slug}" has invalid coordinates.`);
    }
  }

  const seenExperiences = new Set<string>();
  for (const experience of experiences) {
    if (seenExperiences.has(experience.slug)) {
      problems.push(`Duplicate experience slug "${experience.slug}".`);
    }
    seenExperiences.add(experience.slug);

    if (!destinationBySlug.has(experience.destinationSlug)) {
      problems.push(
        `Experience "${experience.slug}" references unknown destination "${experience.destinationSlug}".`,
      );
    }
    if (experience.image.alt.trim().length === 0) {
      problems.push(`Experience "${experience.slug}" has an image with empty alt text.`);
    }
    if (!Number.isFinite(experience.durationHours) || experience.durationHours <= 0) {
      problems.push(`Experience "${experience.slug}" has a non-positive durationHours.`);
    }
  }

  const seenTrips = new Set<string>();
  for (const trip of trips) {
    if (seenTrips.has(trip.slug)) problems.push(`Duplicate trip slug "${trip.slug}".`);
    seenTrips.add(trip.slug);

    if (trip.days.length !== trip.durationDays) {
      problems.push(
        `Trip "${trip.slug}" declares ${trip.durationDays} days but has ${trip.days.length} day entries.`,
      );
    }
    for (const destinationSlug of trip.destinationSlugs) {
      if (!destinationBySlug.has(destinationSlug)) {
        problems.push(`Trip "${trip.slug}" references unknown destination "${destinationSlug}".`);
      }
    }
    trip.days.forEach((day, index) => {
      if (day.day !== index + 1) {
        problems.push(`Trip "${trip.slug}" day at position ${index + 1} is numbered ${day.day}.`);
      }
      if (!destinationBySlug.has(day.destinationSlug)) {
        problems.push(
          `Trip "${trip.slug}" day ${day.day} references unknown destination "${day.destinationSlug}".`,
        );
      }
      if (day.overnightIn !== null && !destinationBySlug.has(day.overnightIn)) {
        problems.push(
          `Trip "${trip.slug}" day ${day.day} overnights in unknown destination "${day.overnightIn}".`,
        );
      }
      for (const experienceSlug of day.experienceSlugs) {
        if (!experienceBySlug.has(experienceSlug)) {
          problems.push(
            `Trip "${trip.slug}" day ${day.day} references unknown experience "${experienceSlug}".`,
          );
        }
      }
      if (day.driveMinutes < 0) {
        problems.push(`Trip "${trip.slug}" day ${day.day} has a negative drive time.`);
      }
      // FR-4.5 applies to generated plans; packages we publish ourselves must never breach it.
      if (day.driveMinutes > 300) {
        problems.push(
          `Trip "${trip.slug}" day ${day.day} requires ${day.driveMinutes} minutes of driving, over the 300 minute limit.`,
        );
      }
    });
  }

  return problems;
}

const integrityProblems = checkContentIntegrity();
if (integrityProblems.length > 0) {
  throw new Error(
    `Noble Path content integrity check failed with ${integrityProblems.length} problem(s):\n  - ${integrityProblems.join(
      "\n  - ",
    )}`,
  );
}
