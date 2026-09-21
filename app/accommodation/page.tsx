import type { Metadata } from "next";

import { StaysExplorer } from "@/components/accommodation/stays-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { getAllDestinations, hasAccommodations } from "@/lib/content";

export const metadata: Metadata = {
  title: "Accommodation",
  description:
    "Choose a budget, then browse places to stay across Sri Lanka on a map: budget, mid-range and luxury.",
  alternates: { canonical: "/accommodation" },
};

export default function AccommodationPage() {
  const destinations = getAllDestinations()
    .filter((d) => hasAccommodations(d.slug))
    .map((d) => ({ slug: d.slug, name: d.name }));

  return (
    <>
      <PageHeader
        imageSrc="/images/experiences/jungle-villa-yala.jpg"
        title="Accommodation"
        lead="Budget, mid-range or luxury: pick one and see where you could stay."
      />
      <Section>
        <Container>
          <StaysExplorer destinations={destinations} />
        </Container>
      </Section>
    </>
  );
}
