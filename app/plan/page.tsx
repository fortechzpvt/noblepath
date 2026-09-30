import type { Metadata } from "next";

import { PlanGuide } from "@/components/plan/plan-guide";
import { TransferPicker } from "@/components/transfers/transfer-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Plan Your Sri Lanka Trip: Transfers & Vehicle",
  description:
    "Start planning your Sri Lanka trip: choose airport pickup and drop-off and the vehicle for your private driver, then pick an itinerary or build your own.",
  path: "/plan",
  image: { src: "/images/destinations/ella.jpg", alt: "The Nine Arch Bridge near Ella in Sri Lanka's tea country" },
});

export default function PlanPage() {
  return (
    <>
      <PageHeader
        imageSrc="/images/destinations/ella.jpg"
        title="Plan your Sri Lanka trip"
        lead="Choose your airport transfers and the vehicle for your private driver, then pick an itinerary or build your own."
      />
      <Section className="bg-sand-50">
        <Container>
          <TransferPicker className="max-w-[var(--container-prose)]" />
        </Container>
      </Section>
      <PlanGuide />
    </>
  );
}
