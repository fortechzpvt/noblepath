import Image from "next/image";
import type { Metadata } from "next";
import { CalendarRange, Compass, Route, ShieldCheck } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "About Noble Path",
  description:
    "Who Noble Path is, how we build Sri Lankan itineraries, and what we will and won't promise you. A small, new planning service run from Sri Lanka.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "article",
    title: "About Noble Path",
    description:
      "How we build Sri Lankan itineraries — seasons first, geography second, and a human reading every enquiry.",
    url: "/about",
    images: [
      {
        url: "/images/destinations/ella.jpg",
        width: 1600,
        height: 1067,
        alt: "The Nine Arch Bridge near Ella, a stone viaduct curving through dense tea country",
      },
    ],
  },
};

const PRINCIPLES = [
  {
    number: "01",
    icon: CalendarRange,
    title: "The season decides the route",
    body: "Sri Lanka has two opposing monsoons. Between roughly May and September the south-west is wet; between November and February it is the north-east's turn. A route that ignores this produces a very expensive week of rain. Every destination and experience in our content carries best, shoulder and avoid months, and the month you arrive changes what we put in front of you.",
  },
  {
    number: "02",
    icon: Route,
    title: "Distance is the hidden cost",
    body: "The island is small on a map and slow on the ground. A 140 km hop can take four hours. We hold a table of typical door-to-door times between the places we cover, and we plan around a comfortable daily ceiling rather than pretending the drive is shorter than it is. When a day goes over five hours, we say so on the day itself.",
  },
  {
    number: "03",
    icon: Compass,
    title: "Fewer stops, longer stays",
    body: "The most common mistake on a first Sri Lanka itinerary is seven towns in ten days. Packing and unpacking is not travel. Our suggested stays come from how long a place actually rewards — two nights for Sigiriya, three or more for the hill country — and our planner spends your days rather than scattering them.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Nothing hidden, nothing invented",
    body: "Prices on this site are indicative bands, not quotes, and they are labelled as bands everywhere they appear. Travel times are advisory estimates, not routing-engine output. Inclusions and exclusions are listed in full on every trip. If we do not know something, the site says we do not know it.",
  },
] as const;

/**
 * About (FR-6, page-specs §7). Editorial, single narrow column.
 *
 * The copy is deliberately specific about what Noble Path is and is not. The
 * service is new and has no track record to claim, so the trust argument here is
 * method — how routes are built and what is honestly promised — rather than
 * testimonials or numbers we cannot evidence (policy §18).
 *
 * The `#how-we-plan` anchor is linked from the site footer; do not rename it.
 */
export default function AboutPage() {
  return (
    <>
      <section
        data-surface="dark"
        className="relative isolate flex min-h-[min(60svh,560px)] items-end"
      >
        <Image
          src="/images/destinations/ella.jpg"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <span aria-hidden className="np-scrim-wash absolute inset-0 -z-10" />
        <span aria-hidden className="np-scrim-vertical absolute inset-0 -z-10" />
        <span aria-hidden className="np-scrim-top absolute inset-x-0 top-0 -z-10 h-40" />

        <Container className="pt-32 pb-[var(--section-y-tight)]">
          <p className="np-on-image-secondary text-overline uppercase">Who we are</p>
          <h1 className="np-on-image np-measure-hero mt-3 font-display text-h1">
            About Noble Path
          </h1>
          <p className="np-on-image-secondary np-measure-lead mt-4 text-lead">
            A small trip-planning service, run from Sri Lanka, for people who have a fixed
            number of days and want them spent well.
          </p>
        </Container>
      </section>

      <Section className="bg-surface">
        <Container>
          <div className="mx-auto max-w-[var(--container-prose)]">
            <p className="text-lead text-ink-800 first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:font-display first-letter:text-[3.5rem] first-letter:leading-[0.82] first-letter:font-bold first-letter:text-jungle-700">
              Noble Path started with a spreadsheet. Friends kept asking the same question —
              &ldquo;I have ten days in Sri Lanka, what should I actually do?&rdquo; — and the
              honest answer was never a list of places. It was an order, a direction of
              travel, and a month.
            </p>

            <p className="mt-6 text-body text-ink-700">
              The island is unusually dense. In the space of a long weekend you can stand on a
              1,500-year-old rock fortress, ride a train through tea country, and swim off the
              south coast. That density is exactly what makes it easy to get wrong: visitors
              arrive with a list of everything they have heard about and try to fit all of it
              into the days they have, in the order they heard about them. The result is a
              trip spent mostly in a van.
            </p>

            <p className="mt-6 text-body text-ink-700">
              What we do is narrow. We keep a carefully written set of destinations,
              experiences and ready-made trips, we hold real estimates of how long it takes to
              get between them, and we turn your dates and interests into a route you can
              read, change, and enquire about. That is the whole product.
            </p>

            <h2 id="how-we-plan" className="mt-14 scroll-mt-28 font-display text-h2 text-ink-900">
              How an itinerary is actually put together
            </h2>

            <p className="mt-5 text-body text-ink-700">
              There is no artificial intelligence in the planner, and that is a deliberate
              choice. The itinerary you get is produced by a rule-based engine that behaves
              the same way every time it is given the same answers. If you tell us you are
              coming in July for nine days and you care about wildlife and food, two people on
              two continents typing the same thing get the same plan — and if that plan is
              wrong, we can reproduce it exactly and fix the rule that caused it.
            </p>

            <p className="mt-6 text-body text-ink-700">The engine works in four passes:</p>

            <ol className="mt-5 flex list-decimal flex-col gap-4 pl-5 text-body text-ink-700 marker:font-semibold marker:text-jungle-700">
              <li>
                <strong className="font-semibold text-ink-900">Score by season.</strong>{" "}
                Every destination is rated for the month you arrive, using its best, shoulder
                and avoid months. This is what pushes the east coast up and the south coast
                down in June, and reverses it in January.
              </li>
              <li>
                <strong className="font-semibold text-ink-900">Score by interest.</strong>{" "}
                Your selected interests raise places that carry those tags. Select nothing and
                you get the island&rsquo;s strongest places instead of a random shortlist —
                an editorial weight decides the order, so the &ldquo;surprise me&rdquo; answer
                is still a credible one.
              </li>
              <li>
                <strong className="font-semibold text-ink-900">Route, don&rsquo;t rank.</strong>{" "}
                A high-scoring place four hours off your direction of travel is worse than a
                good one on the way. Candidates are chained together through our table of
                typical journey times, starting from the airport, so consecutive days never
                ask for an implausible drive.
              </li>
              <li>
                <strong className="font-semibold text-ink-900">Spend the days.</strong>{" "}
                Nights are allocated from each place&rsquo;s suggested length of stay and the
                pace you asked for, then the route is written out as days with the driving
                attached to the day it happens on.
              </li>
            </ol>

            <p className="mt-6 text-body text-ink-700">
              You then edit it. Days can be removed and reordered, and the totals and warnings
              update as you go. Your plan is kept in your own browser — there is no account,
              no login, and nothing to remember. That also means it lives on one device: clear
              your browser data and it is gone.
            </p>

            <p className="mt-6 text-body text-ink-700">
              When you send an enquiry, a person reads it. Availability, vehicles, guides and
              accommodation are confirmed by hand before anyone quotes you a number, which is
              why this site shows price bands and not prices.
            </p>

            <h2 className="mt-14 font-display text-h2 text-ink-900">
              What we are not
            </h2>

            <p className="mt-5 text-body text-ink-700">
              Noble Path is new. We are not going to tell you how many thousands of travellers
              we have sent around the island, because the honest number is small. We are not a
              booking engine either: this version of the site takes no card payments and holds
              no live inventory. Every &ldquo;Book&rdquo; button on this site opens an enquiry,
              and it says so before you submit it.
            </p>

            <p className="mt-6 text-body text-ink-700">
              We would rather start from that position than from a claim you would be right
              not to believe.
            </p>
          </div>
        </Container>
      </Section>

      <Section tight className="bg-sand-100">
        <Container>
          <blockquote className="mx-auto max-w-[860px] text-center">
            <p className="font-display text-display-sm text-ink-900">
              &ldquo;Ten days is not a list. It is a direction, in the right season.&rdquo;
            </p>
          </blockquote>
        </Container>
      </Section>

      <Section className="bg-surface">
        <Container>
          <h2 className="font-display text-h2 text-ink-900">What we plan around</h2>
          <ol className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
            {PRINCIPLES.map(({ number, icon: Icon, title, body }) => (
              <li key={number} className="flex gap-5">
                <span aria-hidden className="font-display text-h2 text-sand-300">
                  {number}
                </span>
                <div className="np-measure-body">
                  <h3 className="flex items-center gap-2.5 text-h3 text-ink-900">
                    <Icon size={24} aria-hidden className="shrink-0 text-jungle-600" />
                    {title}
                  </h3>
                  <p className="mt-3 text-body text-ink-700">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tight className="bg-jungle-900" >
        <Container>
          <div data-surface="dark" className="np-measure-lead">
            <h2 className="font-display text-h2 text-white">Talk to us</h2>
            <p className="mt-4 text-lead text-white/85">
              The enquiry form is the way to reach us — it goes straight to the people who
              build the routes, and it tells us enough to reply with something useful rather
              than a brochure.
            </p>
            <div className="mt-8">
              <LinkButton href="/bookings" variant="primary" size="lg">
                Send an enquiry
              </LinkButton>
            </div>
            <p className="mt-6 text-body-sm text-white/70">
              We reply within two working days, Sri Lanka time (UTC+5:30). There is no phone
              line yet; when there is, it will be listed here.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
