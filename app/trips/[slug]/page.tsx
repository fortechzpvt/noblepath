import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange, Car, Check, Map, Wallet, X } from "lucide-react";

import { DestinationCard } from "@/components/cards/destination-card";
import { TransferPicker } from "@/components/transfers/transfer-picker";
import { TripItinerary } from "@/components/trips/trip-itinerary";
import { LinkButton } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { getAllTrips, getDestinationBySlug, getTripBySlug } from "@/lib/content";
import { formatDuration, formatMonthRange, formatPriceBand, formatUsd, regionName } from "@/lib/format";
import { ORGANIZATION_ID, absoluteUrl, breadcrumbJsonLd, clip, jsonLdScript, pageMetadata } from "@/lib/seo";
import type { Region, TripPackage, TripTier } from "@/lib/types";

const TIER_LABEL: Readonly<Record<TripTier, string>> = {
  short: "Short trip",
  classic: "Classic trip",
  grand: "Grand tour",
};

/**
 * Every trip is known at build time (content is pulled from the database on
 * each build and Publish triggers a rebuild), so an unknown slug is refused
 * outright and served the prerendered 404 page. Before D-39 it was rendered on
 * demand and the 404 arrived with an empty HTML body, readable only with
 * JavaScript (live crawl finding).
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllTrips().map((trip) => ({ slug: trip.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trip = getTripBySlug(slug);

  if (!trip) {
    return {
      title: "Trip not found",
      robots: { index: false, follow: true },
    };
  }

  const stops = trip.destinationSlugs
    .map((destinationSlug) => getDestinationBySlug(destinationSlug)?.name)
    .filter((name): name is string => Boolean(name));
  const price = trip.priceFromUsd ? ` From ${formatUsd(trip.priceFromUsd)} per person.` : "";

  return pageMetadata({
    title: `${trip.name}: ${trip.durationDays}-Day Sri Lanka Itinerary`,
    description: clip(`${trip.durationDays} days in Sri Lanka: ${stops.join(", ")}.${price} ${trip.summary}`),
    path: `/trips/${trip.slug}`,
    type: "article",
    image: trip.image,
  });
}

/**
 * Structured data for a package (D-38): a `TouristTrip` whose provider is the
 * site-wide TravelAgency node, plus a breadcrumb.
 *
 * An `offers` node is emitted only when the admin has set a real
 * `priceFromUsd` (D-36), the same "From $X per person" the page shows.
 * Trips with only an indicative band publish no price, so search results never
 * show a number the page itself does not state (requirements §7.4).
 */
function tripJsonLd(trip: TripPackage, destinationNames: readonly string[]) {
  const url = absoluteUrl(`/trips/${trip.slug}`);
  return {
    "@graph": [
      {
        "@type": "TouristTrip",
        name: trip.name,
        description: trip.summary,
        url,
        image: absoluteUrl(trip.image.src),
        touristType: trip.interests,
        itinerary: {
          "@type": "ItemList",
          numberOfItems: destinationNames.length,
          itemListElement: destinationNames.map((name, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: { "@type": "TouristDestination", name },
          })),
        },
        provider: { "@id": ORGANIZATION_ID },
        ...(trip.priceFromUsd
          ? {
              offers: {
                "@type": "Offer",
                price: trip.priceFromUsd,
                priceCurrency: "USD",
                url,
                availability: "https://schema.org/InStock",
                offeredBy: { "@id": ORGANIZATION_ID },
              },
            }
          : {}),
      },
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Sri Lanka itineraries", path: "/trips" },
        { name: trip.name, path: `/trips/${trip.slug}` },
      ]),
    ],
  };
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = getTripBySlug(slug);

  if (!trip) notFound();

  const destinations = trip.destinationSlugs
    .map((destinationSlug) => getDestinationBySlug(destinationSlug))
    .filter((destination) => destination !== undefined);

  const regions: Region[] = [];
  for (const destination of destinations) {
    if (!regions.includes(destination.region)) regions.push(destination.region);
  }

  const totalDriveMinutes = trip.days.reduce((total, day) => total + day.driveMinutes, 0);

  const facts: ReadonlyArray<{
    readonly icon: typeof Map;
    readonly label: string;
    readonly value: string;
  }> = [
    {
      icon: CalendarRange,
      label: "Length",
      value: `${trip.durationDays} days · ${TIER_LABEL[trip.tier]}`,
    },
    {
      icon: Map,
      label: "Regions",
      value: regions.map((region) => regionName(region)).join(" · ") || "Not set",
    },
    {
      icon: CalendarRange,
      label: "Best months",
      value: formatMonthRange(trip.bestMonths),
    },
    {
      icon: Car,
      label: "Total driving",
      value: `About ${formatDuration(totalDriveMinutes)}`,
    },
    {
      icon: Wallet,
      label: "Indicative band",
      value: trip.priceFromUsd
        ? `From ${formatUsd(trip.priceFromUsd)} per person`
        : `${formatPriceBand(trip.priceBandPerPerson)} per person`,
    },
  ];

  const bookingHref = `/bookings?type=package&item=${encodeURIComponent(trip.slug)}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          tripJsonLd(
            trip,
            destinations.map((destination) => destination.name),
          ),
        )}
      />

      <section
        data-surface="dark"
        className="relative isolate flex min-h-[min(72svh,640px)] items-end"
      >
        <Image
          src={trip.image.src}
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

        <Container className="pt-32 pb-[var(--section-y-tight)]">
          <p className="np-on-image-secondary text-overline uppercase">
            {TIER_LABEL[trip.tier]} · {trip.durationDays} days
          </p>
          <h1 className="np-on-image np-measure-hero mt-3 font-display text-h1">
            {trip.name}
          </h1>
          <p className="np-on-image-secondary np-measure-lead mt-4 text-lead">
            {trip.tagline}
          </p>
          <div className="mt-8">
            <LinkButton
              href={bookingHref}
              variant="primary"
              size="lg"
              className="w-full md:w-auto"
            >
              Enquire about this trip
            </LinkButton>
          </div>
        </Container>
      </section>

      <Section tight className="bg-surface">
        <Container>
          <h2 className="np-sr-only">At a glance</h2>
          <dl className="grid grid-cols-2 gap-x-[var(--grid-gap)] gap-y-6 lg:grid-cols-5">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <dt className="flex items-center gap-1.5 text-small text-text-meta">
                  <Icon size={16} aria-hidden />
                  {label}
                </dt>
                <dd className="mt-1.5 text-h5 text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="np-measure-body mt-8 text-lead text-ink-700">{trip.summary}</p>
          <p className="mt-4 text-small text-text-meta">
            The band above is indicative, per person, and depends on party size, season and
            the standard of accommodation you choose. It is not a quote. We confirm a price
            by email after your enquiry.
          </p>
        </Container>
      </Section>

      <Section className="bg-sand-50">
        <Container>
          <h2 className="font-display text-h2 text-ink-900">Day by day</h2>
          <p className="np-measure-lead mt-3 text-lead text-ink-600">
            Driving times are door-to-door estimates for typical road conditions, not routing
            output. Days over five hours on the road are flagged.
          </p>
          <div className="mt-10 max-w-[var(--container-prose)]">
            <TripItinerary days={trip.days} tripName={trip.name} />
          </div>
        </Container>
      </Section>

      <Section className="bg-surface">
        <Container>
          <h2 className="font-display text-h2 text-ink-900">Transfers &amp; vehicle</h2>
          <p className="np-measure-lead mt-3 text-lead text-ink-600">
            Tell us if you want to be met at the airport or dropped back, and which vehicle
            suits your group.
          </p>
          <TransferPicker className="mt-8 max-w-[var(--container-prose)]" />
        </Container>
      </Section>

      <Section className="bg-surface">
        <Container>
          <h2 className="font-display text-h2 text-ink-900">What&rsquo;s included</h2>
          <div className="mt-8 grid gap-[var(--section-y-tight)] md:grid-cols-2 md:gap-[var(--grid-gap)]">
            <div>
              <h3 className="text-h4 text-ink-900">Included</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {trip.includes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-body-sm text-ink-700">
                    <Check size={20} aria-hidden className="mt-0.5 shrink-0 text-success-600" />
                    <span>
                      <span className="np-sr-only">Included: </span>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-h4 text-ink-900">Not included</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {trip.excludes.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-body-sm text-ink-700">
                    <X size={20} aria-hidden className="mt-0.5 shrink-0 text-ink-500" />
                    <span>
                      <span className="np-sr-only">Not included: </span>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {destinations.length > 0 ? (
        <Section className="bg-sand-50">
          <Container>
            <h2 className="font-display text-h2 text-ink-900">Where this trip goes</h2>
            <p className="np-measure-lead mt-3 text-lead text-ink-600">
              {destinations.length} destinations, in route order.
            </p>
            <ul className="mt-8 grid gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-3">
              {destinations.map((destination) => (
                <li key={destination.slug} className="flex">
                  <DestinationCard
                    destination={destination}
                    headingLevel="h3"
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section tight className="bg-jungle-900">
        <Container>
          <div data-surface="dark" className="np-measure-lead">
            <h2 className="font-display text-h2 text-white">
              Enquire about {trip.name}
            </h2>
            <p className="mt-4 text-lead text-white/85">
              Send us your dates and party size and we will come back with availability, a
              firm price and anything we would change about the route for your month.
              It is an enquiry, not a booking. Nothing is charged and nothing is committed.
            </p>
            <div className="mt-8 flex flex-col gap-3 md:flex-row">
              <LinkButton
                href={bookingHref}
                variant="primary"
                size="lg"
                className="w-full md:w-auto"
              >
                Enquire about this trip
              </LinkButton>
              <LinkButton
                href="/plan"
                variant="glass"
                size="lg"
                className="w-full md:w-auto"
              >
                Build a custom plan instead
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
