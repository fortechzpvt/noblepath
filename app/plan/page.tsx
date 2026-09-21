import type { Metadata } from "next";

import { TransferPicker } from "@/components/transfers/transfer-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Plan your trip",
  description: "Choose airport pickup, airport drop and the vehicle you want for your Sri Lanka trip.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    <>
      <PageHeader
        imageSrc="/images/destinations/ella.jpg"
        title="Plan your trip"
        lead="Choose your airport transfers and the vehicle you want to travel in."
      />
      <Section className="bg-sand-50">
        <Container>
          <TransferPicker className="max-w-[var(--container-prose)]" />
        </Container>
      </Section>
    </>
  );
}
