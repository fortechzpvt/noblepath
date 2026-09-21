import { Compass, Route, ReceiptText } from "lucide-react";

import { Container } from "@/components/ui/section";

const VALUES = [
  {
    icon: Compass,
    title: "Local knowledge",
    body: "Every route is built by people who have actually driven it. We know which road is beautiful and which one is just long.",
  },
  {
    icon: Route,
    title: "Built around you",
    body: "Tell us how many days you have and what you care about. We arrange the island around that, not the other way round.",
  },
  {
    icon: ReceiptText,
    title: "Nothing hidden",
    body: "Indicative prices, honest drive times, and a clear note when a place is out of season. No surprises once you land.",
  },
] as const;

/**
 * Home S2 (page-specs §1 S2).
 *
 * A deliberate light beat immediately after the hero: the proposition stated in
 * words rather than more photography.
 */
export function WhyNoblePath() {
  return (
    <section className="bg-sand-50 pt-[var(--section-y-tight)] pb-[var(--section-y)]">
      <Container wide>
        <h2 className="np-sr-only">Why Noble Path</h2>
        <ul className="grid gap-8 md:grid-cols-3 md:gap-[var(--grid-gap)]">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon size={24} aria-hidden className="text-jungle-600" />
              <h3 className="mt-4 font-display text-h4 text-ink-900">{title}</h3>
              <p className="mt-2 max-w-[40ch] text-body-sm text-ink-600">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
