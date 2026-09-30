import type { Metadata } from "next";

import { BookingOptions } from "@/components/booking/booking-options";
import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { getAllDestinations, getAllExperiences, getAllTrips } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Enquire & Book a Sri Lanka Tour",
  description:
    "Send a booking request: take a ready-made Sri Lanka itinerary or build your own with stays, activities and a private driver, and get a quotation.",
  path: "/bookings",
});

export default async function BookingsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // `?service=ride` opens the single-trip form (D-24, D-25); anything else is the trip form.
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
        lead="Book a full trip or just a single trip with a driver. Tell us what you need and we will reply with a quotation."
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
