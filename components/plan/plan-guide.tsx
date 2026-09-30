import Link from "next/link";

import { Container, Section } from "@/components/ui/section";
import { getAllTrips, getFeaturedDestinations } from "@/lib/content";
import { faqJsonLd, jsonLdScript } from "@/lib/seo";

/**
 * The crawlable half of /plan (D-38).
 *
 * The transfer picker above it is an interactive client form with almost no
 * text, so on its own /plan gave search engines about 160 words. This section
 * is server-rendered and explains how planning a Sri Lanka trip with Noble
 * Path works, linking to every ready-made itinerary and the main destinations.
 *
 * Every claim is taken from what the site already states elsewhere (the About
 * page's method, the trips' own durations and inclusions). Nothing here may
 * promise a price, licence, review count or service the business has not
 * confirmed (policy §18, requirements §7.4).
 */
export const PLAN_FAQS: readonly { question: string; answer: string }[] = [
  {
    question: "How many days do I need in Sri Lanka?",
    answer:
      "Our ready-made itineraries run from 4 to 15 days. Four or five days covers one region, such as the Cultural Triangle or the south coast. Eight to ten days is enough for a classic loop of the ancient cities, the hill country and a beach. Two weeks or more lets you add the east coast or wildlife parks without rushing. We plan fewer stops and longer stays: two nights for Sigiriya, three or more for the hill country.",
  },
  {
    question: "When is the best time to visit Sri Lanka?",
    answer:
      "Sri Lanka has two opposing monsoons, so there is always a dry side. Between roughly May and September the south-west is wet and the east coast is at its best; between November and February it is the north-east's turn, and the south and west coasts are dry. Every destination and trip on this site lists its best months, and a route should follow the season.",
  },
  {
    question: "How long are the drives between places?",
    answer:
      "Longer than the map suggests: a 140 km hop can take four hours. Every day of every itinerary lists its driving time, and we plan around a comfortable daily limit. When a day goes over five hours, the itinerary says so on that day.",
  },
  {
    question: "Can I change a ready-made itinerary?",
    answer:
      "Yes. Take a trip as it is or use it as a starting point. On the booking form you can choose a ready-made trip or build your own with stays, activities and transport, and we reply with a quotation.",
  },
  {
    question: "Are the prices on the site final?",
    answer:
      "No. Prices shown on trips are indicative, either a \"from\" price or a price band per person. Inclusions and exclusions are listed in full on every trip. The final price comes in a quotation after you send an enquiry.",
  },
];

export function PlanGuide() {
  const trips = [...getAllTrips()].sort((a, b) => a.durationDays - b.durationDays);
  const destinations = getFeaturedDestinations(8);

  return (
    <Section className="bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd(PLAN_FAQS))} />
      <Container>
        <div className="mx-auto max-w-[var(--container-prose)]">
          <h2 className="font-display text-h2 text-ink-900">How to plan a trip to Sri Lanka with us</h2>
          <ol className="mt-5 flex list-decimal flex-col gap-4 pl-5 text-body text-ink-700 marker:font-semibold marker:text-jungle-700">
            <li>
              <strong className="font-semibold text-ink-900">Choose your transfers and vehicle.</strong>{" "}
              Pick your airport pickup and drop-off above and the vehicle your private driver will use for
              the whole route.
            </li>
            <li>
              <strong className="font-semibold text-ink-900">Pick an itinerary or build your own.</strong>{" "}
              Start from one of the <Link href="/trips" className="font-semibold text-jungle-700 underline underline-offset-4">ready-made Sri Lanka itineraries</Link>{" "}
              below, or combine <Link href="/destinations" className="font-semibold text-jungle-700 underline underline-offset-4">destinations</Link>,{" "}
              <Link href="/accommodation" className="font-semibold text-jungle-700 underline underline-offset-4">places to stay</Link> and{" "}
              <Link href="/activities" className="font-semibold text-jungle-700 underline underline-offset-4">things to do</Link> into a route of your own.
            </li>
            <li>
              <strong className="font-semibold text-ink-900">Send an enquiry.</strong>{" "}
              <Link href="/bookings" className="font-semibold text-jungle-700 underline underline-offset-4">Tell us your dates and group</Link>, and a
              person reads it and replies with a quotation.
            </li>
          </ol>

          <h2 className="mt-14 font-display text-h2 text-ink-900">Sri Lanka itineraries by length</h2>
          <ul className="mt-5 flex flex-col gap-3 text-body text-ink-700">
            {trips.map((trip) => (
              <li key={trip.slug}>
                <Link href={`/trips/${trip.slug}`} className="font-semibold text-jungle-700 underline underline-offset-4">
                  {trip.name}
                </Link>{" "}
                · {trip.durationDays}-day Sri Lanka itinerary
              </li>
            ))}
          </ul>

          <h2 className="mt-14 font-display text-h2 text-ink-900">Places to include in your route</h2>
          <p className="mt-5 text-body text-ink-700">
            {destinations.map((destination, index) => (
              <span key={destination.slug}>
                {index > 0 ? ", " : ""}
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="font-semibold text-jungle-700 underline underline-offset-4"
                >
                  {destination.name}
                </Link>
              </span>
            ))}
            , and <Link href="/destinations" className="font-semibold text-jungle-700 underline underline-offset-4">every other Sri Lanka destination we cover</Link>.
          </p>

          <h2 className="mt-14 font-display text-h2 text-ink-900">Sri Lanka trip planning questions</h2>
          <dl className="mt-5 flex flex-col gap-6">
            {PLAN_FAQS.map((faq) => (
              <div key={faq.question}>
                <dt className="font-semibold text-ink-900">{faq.question}</dt>
                <dd className="mt-2 text-body text-ink-700">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}
