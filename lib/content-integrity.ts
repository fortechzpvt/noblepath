/**
 * Cross-reference rules for the editorial content.
 *
 * Broken slug references are the most likely failure in a content model that
 * people edit: nothing in a schema stops a trip naming a destination that has
 * since been deleted or unpublished. The same rules run in three places (D-36):
 *   - `lib/content.ts` at module load, so broken content fails `next build`;
 *   - the admin app's Publish page, which refuses to publish while any fail
 *     (the `noblepathadmin` repository keeps a copy, see its `npm run sync-schema`);
 *   - the admin's editor, after each save, as a warning.
 *
 * Pure and dependency-free, on purpose: it is compiled by both apps.
 */

interface Ref {
  readonly slug: string;
}
interface ImageRef {
  readonly image: { readonly alt: string };
}

export interface IntegrityInput {
  readonly regions: readonly { readonly slug: string }[];
  readonly destinations: readonly (Ref &
    ImageRef & {
      readonly region: string;
      readonly experienceSlugs: readonly string[];
      readonly nearbySlugs: readonly string[];
      readonly travel: readonly { readonly to: string; readonly minutes: number }[];
      readonly suggestedNights: number;
      readonly bestMonths: readonly number[];
      readonly avoidMonths: readonly number[];
    })[];
  readonly experiences: readonly (Ref & ImageRef & { readonly destinationSlug: string; readonly durationHours: number })[];
  readonly trips: readonly (Ref & {
    readonly durationDays: number;
    readonly destinationSlugs: readonly string[];
    readonly days: readonly {
      readonly day: number;
      readonly destinationSlug: string;
      readonly overnightIn: string | null;
      readonly experienceSlugs: readonly string[];
      readonly driveMinutes: number;
    }[];
  })[];
  readonly accommodations: readonly (Ref & {
    readonly destinationSlug: string;
    readonly coordinates: { readonly lat: number; readonly lng: number };
  })[];
  readonly activities: readonly (Ref & { readonly categoryId: string })[];
  readonly activityCategories: readonly { readonly id: string }[];
}

/** The longest drive a published package may ask for in one day (FR-4.5). */
export const MAX_PACKAGE_DRIVE_MINUTES = 300;

export function findContentProblems(content: IntegrityInput): string[] {
  const problems: string[] = [];
  const regionSlugs = new Set(content.regions.map((region) => region.slug));
  const destinationSlugs = new Set(content.destinations.map((destination) => destination.slug));
  const experienceSlugs = new Set(content.experiences.map((experience) => experience.slug));
  const categoryIds = new Set(content.activityCategories.map((category) => category.id));

  const duplicates = (label: string, keys: readonly string[]) => {
    const seen = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) problems.push(`Duplicate ${label} "${key}".`);
      seen.add(key);
    }
  };
  duplicates("destination slug", content.destinations.map((item) => item.slug));
  duplicates("experience slug", content.experiences.map((item) => item.slug));
  duplicates("trip slug", content.trips.map((item) => item.slug));
  duplicates("accommodation slug", content.accommodations.map((item) => item.slug));
  duplicates("activity slug", content.activities.map((item) => item.slug));

  for (const destination of content.destinations) {
    const name = `Destination "${destination.slug}"`;
    if (!regionSlugs.has(destination.region)) problems.push(`${name} has unknown region "${destination.region}".`);
    for (const slug of destination.experienceSlugs) {
      if (!experienceSlugs.has(slug)) problems.push(`${name} references unknown experience "${slug}".`);
    }
    for (const slug of destination.nearbySlugs) {
      if (!destinationSlugs.has(slug)) problems.push(`${name} references unknown nearby destination "${slug}".`);
      if (slug === destination.slug) problems.push(`${name} lists itself as nearby.`);
    }
    for (const link of destination.travel) {
      if (!destinationSlugs.has(link.to)) problems.push(`${name} has a travel link to unknown destination "${link.to}".`);
      if (!Number.isFinite(link.minutes) || link.minutes <= 0) {
        problems.push(`${name} has a non-positive travel time to "${link.to}".`);
      }
    }
    if (destination.suggestedNights < 1) problems.push(`${name} has suggestedNights below 1.`);
    if (destination.image.alt.trim().length === 0) problems.push(`${name} has an image with empty alt text.`);
    for (const month of destination.bestMonths) {
      if (destination.avoidMonths.includes(month)) problems.push(`${name} lists month ${month} as both best and avoid.`);
    }
  }

  for (const stay of content.accommodations) {
    if (!destinationSlugs.has(stay.destinationSlug)) {
      problems.push(`Accommodation "${stay.slug}" references unknown destination "${stay.destinationSlug}".`);
    }
    if (!Number.isFinite(stay.coordinates.lat) || !Number.isFinite(stay.coordinates.lng)) {
      problems.push(`Accommodation "${stay.slug}" has invalid coordinates.`);
    }
  }

  for (const experience of content.experiences) {
    const name = `Experience "${experience.slug}"`;
    if (!destinationSlugs.has(experience.destinationSlug)) {
      problems.push(`${name} references unknown destination "${experience.destinationSlug}".`);
    }
    if (experience.image.alt.trim().length === 0) problems.push(`${name} has an image with empty alt text.`);
    if (!Number.isFinite(experience.durationHours) || experience.durationHours <= 0) {
      problems.push(`${name} has a non-positive durationHours.`);
    }
  }

  for (const trip of content.trips) {
    const name = `Trip "${trip.slug}"`;
    if (trip.days.length !== trip.durationDays) {
      problems.push(`${name} declares ${trip.durationDays} days but has ${trip.days.length} day entries.`);
    }
    for (const slug of trip.destinationSlugs) {
      if (!destinationSlugs.has(slug)) problems.push(`${name} references unknown destination "${slug}".`);
    }
    trip.days.forEach((day, index) => {
      if (day.day !== index + 1) problems.push(`${name} day at position ${index + 1} is numbered ${day.day}.`);
      if (!destinationSlugs.has(day.destinationSlug)) {
        problems.push(`${name} day ${day.day} references unknown destination "${day.destinationSlug}".`);
      }
      if (day.overnightIn !== null && !destinationSlugs.has(day.overnightIn)) {
        problems.push(`${name} day ${day.day} overnights in unknown destination "${day.overnightIn}".`);
      }
      for (const slug of day.experienceSlugs) {
        if (!experienceSlugs.has(slug)) problems.push(`${name} day ${day.day} references unknown experience "${slug}".`);
      }
      if (day.driveMinutes < 0) problems.push(`${name} day ${day.day} has a negative drive time.`);
      // FR-4.5 applies to generated plans; packages we publish ourselves must never breach it.
      if (day.driveMinutes > MAX_PACKAGE_DRIVE_MINUTES) {
        problems.push(
          `${name} day ${day.day} requires ${day.driveMinutes} minutes of driving, over the ${MAX_PACKAGE_DRIVE_MINUTES} minute limit.`,
        );
      }
    });
  }

  for (const activity of content.activities) {
    if (!categoryIds.has(activity.categoryId)) {
      problems.push(`Activity "${activity.slug}" references unknown category "${activity.categoryId}".`);
    }
  }

  return problems;
}
