import type { Metadata } from "next";

import { BookingForm } from "@/components/booking/booking-form";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { getAllDestinations, getAllExperiences, getAllTrips } from "@/lib/content";

export const metadata: Metadata = {
  title: "Plan your trip",
  description:
    "Send a booking request: choose a pre-planned trip or build your own, add airport transfers, and get a quotation.",
  alternates: { canonical: "/bookings" },
};

export default function BookingsPage() {
  // Only plain data crosses into the client component.
  const trips = getAllTrips().map((trip) => ({
    slug: trip.slug,
    name: trip.name,
    tagline: trip.tagline,
    durationDays: trip.durationDays,
    band: trip.priceBandPerPerson,
  }));
  const destinations = getAllDestinations().map((d) => ({ slug: d.slug, name: d.name }));
  const experiences = getAllExperiences().map((x) => ({ slug: x.slug, name: x.name }));

  return (
    <>
      <PageHeader
        imageSrc="/images/destinations/ella.jpg"
        title="Plan your trip"
        lead="Tell us about your group and your dates, choose a ready-made trip or build your own, and we will reply with a quotation."
      />
      <Section className="bg-sand-50">
        <Container>
          <BookingForm trips={trips} destinations={destinations} experiences={experiences} />
        </Container>
      </Section>
    </>
  );
}
