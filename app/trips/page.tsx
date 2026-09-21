import Image from "next/image";
import type { Metadata } from "next";

import { TripCard } from "@/components/cards/trip-card";
import { LinkButton } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { getAllTrips, getDestinationBySlug } from "@/lib/content";
import type { Region, TripTier } from "@/lib/types";

export const metadata: Metadata = {
  title: "Trips",
  description:
    "Ready-made Sri Lanka itineraries grouped by length: short trips of three to five days, classic weeks, and grand tours of the whole island. Every day, inclusion and drive time is listed.",
  alternates: { canonical: "/trips" },
  openGraph: {
    type: "website",
    title: "Trips · Noble Path",
    description:
      "Ready-made Sri Lanka itineraries, grouped by how many days you have.",
    url: "/trips",
    images: [
      {
        url: "/images/experiences/jungle-villa-yala.jpg",
        width: 1600,
        height: 1067,
        alt: "A timber villa deck facing dense jungle at Yala, lit by low evening sun",
      },
    ],
  },
};

const TIERS: ReadonlyArray<{
  readonly tier: TripTier;
  readonly heading: string;
  readonly lead: string;
}> = [
  {
    tier: "short",
    heading: "Short trips",
    lead: "Three to five days. Built for stopovers, business extensions and long weekends — one region, no long transfers.",
  },
  {
    tier: "classic",
    heading: "Classic trips",
    lead: "Seven to ten days. The length most first visits run to: two or three regions, with time to stop moving.",
  },
  {
    tier: "grand",
    heading: "Grand trips",
    lead: "Twelve to sixteen days. The full crossing — cultural triangle, hill country and coast, at a pace that survives it.",
  },
];

/**
 * Trips index (FR-3.1, page-specs §5.1). Packages grouped by duration tier.
 *
 * Regions are resolved here rather than inside `TripCard` so the card stays
 * presentational and the content layer is queried in exactly one place — the
 * same arrangement the home page uses.
 */
export default function TripsPage() {
  const trips = getAllTrips();

  const regionsByTrip: Record<string, readonly Region[]> = {};
  for (const trip of trips) {
    const regions: Region[] = [];
    for (const slug of trip.destinationSlugs) {
      const destination = getDestinationBySlug(slug);
      if (destination && !regions.includes(destination.region)) {
        regions.push(destination.region);
      }
    }
    regionsByTrip[trip.slug] = regions;
  }

  const groups = TIERS.map((group) => ({
    ...group,
    trips: trips.filter((trip) => trip.tier === group.tier),
  })).filter((group) => group.trips.length > 0);

  return (
    <>
      <section
        data-surface="dark"
        className="relative isolate flex h-65 items-end md:h-80"
      >
        <Image
          src="/images/experiences/jungle-villa-yala.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <span aria-hidden className="np-scrim-wash absolute inset-0 -z-10" />
        <span aria-hidden className="np-scrim-vertical absolute inset-0 -z-10" />
        <span aria-hidden className="np-scrim-top absolute inset-x-0 top-0 -z-10 h-40" />

        <Container className="pb-8">
          <p className="np-on-image-secondary text-overline uppercase">Ready to go</p>
          <h1 className="np-on-image mt-2 font-display text-h1">Trips</h1>
          <p className="np-on-image-secondary np-measure-lead mt-3 text-lead">
            {trips.length} planned itineraries, each one written as days rather than
            highlights. Take one as it is, or use it as the starting point for your own.
          </p>
        </Container>
      </section>

      <Section tight className="bg-sand-50">
        <Container>
          <div className="flex flex-col gap-[var(--section-y)]">
            {groups.map((group) => (
              <div key={group.tier}>
                <h2 className="font-display text-h2 text-ink-900">
                  {group.heading}
                  <span className="np-sr-only"> — {group.trips.length} trips</span>
                </h2>
                <p className="np-measure-lead mt-3 text-lead text-ink-600">{group.lead}</p>

                <ul className="mt-8 grid gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-3">
                  {group.trips.map((trip) => (
                    <li key={trip.slug} className="flex">
                      <TripCard
                        trip={trip}
                        regions={regionsByTrip[trip.slug] ?? []}
                        headingLevel="h3"
                        className="w-full"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* The bridge from Trips to Plan. page-specs §5.1 S4 requires this band to be
          present on every render of this page, including when no trips match. */}
      <Section tight className="bg-jungle-900">
        <Container>
          <div data-surface="dark" className="np-measure-lead">
            <h2 className="font-display text-h2 text-white">Nothing quite right?</h2>
            <p className="mt-4 text-lead text-white/85">
              Tell us how many days you have, when you arrive and what you like. The planner
              will route the island around your answers, and you can change every day of it
              afterwards.
            </p>
            <div className="mt-8">
              <LinkButton href="/plan" variant="primary" size="lg">
                Build your own plan
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
