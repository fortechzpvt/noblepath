import { TripCard } from "@/components/cards/trip-card";
import { LinkButton } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/section";
import type { Region, TripPackage } from "@/lib/types";

/** Home S6 (page-specs §1 S6). Three trips, then a centred "See all". */
export function TripsPreview({
  trips,
  regionsByTrip,
}: {
  readonly trips: readonly TripPackage[];
  /** Trip slug → the regions it crosses, in route order. Resolved by the page. */
  readonly regionsByTrip: Readonly<Record<string, readonly Region[]>>;
}) {
  return (
    <section className="np-section bg-surface">
      <Container wide>
        <SectionHeading
          overline="Ready to go"
          title="Trips you can book today"
          lead="Complete routes with the driving, the stays and the timing already worked out. Take one as it is, or use it as a starting point."
        />

        <ul className="mt-8 grid gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-3">
          {trips.slice(0, 3).map((trip) => (
            <li key={trip.slug}>
              <TripCard trip={trip} regions={regionsByTrip[trip.slug] ?? []} />
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center">
          <LinkButton href="/trips" variant="ghost" size="md">
            See all trips
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}
