import Image from "next/image";
import Link from "next/link";
import { CalendarRange, MapPin, Moon } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatMonthRange, regionName } from "@/lib/format";
import type { Destination } from "@/lib/types";

/**
 * Destination card (components.md §4).
 *
 * The whole card is not wrapped in an `<a>`. The title link carries a
 * pseudo-element overlay (`after:absolute after:inset-0`) so the entire card is
 * clickable while exactly one link appears in the assistive-technology tab
 * order — which is what keeps a 24-card grid from reading as 48 links.
 *
 * `headingLevel` exists because the same card appears under an `<h2>` on the
 * index and under an `<h3>` in a "nearby" section; hard-coding the level would
 * break the heading outline in one of them.
 */
export function DestinationCard({
  destination,
  headingLevel = "h3",
  className,
}: {
  readonly destination: Destination;
  readonly headingLevel?: "h2" | "h3" | "h4";
  readonly className?: string;
}) {
  const Heading = headingLevel;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border",
        "bg-surface shadow-sm transition-[transform,box-shadow] duration-[var(--dur-3)]",
        "ease-[var(--ease-standard)] hover:-translate-y-1 hover:shadow-md active:-translate-y-px",
        "focus-within:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
        <Image
          src={destination.image.src}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1440px) 420px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-[var(--dur-3)] ease-[var(--ease-standard)] group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-[var(--card-pad)]">
        <p className="text-overline uppercase text-jungle-600">
          {regionName(destination.region)}
        </p>

        <Heading className="mt-2 font-display text-h4 text-ink-900 transition-colors duration-[var(--dur-3)] group-hover:text-jungle-700">
          <Link
            href={`/destinations/${destination.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {destination.name}
          </Link>
        </Heading>

        <p className="mt-2 line-clamp-2 text-body-sm text-ink-600">
          {destination.tagline}
        </p>

        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small text-text-meta">
          <li className="flex items-center gap-1.5">
            <CalendarRange size={16} aria-hidden />
            Best {formatMonthRange(destination.bestMonths)}
          </li>
          <li className="flex items-center gap-1.5">
            <Moon size={16} aria-hidden />
            {destination.suggestedNights}{" "}
            {destination.suggestedNights === 1 ? "night" : "nights"}
          </li>
        </ul>
      </div>
    </article>
  );
}

/**
 * Overlay variant — all text sits on the photograph over `--scrim-card`.
 * Used where the card sits on a dark, photographic section rather than a light
 * surface (components.md §4.1).
 */
export function DestinationCardOverlay({
  destination,
  headingLevel = "h3",
  className,
}: {
  readonly destination: Destination;
  readonly headingLevel?: "h2" | "h3" | "h4";
  readonly className?: string;
}) {
  const Heading = headingLevel;

  return (
    <article
      data-surface="dark"
      className={cn(
        "group relative isolate aspect-[4/5] overflow-hidden rounded-xl shadow-media",
        className,
      )}
    >
      <Image
        src={destination.image.src}
        alt=""
        aria-hidden
        fill
        sizes="(min-width: 1024px) 320px, 70vw"
        className="object-cover transition-transform duration-[var(--dur-5)] ease-[var(--ease-out)] group-hover:scale-105"
      />
      <span className="absolute inset-0 np-scrim-card" aria-hidden />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="np-on-image-secondary text-overline uppercase">
          {regionName(destination.region)}
        </p>
        <Heading className="np-on-image mt-1.5 font-display text-h4">
          <Link
            href={`/destinations/${destination.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {destination.name}
          </Link>
        </Heading>
        <p className="np-on-image-secondary mt-1.5 line-clamp-2 text-body-sm">
          {destination.tagline}
        </p>
        <p className="np-on-image-secondary mt-3 flex items-center gap-1.5 text-small">
          <MapPin size={16} aria-hidden />
          {destination.suggestedNights}{" "}
          {destination.suggestedNights === 1 ? "night" : "nights"} · Best{" "}
          {formatMonthRange(destination.bestMonths)}
        </p>
      </div>
    </article>
  );
}
