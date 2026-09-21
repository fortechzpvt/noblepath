import type { Metadata } from "next";

import { PlanBuilder } from "@/components/plan/plan-builder";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Plan your trip",
  description:
    "Tell us how long you have, when you arrive and what you love, and get a day-by-day Sri Lanka route, with airport transfers and a vehicle of your choice.",
  alternates: { canonical: "/plan" },
};

export default function PlanPage() {
  return (
    <>
      <PageHeader
        imageSrc="/images/destinations/ella.jpg"
        title="Let's build your Sri Lanka"
        lead="Answer three questions, get a day-by-day route, then choose your airport transfers and vehicle."
      />
      <Section className="bg-sand-50">
        <Container>
          <PlanBuilder />
        </Container>
      </Section>
    </>
  );
}
