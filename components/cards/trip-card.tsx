import Image from "next/image";
import Link from "next/link";
import { BedDouble, Car, CalendarRange, UserRound } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatMonthRange, formatPriceBand, regionName } from "@/lib/format";
import type { Region, TripPackage } from "@/lib/types";

/**
 * Trip / package card (components.md §6). The most information-dense card — it sells.
 *
 * DEVIATION IMPL-02: the spec's price block is a concrete "From $1,450 /person".
 * The domain model carries an indicative band (requirements §7.4), so the card
 * shows the band label plus an explicit "indicative, per person" qualifier. A
 * fabricated figure here would be a price Noble Path cannot honour, which is
 * worse than a band.
 *
 * Both actions carry the trip name in their accessible name, so a grid of cards
 * does not read as six identical "Book" links.
 */
export function TripCard({
  trip,
  regions,
  headingLevel = "h3",
  compact = false,
  className,
}: {
  readonly trip: TripPackage;
  /** Regions the trip crosses, in route order, deduplicated by the caller. */
  readonly regions: readonly Region[];
  readonly headingLevel?: "h2" | "h3" | "h4";
  /**
   * Shorter card for the home carousel (D-33): a 2:1 photo and no
   * Stays/Transport/Guide row, which is the same on every trip. The full card
   * stays on /trips.
   */
  readonly compact?: boolean;
  readonly className?: string;
}) {
  const Heading = headingLevel;
  const visibleRegions = regions.slice(0, 3);
  const overflow = regions.length - visibleRegions.length;

  return (
    <article
      className={cn(
        "np-reveal group relative flex flex-col overflow-clip rounded-xl border border-border",
        "bg-surface shadow-sm transition-[transform,box-shadow] duration-[var(--dur-3)]",
        "ease-[var(--ease-standard)] hover:-translate-y-1 hover:shadow-md active:-translate-y-px",
        className,
      )}
    >
      <div className={cn("relative overflow-clip bg-sand-100", compact ? "aspect-[2/1]" : "aspect-video")}>
        <Image
          src={trip.image.src}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="np-parallax-img object-cover transition-transform duration-[var(--dur-3)] ease-[var(--ease-standard)] group-hover:scale-105"
        />
        <span
          className="np-glass np-glass-text absolute bottom-3 left-3 rounded-pill px-3.5 py-1.5 text-small font-semibold text-white"
          data-surface="dark"
        >
          {trip.durationDays} days
        </span>
      </div>

      <div className="flex flex-1 flex-col p-[var(--card-pad)]">
        <Heading className="font-display text-h4 text-ink-900 transition-colors duration-[var(--dur-3)] group-hover:text-jungle-700">
          <Link href={`/trips/${trip.slug}`} className="rounded-sm">
            {trip.name}
          </Link>
        </Heading>

        <p className="mt-2 line-clamp-2 text-body-sm text-ink-600">{trip.summary}</p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {visibleRegions.map((region) => (
            <li
              key={region}
              className="inline-flex h-6 items-center rounded-pill bg-sand-100 px-2.5 text-small text-ink-600"
            >
              {regionName(region)}
            </li>
          ))}
          {overflow > 0 ? (
            <li className="inline-flex h-6 items-center rounded-pill bg-sand-100 px-2.5 text-small text-ink-600">
              +{overflow}
            </li>
          ) : null}
        </ul>

        {compact ? null : (
          <ul className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: BedDouble, label: "Stays" },
              { icon: Car, label: "Transport" },
              { icon: UserRound, label: "Guide" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-1.5">
                <Icon size={20} aria-hidden className="text-jungle-600" />
                <span className="text-small text-ink-600">{label}</span>
              </li>
            ))}
          </ul>
        )}

        <p className={cn("flex items-center gap-1.5 text-small text-text-meta", compact ? "mt-3" : "mt-4")}>
          <CalendarRange size={16} aria-hidden />
          Best {formatMonthRange(trip.bestMonths)}
        </p>

        <div className={cn("border-t border-border", compact ? "mt-3 pt-3" : "mt-4 pt-4")}>
          <p className={cn(compact ? "text-h4" : "text-h3", "text-ink-900")}>
            <span className="np-sr-only">
              Indicative price band: {formatPriceBand(trip.priceBandPerPerson)} per person.
            </span>
            <span aria-hidden className="font-display">
              {formatPriceBand(trip.priceBandPerPerson)}
            </span>
          </p>
          <p aria-hidden className="mt-1 text-small text-text-meta">
            Indicative band · per person
          </p>
        </div>

        <div className={cn("flex flex-col gap-3 md:flex-row", compact ? "mt-3" : "mt-4")}>
          <LinkButton
            href={`/bookings?type=package&item=${trip.slug}`}
            variant="solid"
            size="md"
            aria-label={`Book ${trip.name}`}
            className="relative z-[1] w-full md:flex-1"
          >
            Book
          </LinkButton>
          <LinkButton
            href={`/trips/${trip.slug}`}
            variant="outline"
            size="md"
            aria-label={`View ${trip.name}`}
            className="relative z-[1] w-full md:flex-1"
          >
            View trip
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
