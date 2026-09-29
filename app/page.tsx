import type { Metadata } from "next";

import { ClosingCta } from "@/components/home/closing-cta";
import { DestinationsPreview } from "@/components/home/destinations-preview";
import { ExperiencesBand } from "@/components/home/experiences-band";
import { Hero } from "@/components/home/hero";
import { JourneyChapters, type JourneyChapter } from "@/components/home/journey-chapters";
import { PlanCategories } from "@/components/home/plan-categories";
import { PlanTeaser } from "@/components/home/plan-teaser";
import { QuoteBand } from "@/components/home/quote-band";
import { TripsPreview } from "@/components/home/trips-preview";
import { WhyNoblePath } from "@/components/home/why-noble-path";
import {
  getAllExperiences,
  getAllTrips,
  getDestinationBySlug,
  getExperienceBySlug,
  getFeaturedDestinations,
  getRegionBySlug,
} from "@/lib/content";
import type { Region } from "@/lib/types";

export const metadata: Metadata = {
  title: "Noble Path · Explore Sri Lanka with us",
  description:
    "Discover breathtaking destinations, unique experiences and unforgettable memories across Sri Lanka. Build an itinerary that fits the days you actually have.",
  alternates: { canonical: "/" },
};

/**
 * The journey chapter's route (D-31): region, and the photograph that carries
 * it, in the order a first trip usually runs. Photographs are looked up from
 * content so their alt text and credits stay defined in one place.
 */
const JOURNEY: readonly { region: Region; photo: { destination?: string; experience?: string } }[] = [
  { region: "cultural-triangle", photo: { experience: "pidurangala-sunrise" } },
  { region: "hill-country", photo: { destination: "ella" } },
  { region: "south-coast", photo: { experience: "stilt-fishing-koggala" } },
  { region: "wilderness", photo: { destination: "yala" } },
  { region: "east-coast", photo: { destination: "trincomalee" } },
];

/** The first two sentences of a region description: enough for a chapter card. */
function lede(text: string): string {
  return (text.match(/[^.!?]+[.!?]+/g) ?? [text]).slice(0, 2).join("").trim();
}

function journeyChapters(): JourneyChapter[] {
  const chapters: JourneyChapter[] = [];
  for (const { region, photo } of JOURNEY) {
    const info = getRegionBySlug(region);
    const image = photo.destination
      ? getDestinationBySlug(photo.destination)?.image
      : photo.experience
        ? getExperienceBySlug(photo.experience)?.image
        : undefined;
    if (!info || !image) continue;
    chapters.push({
      slug: region,
      name: info.name,
      character: info.character,
      body: lede(info.description),
      image: { src: image.src, alt: image.alt },
      href: `/destinations?region=${region}`,
    });
  }
  return chapters;
}

/**
 * Home (page-specs §1). Eight sections, from the hero down to the closing CTA.
 *
 * A server component. Its only client JavaScript besides the header is the
 * journey chapter's photo switcher (D-31), which sits below the fold, so the
 * LCP budget on this page (NFR-1) is unaffected.
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
      <JourneyChapters chapters={journeyChapters()} />
      <DestinationsPreview destinations={featured} />
      <ExperiencesBand experiences={experiences} destinationNames={destinationNames} />
      <PlanTeaser />
      <TripsPreview trips={trips} regionsByTrip={regionsByTrip} />
      <QuoteBand />
      <ClosingCta />
    </>
  );
}
