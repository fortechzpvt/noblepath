import type { Metadata } from "next";
import Link from "next/link";
import { MapPinOff } from "lucide-react";

import { DestinationCard } from "@/components/cards/destination-card";
import type { FilterOption } from "@/components/filters/destination-filters";
import { DestinationFilters } from "@/components/filters/destination-filters";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Container, SectionHeading } from "@/components/ui/section";
import { getAllDestinations, getAllRegions } from "@/lib/content";
import { interestName } from "@/lib/format";
import type { Destination, Interest } from "@/lib/types";

const HEADER_IMAGE = "/images/hero/sigiriya-sunrise-2.jpg";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Every place Noble Path covers in Sri Lanka, from the Cultural Triangle to the east coast. Filter by region and by what you are travelling for.",
  alternates: { canonical: "/destinations" },
  openGraph: {
    type: "website",
    title: "Destinations — Noble Path",
    description:
      "Every place Noble Path covers in Sri Lanka. Filter by region and by what you are travelling for.",
    url: "/destinations",
    images: [
      {
        url: HEADER_IMAGE,
        alt: "Sigiriya rock fortress rising from jungle at sunrise, birds circling overhead",
      },
    ],
  },
};

/**
 * Reads one filter dimension out of the query string.
 *
 * Search params are untrusted input: anything that is not a known facet value
 * is dropped rather than passed into a filter predicate, so a hand-edited URL
 * can only ever narrow the results to nothing — never change how the page
 * behaves.
 */
function readFilter(
  raw: string | readonly string[] | undefined,
  allowed: ReadonlySet<string>,
): readonly string[] {
  const values = raw === undefined ? [] : typeof raw === "string" ? [raw] : raw;
  return [...new Set(values)].filter((value) => allowed.has(value));
}

/**
 * Destinations index (page-specs.md §2, FR-1.1 – FR-1.3).
 *
 * A server component. Filter state lives in the URL (`?region=…&interest=…`),
 * which keeps the grid free of JavaScript, makes a filtered view shareable and
 * keeps the Back button honest. Only the chip row is a client component.
 */
export default async function DestinationsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const destinations = getAllDestinations();

  // Facets are derived from the content rather than hand-listed, so a region or
  // interest can never appear as a chip that yields nothing at all.
  const regionsWithContent = getAllRegions().filter((region) =>
    destinations.some((destination) => destination.region === region.slug),
  );

  const interestTotals = new Map<Interest, number>();
  for (const destination of destinations) {
    for (const interest of destination.interests) {
      interestTotals.set(interest, (interestTotals.get(interest) ?? 0) + 1);
    }
  }
  // Most-used interest first. Stable across filter changes because the ordering
  // uses unfiltered totals — a chip row that reorders as you use it is unusable.
  const interests = [...interestTotals.entries()]
    .sort(
      ([aInterest, aTotal], [bInterest, bTotal]) =>
        bTotal - aTotal || interestName(aInterest).localeCompare(interestName(bInterest)),
    )
    .map(([interest]) => interest);

  const selectedRegions = readFilter(
    params.region,
    new Set(regionsWithContent.map((region) => region.slug)),
  );
  const selectedInterests = readFilter(params.interest, new Set<string>(interests));

  // Within a dimension the filters are OR; across dimensions they are AND —
  // "hill country or south coast, and something to do with food".
  const matchesRegion = (destination: Destination): boolean =>
    selectedRegions.length === 0 || selectedRegions.includes(destination.region);
  const matchesInterest = (destination: Destination): boolean =>
    selectedInterests.length === 0 ||
    destination.interests.some((interest) => selectedInterests.includes(interest));

  const results = destinations.filter(
    (destination) => matchesRegion(destination) && matchesInterest(destination),
  );

  // Each chip is counted against the *other* dimension's current selection, so
  // its number is what the visitor would actually get by pressing it.
  const regionOptions: readonly FilterOption[] = regionsWithContent.map((region) => ({
    value: region.slug,
    label: region.name,
    count: destinations.filter(
      (destination) => destination.region === region.slug && matchesInterest(destination),
    ).length,
  }));

  const interestOptions: readonly FilterOption[] = interests.map((interest) => ({
    value: interest,
    label: interestName(interest),
    count: destinations.filter(
      (destination) =>
        destination.interests.includes(interest) && matchesRegion(destination),
    ).length,
  }));

  return (
    <>
      <PageHeader
        imageSrc={HEADER_IMAGE}
        title="Destinations"
        lead="Every place we cover, with the season, the stay length and the journey times you need to put them in a sensible order."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Destinations" }]}
      >
        {/* The live region is present on first render and only its text changes,
            which is what makes the update announceable (accessibility.md §8.1). */}
        <p aria-live="polite" className="np-on-image-secondary text-body-sm">
          <span className="tabular-nums">{results.length}</span>{" "}
          {results.length === 1 ? "destination" : "destinations"}
        </p>
      </PageHeader>

      <DestinationFilters
        regionOptions={regionOptions}
        interestOptions={interestOptions}
        selectedRegions={selectedRegions}
        selectedInterests={selectedInterests}
      />

      <section aria-labelledby="results-heading" className="np-section-tight">
        <Container wide>
          <h2 id="results-heading" className="np-sr-only">
            Matching destinations
          </h2>

          {results.length === 0 ? (
            <EmptyState
              icon={MapPinOff}
              title="No destinations match those filters"
              body="Try removing a filter, or explore everything we cover."
              actions={
                <>
                  <LinkButton href="/destinations" variant="solid">
                    Clear all filters
                  </LinkButton>
                  <LinkButton href="/experiences" variant="outline">
                    Browse experiences
                  </LinkButton>
                </>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {results.map((destination) => (
                <li key={destination.slug} className="flex">
                  <DestinationCard
                    destination={destination}
                    headingLevel="h3"
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <section aria-labelledby="regions-heading" className="np-section bg-surface">
        <Container wide>
          <SectionHeading
            overline="Where to go"
            title={<span id="regions-heading">Explore by region</span>}
            lead="Sri Lanka is small but it is not uniform. The monsoons run in opposite directions, so the right coast in July is the wrong coast in January."
          />
          <ul className="mt-10 grid grid-cols-1 gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-4">
            {regionsWithContent.map((region) => {
              const count = destinations.filter(
                (destination) => destination.region === region.slug,
              ).length;
              return (
                <li key={region.slug} className="flex">
                  <Link
                    href={`/destinations?region=${region.slug}`}
                    className="flex w-full flex-col rounded-xl border border-border bg-sand-50 p-5 shadow-sm transition-[transform,box-shadow,border-color] duration-[var(--dur-3)] ease-[var(--ease-standard)] hover:-translate-y-1 hover:border-sand-300 hover:shadow-md"
                  >
                    <h3 className="font-display text-h4 text-ink-900">{region.name}</h3>
                    <p className="mt-2 text-body-sm text-ink-600">{region.character}</p>
                    <p className="mt-4 text-small text-text-meta">
                      <span className="tabular-nums">{count}</span>{" "}
                      {count === 1 ? "destination" : "destinations"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>
    </>
  );
}
