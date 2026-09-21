import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange, Car, Check, Map, Wallet, X } from "lucide-react";

import { DestinationCard } from "@/components/cards/destination-card";
import { TripItinerary } from "@/components/trips/trip-itinerary";
import { LinkButton } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { getAllTrips, getDestinationBySlug, getTripBySlug } from "@/lib/content";
import { formatDuration, formatMonthRange, formatPriceBand, regionName } from "@/lib/format";
import type { Region, TripPackage, TripTier } from "@/lib/types";

const TIER_LABEL: Readonly<Record<TripTier, string>> = {
  short: "Short trip",
  classic: "Classic trip",
  grand: "Grand tour",
};

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

  const title = trip.name;
  const description = `${trip.durationDays} days across Sri Lanka. ${trip.summary}`.slice(0, 300);

  return {
    title,
    description,
    alternates: { canonical: `/trips/${trip.slug}` },
    openGraph: {
      type: "article",
      title: `${title} · Noble Path`,
      description,
      url: `/trips/${trip.slug}`,
      images: [
        {
          url: trip.image.src,
          width: 1600,
          height: 900,
          alt: trip.image.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Noble Path`,
      description,
      images: [trip.image.src],
    },
  };
}

/**
 * Structured data for a package.
 *
 * `TouristTrip` rather than `Product`: a `Product` is expected to carry an
 * `offers.price`, and Noble Path publishes indicative bands, not quotes
 * (requirements §7.4). Emitting a number here would put a price we cannot
 * honour into search results, so no `offers` node is emitted at all.
 */
function tripJsonLd(trip: TripPackage, destinationNames: readonly string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: trip.name,
    description: trip.summary,
    url: `/trips/${trip.slug}`,
    image: trip.image.src,
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
    provider: {
      "@type": "TravelAgency",
      name: "Noble Path",
    },
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
      value: regions.map((region) => regionName(region)).join(" · ") || "—",
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
      value: `${formatPriceBand(trip.priceBandPerPerson)} per person`,
    },
  ];

  const bookingHref = `/bookings?type=package&item=${encodeURIComponent(trip.slug)}`;

  return (
    <>
      <script
        type="application/ld+json"
        // Escaping `<` is what stops any future content string from being able to
        // close this script element. The payload is our own editorial data, but
        // the escape is cheap and removes the class of bug entirely.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            tripJsonLd(
              trip,
              destinations.map((destination) => destination.name),
            ),
          ).replace(/</g, "\\u003c"),
        }}
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
            the standard of accommodation you choose. It is not a quote — we confirm a price
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
              It is an enquiry, not a booking — nothing is charged and nothing is committed.
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
