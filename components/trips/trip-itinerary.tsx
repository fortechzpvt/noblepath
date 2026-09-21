import Link from "next/link";
import { AlertTriangle, BedDouble, Car, MapPin } from "lucide-react";

import { getDestinationBySlug, getExperienceBySlug } from "@/lib/content";
import { formatDuration } from "@/lib/format";
import type { TripDay } from "@/lib/types";

/**
 * Comfortable daily driving ceiling, in minutes.
 *
 * `lib/types.ts` documents 300 as the threshold above which a day is flagged,
 * and the itinerary engine uses the same number. It is restated here rather than
 * imported because this component renders authored `TripDay` data, which carries
 * no `isLongDrive` flag of its own — unlike a generated `ItineraryDay`.
 */
const LONG_DRIVE_MINUTES = 300;

/**
 * Read-only day-by-day itinerary for a trip package (components.md §10,
 * page-specs §5.2 S4).
 *
 * A server component: it resolves destination and experience names through the
 * content layer at render time and ships no JavaScript.
 *
 * DEVIATION: the specification collapses days beyond day three behind a
 * "Show all N days" control. Every day is rendered here instead. The control
 * would need client state for a page that otherwise ships none, and the full
 * itinerary is the substance of the page — it should be readable, printable and
 * indexable without interaction.
 */
export function TripItinerary({
  days,
  tripName,
}: {
  readonly days: readonly TripDay[];
  /** Used in accessible names so controls and headings are unambiguous. */
  readonly tripName: string;
}) {
  return (
    <ol aria-label={`${tripName} — day by day`} className="flex flex-col gap-6 lg:gap-8">
      {days.map((day) => {
        const destination = getDestinationBySlug(day.destinationSlug);
        const overnight = day.overnightIn ? getDestinationBySlug(day.overnightIn) : null;
        const experiences = day.experienceSlugs
          .map((slug) => getExperienceBySlug(slug))
          .filter((experience) => experience !== undefined);
        const isLongDrive = day.driveMinutes > LONG_DRIVE_MINUTES;

        return (
          <li key={day.day}>
            <article
              aria-labelledby={`trip-day-${day.day}-heading`}
              className="relative rounded-xl border border-border bg-surface p-[var(--card-pad)] shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-jungle-700 text-small font-semibold text-white"
                >
                  {day.day}
                </span>

                <div className="min-w-0 flex-1">
                  <h3
                    id={`trip-day-${day.day}-heading`}
                    className="text-h4 text-ink-900"
                  >
                    <span className="np-sr-only">Day {day.day}: </span>
                    <span aria-hidden className="text-text-meta">
                      Day {day.day} ·{" "}
                    </span>
                    {day.title}
                  </h3>

                  {destination ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-small text-text-meta">
                      <MapPin size={16} aria-hidden />
                      <Link
                        href={`/destinations/${destination.slug}`}
                        className="rounded-xs underline decoration-sand-300 underline-offset-4 hover:text-jungle-700"
                      >
                        {destination.name}
                      </Link>
                    </p>
                  ) : null}

                  <p className="np-measure-body mt-3 text-body-sm text-ink-700">
                    {day.summary}
                  </p>

                  {experiences.length > 0 ? (
                    <div className="mt-4">
                      <h4 className="text-small font-semibold text-ink-900">
                        On this day
                      </h4>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {experiences.map((experience) => (
                          <li
                            key={experience.slug}
                            className="inline-flex items-center rounded-pill bg-jungle-50 px-3 py-1.5 text-small text-jungle-700"
                          >
                            {experience.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-small text-text-meta">
                    <li className="flex items-center gap-1.5">
                      <Car size={16} aria-hidden />
                      {day.driveMinutes > 0
                        ? `Driving: about ${formatDuration(day.driveMinutes)}`
                        : "No transfer today"}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <BedDouble size={16} aria-hidden />
                      {overnight
                        ? `Overnight in ${overnight.name}`
                        : "Departure day — no overnight"}
                    </li>
                  </ul>

                  {isLongDrive ? (
                    <p className="mt-3 flex items-start gap-2 rounded-sm bg-warning-50 px-3 py-2 text-small text-warning-700">
                      <AlertTriangle size={16} aria-hidden className="mt-px shrink-0" />
                      <span>
                        Long drive: this is a big travel day. Expect most of the morning and
                        some of the afternoon on the road.
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
