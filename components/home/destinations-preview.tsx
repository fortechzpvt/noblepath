import { DestinationCard } from "@/components/cards/destination-card";
import { Container } from "@/components/ui/section";
import { SnapRail } from "@/components/ui/snap-rail";
import { SectionHeading } from "@/components/ui/section";
import { LinkButton } from "@/components/ui/button";
import type { Destination } from "@/lib/types";

/** Home S3 (page-specs §1 S3). Six destinations, stacked cards, snap rail. */
export function DestinationsPreview({
  destinations,
}: {
  readonly destinations: readonly Destination[];
}) {
  return (
    <section className="np-section bg-surface">
      <Container wide>
        <SectionHeading
          overline="Where to go"
          title="Places that stay with you"
          action={
            <LinkButton href="/destinations" variant="outline" size="md">
              View all
            </LinkButton>
          }
        />

        <SnapRail label="Featured destinations" className="mt-8">
          {destinations.slice(0, 6).map((destination) => (
            <li
              key={destination.slug}
              className="w-[80vw] shrink-0 md:w-[44vw] lg:w-[31%] xl:w-[23%]"
            >
              <DestinationCard destination={destination} />
            </li>
          ))}
        </SnapRail>
      </Container>
    </section>
  );
}
