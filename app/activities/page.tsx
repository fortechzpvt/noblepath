import type { Metadata } from "next";

import { ActivitiesExplorer } from "@/components/activities/activities-explorer";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { activities, activityCategories } from "@/content/activities";

export const metadata: Metadata = {
  title: "Activities",
  description:
    "Beaches, water sports, safaris, treks, trains, tea country, food, culture and more: browse things to do in Sri Lanka with location, duration, difficulty and price.",
  alternates: { canonical: "/activities" },
};

export default function ActivitiesPage() {
  return (
    <>
      <PageHeader
        imageSrc="/images/experiences/surfing-south-coast.jpg"
        title="Activities"
        lead="Things to do across Sri Lanka, with where, how long, how hard and roughly what it costs."
      />
      <Section className="bg-sand-50">
        <Container>
          <p className="np-measure-lead mb-8 text-body text-ink-600">
            Durations and prices are indicative. Prices are bands, not quotes: we confirm the
            real price when you send a booking request.
          </p>
          <ActivitiesExplorer categories={activityCategories} activities={activities} />
          <div className="mt-14 flex flex-col items-start gap-3 rounded-xl bg-jungle-900 p-8 text-white md:flex-row md:items-center md:justify-between">
            <p className="text-h4">Found something you like?</p>
            <LinkButton href="/bookings" variant="primary" size="lg">
              Plan your trip
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
