import {
  getAllDestinations,
  getDestinationBySlug,
  getExperiencesForDestination,
  getTravelMinutes,
} from "@/lib/content";
import { formatDuration, seasonQualityFor } from "@/lib/format";
import type {
  Destination,
  Experience,
  Interest,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  Month,
  Pace,
  PlanInput,
  Region,
  ResolvedPlanInput,
} from "@/lib/types";

/**
 * The Noble Path itinerary engine (FR-4).
 *
 * `generateItinerary` is pure and deterministic: the same `PlanInput` always
 * produces exactly the same `Itinerary`. It never reads the clock, never uses
 * `Math.random`, and every sort has a slug tie-break, because a plan the
 * traveller saved in the browser (FR-4.4) must still look the same tomorrow.
 *
 * The shape of the algorithm is: score every destination against the selected
 * interests and the arrival month, greedily select a set that fits the day
 * budget with a bias against over-loading one region, order that set by nearest
 * neighbour from the arrival point, then lay out the days and attach matching
 * experiences.
 */

export const ITINERARY_ENGINE_VERSION = "noble-path-planner-1";

/** FR-4.5 — a day beyond this much driving gets flagged to the traveller. */
export const LONG_DRIVE_MINUTES = 300;

const MIN_TRIP_DAYS = 2;
const MAX_TRIP_DAYS = 30;
const DEFAULT_TRIP_DAYS = 7;
const DEFAULT_STARTING_POINT = "colombo";

const VALID_INTERESTS: readonly Interest[] = [
  "culture",
  "nature",
  "beach",
  "wildlife",
  "adventure",
  "food",
  "wellness",
];

const VALID_PACES: readonly Pace[] = ["relaxed", "balanced", "packed"];

interface PaceRule {
  /** Fewest nights worth stopping for at this pace. */
  readonly minNights: number;
  /** Most nights to spend in one place before the trip stops feeling like travel. */
  readonly maxNights: number;
  /** Applied to the destination's editorial `suggestedNights`. */
  readonly nightsDelta: number;
  /** Target number of experiences attached to a full day. */
  readonly activitiesPerDay: number;
}

const PACE_RULES: Readonly<Record<Pace, PaceRule>> = {
  relaxed: { minNights: 2, maxNights: 4, nightsDelta: 1, activitiesPerDay: 1 },
  balanced: { minNights: 1, maxNights: 3, nightsDelta: 0, activitiesPerDay: 2 },
  packed: { minNights: 1, maxNights: 2, nightsDelta: -1, activitiesPerDay: 3 },
};

const SEASON_SCORE: Readonly<Record<string, number>> = {
  excellent: 14,
  good: 5,
  fair: 0,
  poor: -22,
};

/** Weight per matched interest tag. */
const INTEREST_MATCH_SCORE = 12;
/** Applied when the traveller chose interests and a destination matches none of them. */
const NO_INTEREST_MATCH_PENALTY = 26;
/** Subtracted per destination already chosen from the same region, to spread the route out. */
const REGION_REPEAT_PENALTY = 7;
/**
 * Score cost per hour of travel between a candidate and the nearest place
 * already on the plan (or the arrival point, for the first stop).
 *
 * Without this the selector happily picks the five highest-scoring places in
 * the country and leaves the router to join Yala to Jaffna. Charging for
 * distance at selection time is what keeps a short trip in one part of the
 * island; it is deliberately gentle, so a genuinely outstanding match can still
 * justify a long drive.
 */
const TRAVEL_COST_PER_HOUR = 2.5;
/** Travel-time discount applied when the next stop is in the region we are already in. */
const REGION_CLUSTER_BONUS_MINUTES = 45;

/* -------------------------------------------------------------------------- */
/* Input handling                                                             */
/* -------------------------------------------------------------------------- */

interface ResolvedInput {
  readonly resolved: ResolvedPlanInput;
  readonly warnings: string[];
}

function resolveInput(input: PlanInput): ResolvedInput {
  const warnings: string[] = [];

  let days = Number.isFinite(input.days) ? Math.round(input.days) : DEFAULT_TRIP_DAYS;
  if (days < MIN_TRIP_DAYS) {
    warnings.push(
      `A Sri Lanka trip needs at least ${MIN_TRIP_DAYS} days to be worth the flight, so we have planned ${MIN_TRIP_DAYS}.`,
    );
    days = MIN_TRIP_DAYS;
  } else if (days > MAX_TRIP_DAYS) {
    warnings.push(
      `We plan up to ${MAX_TRIP_DAYS} days at a time. Here are your first ${MAX_TRIP_DAYS} days — talk to us about extending the rest.`,
    );
    days = MAX_TRIP_DAYS;
  }

  const rawMonth = Number.isFinite(input.arrivalMonth) ? Math.round(input.arrivalMonth) : 0;
  let arrivalMonth: Month;
  if (rawMonth >= 1 && rawMonth <= 12) {
    arrivalMonth = rawMonth as Month;
  } else {
    arrivalMonth = 1;
    warnings.push("We could not read your arrival month, so this plan assumes January.");
  }

  const interests: Interest[] = [];
  for (const interest of input.interests ?? []) {
    if (VALID_INTERESTS.includes(interest) && !interests.includes(interest)) {
      interests.push(interest);
    }
  }
  if (interests.length === 0) {
    warnings.push(
      "You did not pick any interests, so this is a broad first-time route covering the island's highlights.",
    );
  }

  let startingPoint = DEFAULT_STARTING_POINT;
  if (input.startingPoint !== undefined) {
    if (getDestinationBySlug(input.startingPoint)) {
      startingPoint = input.startingPoint;
    } else {
      warnings.push(
        "We did not recognise your starting point, so this plan starts from Colombo and the airport.",
      );
    }
  }

  const pace: Pace =
    input.pace !== undefined && VALID_PACES.includes(input.pace) ? input.pace : "balanced";

  return { resolved: { days, arrivalMonth, interests, startingPoint, pace }, warnings };
}

/* -------------------------------------------------------------------------- */
/* Scoring and selection                                                      */
/* -------------------------------------------------------------------------- */

function scoreDestination(
  destination: Destination,
  interests: readonly Interest[],
  month: Month,
): number {
  // Editorial weight keeps the ranking credible when nothing else separates two places.
  let score = destination.appeal / 10;

  if (interests.length > 0) {
    const matches = destination.interests.filter((i) => interests.includes(i)).length;
    score += matches > 0 ? matches * INTEREST_MATCH_SCORE : -NO_INTEREST_MATCH_PENALTY;
  }

  score += SEASON_SCORE[seasonQualityFor(destination, month)] ?? 0;

  return score;
}

function nightsFor(destination: Destination, rule: PaceRule): number {
  const suggested = destination.suggestedNights + rule.nightsDelta;
  return Math.min(rule.maxNights, Math.max(rule.minNights, suggested));
}

/** Travel time from a candidate to the nearest place already on the plan, or to the arrival point. */
function proximityMinutes(
  slug: string,
  selected: readonly { destination: Destination }[],
  startingPoint: string,
): number {
  let nearest = getTravelMinutes(startingPoint, slug);
  for (const stop of selected) {
    const minutes = getTravelMinutes(stop.destination.slug, slug);
    if (minutes < nearest) nearest = minutes;
  }
  return nearest;
}

interface Selection {
  readonly stops: { destination: Destination; nights: number }[];
  readonly warnings: string[];
}

/**
 * Chooses which destinations to visit and for how long.
 *
 * Greedy rather than exhaustive: at each step it takes the highest-scoring
 * destination after a penalty for regions already represented, which spreads a
 * long trip across the island without needing a combinatorial search.
 */
function selectStops(resolved: ResolvedPlanInput): Selection {
  const { days, interests, arrivalMonth, pace } = resolved;
  const rule = PACE_RULES[pace];
  const warnings: string[] = [];

  const scored = getAllDestinations()
    .map((destination) => ({
      destination,
      score: scoreDestination(destination, interests, arrivalMonth),
    }))
    .sort((a, b) => b.score - a.score || a.destination.slug.localeCompare(b.destination.slug));

  if (interests.length > 0) {
    const matching = getAllDestinations().filter((d) =>
      d.interests.some((i) => interests.includes(i)),
    ).length;
    const stopsNeeded = Math.ceil(days / rule.maxNights);
    if (matching < stopsNeeded) {
      warnings.push(
        "Only a handful of places match the interests you chose, so we have added a few of the island's highlights to fill the time.",
      );
    }
  }

  const stops: { destination: Destination; nights: number }[] = [];
  const regionCount = new Map<Region, number>();
  const taken = new Set<string>();
  let remaining = days;

  while (remaining > 0 && taken.size < scored.length) {
    let best: { destination: Destination; score: number } | null = null;
    let bestEffective = Number.NEGATIVE_INFINITY;

    for (const candidate of scored) {
      if (taken.has(candidate.destination.slug)) continue;
      const repeats = regionCount.get(candidate.destination.region) ?? 0;
      const effective =
        candidate.score -
        repeats * REGION_REPEAT_PENALTY -
        (proximityMinutes(candidate.destination.slug, stops, resolved.startingPoint) / 60) *
          TRAVEL_COST_PER_HOUR;
      if (
        effective > bestEffective ||
        (effective === bestEffective &&
          best !== null &&
          candidate.destination.slug.localeCompare(best.destination.slug) < 0)
      ) {
        bestEffective = effective;
        best = candidate;
      }
    }

    if (!best) break;

    taken.add(best.destination.slug);
    regionCount.set(
      best.destination.region,
      (regionCount.get(best.destination.region) ?? 0) + 1,
    );

    const nights = Math.min(nightsFor(best.destination, rule), remaining);
    stops.push({ destination: best.destination, nights });
    remaining -= nights;
  }

  // A very long trip can run out of destinations before it runs out of days.
  // Rather than inventing stops, lengthen the ones already chosen.
  let guard = 0;
  while (remaining > 0 && stops.length > 0 && guard < MAX_TRIP_DAYS * 2) {
    guard += 1;
    for (const stop of stops) {
      if (remaining === 0) break;
      if (stop.nights >= rule.maxNights + 3) continue;
      stop.nights += 1;
      remaining -= 1;
    }
  }

  return { stops, warnings };
}

/* -------------------------------------------------------------------------- */
/* Routing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Orders the selected stops into a sensible driving route.
 *
 * Greedy nearest neighbour from the arrival point, with a fixed discount for
 * staying inside the region we are already in. This is not an optimal travelling
 * salesman solution and does not need to be: on a long thin island with one
 * arrival airport and fewer than ten stops, nearest neighbour with a clustering
 * bias produces the route a human planner would draw.
 */
function orderStops(
  stops: readonly { destination: Destination; nights: number }[],
  startingPoint: string,
): { destination: Destination; nights: number }[] {
  const remaining = [...stops];
  const ordered: { destination: Destination; nights: number }[] = [];

  // If the traveller is already standing in one of the chosen stops, start there.
  const startIndex = remaining.findIndex((s) => s.destination.slug === startingPoint);
  if (startIndex >= 0) {
    const [first] = remaining.splice(startIndex, 1);
    if (first) ordered.push(first);
  }

  let currentSlug = ordered[0]?.destination.slug ?? startingPoint;
  let currentRegion = ordered[0]?.destination.region ?? getDestinationBySlug(startingPoint)?.region;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const minutes = getTravelMinutes(currentSlug, candidate.destination.slug);
      const cost =
        minutes - (candidate.destination.region === currentRegion ? REGION_CLUSTER_BONUS_MINUTES : 0);
      const incumbent = remaining[bestIndex];
      if (
        cost < bestCost ||
        (cost === bestCost &&
          incumbent !== undefined &&
          candidate.destination.slug.localeCompare(incumbent.destination.slug) < 0)
      ) {
        bestCost = cost;
        bestIndex = index;
      }
    });

    const [next] = remaining.splice(bestIndex, 1);
    if (!next) break;
    ordered.push(next);
    currentSlug = next.destination.slug;
    currentRegion = next.destination.region;
  }

  return ordered;
}

/* -------------------------------------------------------------------------- */
/* Experience selection                                                       */
/* -------------------------------------------------------------------------- */

function rankExperiences(
  destinationSlug: string,
  interests: readonly Interest[],
  month: Month,
): readonly Experience[] {
  return [...getExperiencesForDestination(destinationSlug)]
    .map((experience) => {
      let score = SEASON_SCORE[seasonQualityFor(experience, month)] ?? 0;
      if (interests.includes(experience.category)) score += INTEREST_MATCH_SCORE;
      // Multi-day experiences (a villa stay, a tuk-tuk hire) are context, not a day plan.
      if (experience.durationHours >= 24) score -= 6;
      return { experience, score };
    })
    .sort((a, b) => b.score - a.score || a.experience.slug.localeCompare(b.experience.slug))
    .map((entry) => entry.experience);
}

/* -------------------------------------------------------------------------- */
/* Day assembly                                                               */
/* -------------------------------------------------------------------------- */

function arrivalSummary(destination: Destination, driveMinutes: number, fromName: string): string {
  if (driveMinutes <= 0) return `Start in ${destination.name}. ${destination.tagline}.`;
  return `About ${formatDuration(driveMinutes)} on the road from ${fromName}. ${destination.tagline}.`;
}

function restDaySummary(destination: Destination): string {
  return `A slower day in ${destination.name} — time for the things you found yesterday, or nothing at all.`;
}

/**
 * Generates a day-by-day itinerary (FR-4.2, FR-4.5).
 *
 * Deterministic for a given input. Always returns exactly the requested number
 * of days after clamping, and every day carries a title, a destination and a
 * summary even when no experience could be attached to it.
 */
export function generateItinerary(input: PlanInput): Itinerary {
  const { resolved, warnings: inputWarnings } = resolveInput(input);
  const warnings = [...inputWarnings];

  const selection = selectStops(resolved);
  warnings.push(...selection.warnings);

  const ordered = orderStops(selection.stops, resolved.startingPoint);

  // Nobody wants to arrive somewhere new on their last day and drive straight to
  // the airport. If the route ends with a single night reached by a real
  // transfer, give that night back to the previous stop instead.
  const finalStop = ordered[ordered.length - 1];
  const penultimateStop = ordered[ordered.length - 2];
  if (
    finalStop &&
    penultimateStop &&
    finalStop.nights === 1 &&
    getTravelMinutes(penultimateStop.destination.slug, finalStop.destination.slug) > 120
  ) {
    penultimateStop.nights += finalStop.nights;
    ordered.pop();
  }

  const rule = PACE_RULES[resolved.pace];

  const days: ItineraryDay[] = [];
  const stops: ItineraryStop[] = [];

  let dayNumber = 1;
  let previousSlug = resolved.startingPoint;
  const startName = getDestinationBySlug(resolved.startingPoint)?.name ?? "your arrival point";
  let previousName = startName;
  let totalDriveMinutes = 0;

  const totalDays = ordered.reduce((sum, stop) => sum + stop.nights, 0);

  ordered.forEach((stop, stopIndex) => {
    const destination = stop.destination;
    const driveMinutes =
      destination.slug === previousSlug ? 0 : getTravelMinutes(previousSlug, destination.slug);
    totalDriveMinutes += driveMinutes;

    const ranked = rankExperiences(destination.slug, resolved.interests, resolved.arrivalMonth);
    let experienceCursor = 0;

    const fromDay = dayNumber;

    for (let nightIndex = 0; nightIndex < stop.nights; nightIndex++) {
      const isArrivalDay = nightIndex === 0;
      const isFinalDayOfTrip = dayNumber === totalDays;

      // A long transfer eats the day, so do not also fill it with activities.
      const capacity = isArrivalDay
        ? Math.max(driveMinutes >= 180 ? 0 : 1, rule.activitiesPerDay - 1)
        : rule.activitiesPerDay;

      const assigned: string[] = [];
      while (assigned.length < capacity && experienceCursor < ranked.length) {
        const experience = ranked[experienceCursor];
        experienceCursor += 1;
        if (experience) assigned.push(experience.slug);
      }

      const leadExperience = assigned[0] ? ranked.find((e) => e.slug === assigned[0]) : undefined;

      let title: string;
      if (isArrivalDay && driveMinutes > 0) {
        title = `${previousName} to ${destination.name}`;
      } else if (isArrivalDay) {
        title = `${destination.name}`;
      } else if (leadExperience) {
        title = leadExperience.name;
      } else {
        title = `A day in ${destination.name}`;
      }

      let summary: string;
      if (isArrivalDay) {
        summary = arrivalSummary(destination, driveMinutes, previousName);
      } else if (leadExperience) {
        summary = leadExperience.summary;
      } else {
        summary = restDaySummary(destination);
      }

      if (isFinalDayOfTrip) {
        const homeDrive = getTravelMinutes(destination.slug, resolved.startingPoint);
        summary = `${summary} Allow about ${formatDuration(homeDrive)} to get back to ${startName} for your flight.`;
      }

      days.push({
        day: dayNumber,
        title,
        destinationSlug: destination.slug,
        summary,
        experienceSlugs: assigned,
        overnightIn: isFinalDayOfTrip ? null : destination.slug,
        driveMinutes: isArrivalDay ? driveMinutes : 0,
        driveFromSlug: isArrivalDay && driveMinutes > 0 ? previousSlug : null,
        isLongDrive: isArrivalDay && driveMinutes > LONG_DRIVE_MINUTES,
      });

      dayNumber += 1;
    }

    stops.push({
      destinationSlug: destination.slug,
      nights: stop.nights,
      fromDay,
      toDay: dayNumber - 1,
      driveMinutesFromPrevious: driveMinutes,
    });

    previousSlug = destination.slug;
    previousName = destination.name;

    // Nothing to do with stopIndex beyond keeping the ordering explicit for readers.
    void stopIndex;
  });

  /* ---------------------------------------------------------------- warnings */

  for (const day of days) {
    if (day.isLongDrive) {
      const destination = getDestinationBySlug(day.destinationSlug);
      warnings.push(
        `Day ${day.day} is a long transfer — around ${formatDuration(day.driveMinutes)} to ${
          destination?.name ?? day.destinationSlug
        }. Start early, or split it over two days.`,
      );
    }
  }

  for (const stop of stops) {
    const destination = getDestinationBySlug(stop.destinationSlug);
    if (!destination) continue;
    if (seasonQualityFor(destination, resolved.arrivalMonth) === "poor") {
      warnings.push(
        `${destination.name} is out of season when you arrive. ${destination.seasonNote}`,
      );
    }
  }

  const lastStop = stops[stops.length - 1];
  if (lastStop) {
    const homeDrive = getTravelMinutes(lastStop.destinationSlug, resolved.startingPoint);
    if (homeDrive > LONG_DRIVE_MINUTES) {
      warnings.push(
        `Your last stop is about ${formatDuration(homeDrive)} from ${startName}. Give yourself a full day to get back for your flight, or add a night closer to the airport.`,
      );
    }
  }

  if (days.length > 0 && totalDriveMinutes / days.length > 120) {
    warnings.push(
      "This route covers a lot of ground. Choosing a slower pace or dropping one stop would give you more time in each place.",
    );
  }

  if (stops.length === 0) {
    warnings.push("We could not build a route from those choices. Try widening your interests.");
  }

  const regionOrder: Region[] = [];
  for (const stop of stops) {
    const region = getDestinationBySlug(stop.destinationSlug)?.region;
    if (region && !regionOrder.includes(region)) regionOrder.push(region);
  }

  return {
    input: resolved,
    days,
    stops,
    destinationSlugs: stops.map((s) => s.destinationSlug),
    regions: regionOrder,
    totalDriveMinutes,
    warnings,
    engineVersion: ITINERARY_ENGINE_VERSION,
  };
}
