import type { Metadata } from "next";

import { BookingOptions } from "@/components/booking/booking-options";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { getAllDestinations, getAllExperiences, getAllTrips } from "@/lib/content";

export const metadata: Metadata = {
  title: "Plan your trip",
  description:
    "Send a booking request: choose a pre-planned trip or build your own, or book a single ride with a driver, and get a quotation.",
  alternates: { canonical: "/bookings" },
};

export default async function BookingsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // `?service=ride` opens the single-ride form (D-24); anything else is the trip form.
  const initialService = (await searchParams).service === "ride" ? "ride" : "trip";
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
        lead="Book a full trip or just a single ride with a driver. Tell us what you need and we will reply with a quotation."
      />
      <Section className="bg-sand-50">
        <Container>
          <BookingOptions
            initialService={initialService}
            trips={trips}
            destinations={destinations}
            experiences={experiences}
          />
        </Container>
      </Section>
    </>
  );
}
