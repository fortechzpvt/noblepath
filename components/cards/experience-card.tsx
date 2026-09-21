import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Clock, MapPin } from "lucide-react";

import { IntensityMeter } from "@/components/ui/intensity-meter";
import { cn } from "@/lib/cn";
import {
  formatHours,
  formatIntensity,
  formatMonthRange,
  formatPriceBand,
  interestName,
} from "@/lib/format";
import type { Experience, Month } from "@/lib/types";

/**
 * Experience card (components.md §5).
 *
 * DEVIATION IMPL-02: the spec's price treatment is `From $45`. The domain model
 * carries an indicative band, not a quote (requirements §7.4), so the card shows
 * the band's traveller-facing label instead. Rendering an invented number would
 * be a price we cannot honour.
 *
 * The category tag sits in the body, not over the media — a tag over photography
 * fails contrast unpredictably.
 */
export function ExperienceCard({
  experience,
  destinationName,
  currentMonth,
  headingLevel = "h3",
  className,
}: {
  readonly experience: Experience;
  readonly destinationName?: string;
  /** When supplied, the card warns if the experience is out of season that month. */
  readonly currentMonth?: Month;
  readonly headingLevel?: "h2" | "h3" | "h4";
  readonly className?: string;
}) {
  const Heading = headingLevel;
  const outOfSeason =
    currentMonth !== undefined && experience.avoidMonths.includes(currentMonth);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border",
        "bg-surface shadow-sm transition-[transform,box-shadow] duration-[var(--dur-3)]",
        "ease-[var(--ease-standard)] hover:-translate-y-1 hover:shadow-md active:-translate-y-px",
        className,
      )}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-sand-100">
        <Image
          src={experience.image.src}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1440px) 340px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-[var(--dur-3)] ease-[var(--ease-standard)] group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-[var(--card-pad)]">
        <span className="inline-flex h-6 w-fit items-center rounded-xs bg-jungle-50 px-2.5 text-small font-semibold text-jungle-700">
          {interestName(experience.category)}
        </span>

        <Heading className="mt-2.5 font-display text-h4 text-ink-900 transition-colors duration-[var(--dur-3)] group-hover:text-jungle-700">
          <Link
            href={`/experiences#${experience.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {experience.name}
          </Link>
        </Heading>

        <p className="mt-2 line-clamp-2 text-body-sm text-ink-600">{experience.summary}</p>

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small text-text-meta">
          <li className="flex items-center gap-1.5">
            <Clock size={16} aria-hidden />
            {formatHours(experience.durationHours)}
          </li>
          <li className="flex items-center gap-2">
            <span>{formatIntensity(experience.intensity)}</span>
            <IntensityMeter intensity={experience.intensity} />
          </li>
          {destinationName ? (
            <li className="flex items-center gap-1.5">
              <MapPin size={16} aria-hidden />
              {destinationName}
            </li>
          ) : null}
        </ul>

        {outOfSeason ? (
          <p className="mt-3 flex items-start gap-2 rounded-sm bg-warning-50 px-3 py-2 text-small text-warning-700">
            <AlertCircle size={16} aria-hidden className="mt-px shrink-0" />
            Best {formatMonthRange(experience.bestMonths)}
          </p>
        ) : null}

        <p className="mt-auto pt-4 text-h5 text-ink-900">
          {formatPriceBand(experience.priceBand)}
          <span className="ml-1.5 text-small font-normal text-text-meta">
            indicative
          </span>
        </p>
      </div>
    </article>
  );
}
