import type { Metadata } from "next";

import { ClosingCta } from "@/components/home/closing-cta";
import { DestinationsPreview } from "@/components/home/destinations-preview";
import { ExperiencesBand } from "@/components/home/experiences-band";
import { Hero } from "@/components/home/hero";
import { PlanCategories } from "@/components/home/plan-categories";
import { PlanTeaser } from "@/components/home/plan-teaser";
import { QuoteBand } from "@/components/home/quote-band";
import { TripsPreview } from "@/components/home/trips-preview";
import { WhyNoblePath } from "@/components/home/why-noble-path";
import {
  getAllExperiences,
  getAllTrips,
  getDestinationBySlug,
  getFeaturedDestinations,
} from "@/lib/content";
import type { Region } from "@/lib/types";

export const metadata: Metadata = {
  title: "Noble Path — Explore Sri Lanka with us",
  description:
    "Discover breathtaking destinations, unique experiences and unforgettable memories across Sri Lanka. Build an itinerary that fits the days you actually have.",
  alternates: { canonical: "/" },
};

/**
 * Home (page-specs §1). Eight sections, from the hero down to the closing CTA.
 *
 * A server component with no client JavaScript of its own — the header is the
 * only interactive part of this page. That is what keeps the LCP budget on the
 * page that has to meet it (NFR-1).
 */
export default function HomePage() {
  const featured = getFeaturedDestinations();
  const experiences = getAllExperiences().slice(0, 6);
  const trips = getAllTrips().slice(0, 3);

  // Resolve the lookups the presentational components need, once, here — the
  // cards stay dumb and the content layer is queried in one place.
  const destinationNames: Record<string, string> = {};
  for (const experience of experiences) {
    const destination = getDestinationBySlug(experience.destinationSlug);
    if (destination) destinationNames[experience.destinationSlug] = destination.name;
  }

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

  return (
    <>
      <Hero featured={featured} />
      <PlanCategories />
      <WhyNoblePath />
      <DestinationsPreview destinations={featured} />
      <ExperiencesBand experiences={experiences} destinationNames={destinationNames} />
      <PlanTeaser />
      <TripsPreview trips={trips} regionsByTrip={regionsByTrip} />
      <QuoteBand />
      <ClosingCta />
    </>
  );
}
