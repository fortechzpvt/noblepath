import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Compass, Map as MapIcon, Moon } from "lucide-react";

import { DestinationCard } from "@/components/cards/destination-card";
import { ExperienceCard } from "@/components/cards/experience-card";
import { DestinationHero } from "@/components/destinations/destination-hero";
import { DestinationMap } from "@/components/destinations/destination-map";
import { TravelLinks, type TravelConnection } from "@/components/destinations/travel-links";
import { LinkButton } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import {
  getAllDestinations,
  getDestinationBySlug,
  getExperiencesForDestination,
  getRelatedDestinations,
} from "@/lib/content";
import { formatMonthRange, regionName } from "@/lib/format";
import type { Destination } from "@/lib/types";

export function generateStaticParams(): Array<{ slug: string }> {
  return getAllDestinations().map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);

  if (!destination) {
    return {
      title: "Destination not found",
      robots: { index: false, follow: true },
    };
  }

  const title = destination.name;
  const description = destination.summary.slice(0, 300);

  return {
    title,
    description,
    alternates: { canonical: `/destinations/${destination.slug}` },
    openGraph: {
      type: "article",
      title: `${title} · Noble Path`,
      description,
      url: `/destinations/${destination.slug}`,
      images: [
        {
          url: destination.image.src,
          width: 1600,
          height: 900,
          alt: destination.image.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Noble Path`,
      description,
      images: [destination.image.src],
    },
  };
}

/**
 * Structured data for a place. Coordinates are the one field here that is not
 * traveller-facing prose, and the only reason this page emits JSON-LD at all —
 * everything else already has an `article`-flavoured `openGraph` block above.
 */
function destinationJsonLd(destination: Destination) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: destination.name,
    description: destination.summary,
    url: `/destinations/${destination.slug}`,
    image: destination.image.src,
    geo: {
      "@type": "GeoCoordinates",
      latitude: destination.coordinates.lat,
      longitude: destination.coordinates.lng,
    },
  };
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);

  if (!destination) notFound();

  const travelConnections: TravelConnection[] = destination.travel.flatMap((link) => {
    const to = getDestinationBySlug(link.to);
    if (!to) return [];
    return [
      {
        slug: to.slug,
        name: to.name,
        minutes: link.minutes,
        mode: link.mode ?? "road",
        ...(link.note ? { note: link.note } : {}),
      },
    ];
  });

  const experiences = getExperiencesForDestination(destination.slug);
  const nearby = getRelatedDestinations(destination.slug, 3);

  const facts: ReadonlyArray<{
    readonly icon: typeof MapIcon;
    readonly label: string;
    readonly value: string;
  }> = [
    { icon: MapIcon, label: "Region", value: regionName(destination.region) },
    { icon: CalendarRange, label: "Best months", value: formatMonthRange(destination.bestMonths) },
    {
      icon: Moon,
      label: "Suggested stay",
      value: `${destination.suggestedNights} ${destination.suggestedNights === 1 ? "night" : "nights"}`,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // Escaping `<` is what stops any future content string from being able to
        // close this script element. The payload is our own editorial data, but
        // the escape is cheap and removes the class of bug entirely.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(destinationJsonLd(destination)).replace(/</g, "\\u003c"),
        }}
      />

      <DestinationHero destination={destination} />

      <Section className="bg-surface">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16">
            <div className="np-measure-body">
              <p className="text-lead text-ink-700">{destination.summary}</p>
              <div className="mt-6 flex flex-col gap-5 text-body text-ink-700">
                {destination.description.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {destination.highlights.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-h4 text-ink-900">Highlights</h2>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {destination.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2.5 text-body-sm text-ink-700">
                        <Compass size={18} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="lg:sticky lg:top-32 lg:self-start">
              <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <dl className="grid grid-cols-1 gap-5">
                  {facts.map(({ icon: Icon, label, value }) => (
                    <div key={label}>
                      <dt className="flex items-center gap-1.5 text-small text-text-meta">
                        <Icon size={16} aria-hidden />
                        {label}
                      </dt>
                      <dd className="mt-1 text-h5 text-ink-900">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 border-t border-border pt-4 text-small text-ink-600">
                  {destination.seasonNote}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-sand-50">
        <Container>
          <h2 className="font-display text-h2 text-ink-900">Where it is</h2>
          <p className="np-measure-lead mt-3 text-lead text-ink-600">
            {destination.name} is in {regionName(destination.region)}.
          </p>
          <DestinationMap
            name={destination.name}
            coordinates={destination.coordinates}
            className="mt-8 h-[360px]"
          />
        </Container>
      </Section>

      {travelConnections.length > 0 ? (
        <Section className="bg-surface">
          <Container>
            <h2 className="font-display text-h2 text-ink-900">Getting there &amp; around</h2>
            <p className="np-measure-lead mt-3 text-lead text-ink-600">
              Advisory door-to-door estimates for typical road conditions, not live routing
              output.
            </p>
            <div className="mt-10">
              <TravelLinks connections={travelConnections} originName={destination.name} />
            </div>
          </Container>
        </Section>
      ) : null}

      <Section className="bg-sand-50">
        <Container>
          <h2 className="font-display text-h2 text-ink-900">Experiences here</h2>
          {experiences.length > 0 ? (
            <ul className="mt-8 grid gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-3">
              {experiences.map((experience) => (
                <li key={experience.slug}>
                  <ExperienceCard experience={experience} headingLevel="h3" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-body text-ink-600">
              We haven&rsquo;t added experiences here yet.{" "}
              <Link
                href="/experiences"
                className="rounded-xs text-jungle-600 underline underline-offset-4"
              >
                Browse every experience
              </Link>
              .
            </p>
          )}
        </Container>
      </Section>

      {nearby.length > 0 ? (
        <Section className="bg-surface">
          <Container>
            <h2 className="font-display text-h2 text-ink-900">Nearby destinations</h2>
            <ul className="mt-8 grid gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-3">
              {nearby.map((neighbour) => (
                <li key={neighbour.slug} className="flex">
                  <DestinationCard destination={neighbour} headingLevel="h3" className="w-full" />
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
              Put {destination.name} on your trip
            </h2>
            <p className="mt-4 text-lead text-white/85">
              Build a full itinerary around it, or send us an enquiry directly. Either way,
              nothing is booked or charged until you accept a quotation.
            </p>
            <div className="mt-8 flex flex-col gap-3 md:flex-row">
              <LinkButton href="/plan" variant="primary" size="lg" className="w-full md:w-auto">
                Build a plan through here
              </LinkButton>
              <LinkButton href="/bookings" variant="glass" size="lg" className="w-full md:w-auto">
                Enquire directly
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
