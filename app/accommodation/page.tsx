import type { Metadata } from "next";

import { StaysExplorer } from "@/components/accommodation/stays-explorer";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { getAllDestinations, hasAccommodations } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Where to Stay in Sri Lanka: Hotels by Budget",
  description:
    "Hand-picked places to stay across Sri Lanka, from budget to luxury, on a map. Choose a budget, pick a town and add the stay to your trip.",
  path: "/accommodation",
  image: {
    src: "/images/experiences/jungle-villa-yala.jpg",
    alt: "A timber villa deck facing dense jungle at Yala, lit by low evening sun",
  },
});

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
