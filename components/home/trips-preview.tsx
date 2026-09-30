import { TripCard } from "@/components/cards/trip-card";
import { TripCarousel } from "@/components/home/trip-carousel";
import { LinkButton } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/section";
import type { Region, TripPackage } from "@/lib/types";

/**
 * Home S6 (page-specs §1 S6). Every trip on a 3D cylindrical carousel (D-33),
 * with "See all trips" beside the controls. The vertical padding shrinks on
 * short laptop screens so the whole section fits under the nav (D-34).
 *
 * The cards are rendered here, on the server, and handed to the client
 * carousel, which only turns the ring. The section clips horizontally because
 * the side cards reach past a narrow viewport; `overflow-x: clip`, not hidden,
 * so the cards' scroll-driven reveals keep their timeline (see D-31).
 */
export function TripsPreview({
  trips,
  regionsByTrip,
}: {
  readonly trips: readonly TripPackage[];
  /** Trip slug → the regions it crosses, in route order. Resolved by the page. */
  readonly regionsByTrip: Readonly<Record<string, readonly Region[]>>;
}) {
  return (
    <section className="overflow-x-clip bg-surface py-[var(--section-y)] lg:py-[clamp(1.5rem,5svh,var(--section-y))]">
      <Container wide>
        <TripCarousel
          label="Trips you can book today"
          header={
            <SectionHeading
              overline="Ready to go"
              title="Trips you can book today"
              lead="Complete routes with the driving, the stays and the timing already worked out. Take one as it is, or use it as a starting point."
              // On a short laptop screen the lead would cost the carousel a
              // fifth of its size; the cards say the same thing (D-34).
              leadClassName="lg:[@media(max-height:859px)]:hidden"
            />
          }
          aside={
            <LinkButton href="/trips" variant="ghost" size="md">
              See all trips
            </LinkButton>
          }
          items={trips.map((trip) => ({
            key: trip.slug,
            name: trip.name,
            card: (
              <TripCard
                trip={trip}
                regions={regionsByTrip[trip.slug] ?? []}
                compact
                className="h-full"
              />
            ),
          }))}
        />
      </Container>
    </section>
  );
}
