import type { Metadata } from "next";

import { ActivitiesExplorer } from "@/components/activities/activities-explorer";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { activities, activityCategories } from "@/lib/content-source";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Things to Do in Sri Lanka: Activities & Experiences",
  description:
    "Safaris, the Ella train, surfing, whale watching, treks, tea country, food and culture: things to do in Sri Lanka with location, duration and difficulty.",
  path: "/activities",
  image: {
    src: "/images/experiences/surfing-south-coast.jpg",
    alt: "Two surfers carrying boards along a palm-lined beach at dusk.",
  },
});

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
