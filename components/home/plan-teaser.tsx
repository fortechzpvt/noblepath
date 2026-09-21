import { Check } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

const POINTS = [
  "Routed so you are never driving more than half a day",
  "Seasonally aware — we steer you away from the wrong coast",
  "Yours to edit, reorder and keep",
] as const;

/**
 * Home S5 (page-specs §1 S5).
 *
 * The right-hand column is an *illustration* of the planner UI, not the planner.
 * It is aria-hidden: the left column carries every piece of meaning, so the
 * preview adds nothing for a screen-reader user but noise.
 */
export function PlanTeaser() {
  return (
    <section className="np-section bg-sand-50">
      <Container wide>
        <div className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <div>
            <p className="text-overline uppercase text-jungle-600">Plan</p>
            <h2 className="mt-3 font-display text-h2 text-ink-900">
              Tell us what you love. We&rsquo;ll route the island.
            </h2>
            <p className="mt-4 np-measure-lead text-lead text-ink-600">
              Pick your dates and the things you care about. We turn them into a
              day-by-day plan that respects the driving, the weather and the time you
              actually have.
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-body-sm text-ink-700">
                  <Check size={16} aria-hidden className="mt-1 shrink-0 text-jungle-600" />
                  {point}
                </li>
              ))}
            </ul>

            <LinkButton href="/plan" variant="solid" size="lg" className="mt-8">
              Start planning
            </LinkButton>
          </div>

          <div
            aria-hidden
            className="relative hidden max-h-[420px] overflow-hidden lg:block"
          >
            <div className="flex flex-col gap-4 opacity-90">
              {[
                { day: 1, place: "Negombo → Sigiriya", note: "Climb at first light" },
                { day: 2, place: "Sigiriya → Kandy", note: "Temple of the Tooth" },
                { day: 3, place: "Kandy → Ella", note: "The hill country train" },
              ].map((row) => (
                <div
                  key={row.day}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-jungle-600 text-body-sm font-semibold text-white">
                    {row.day}
                  </span>
                  <span>
                    <span className="block font-display text-h5 text-ink-900">
                      {row.place}
                    </span>
                    <span className="block text-small text-text-meta">{row.note}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-sand-50 to-transparent" />
          </div>
        </div>
      </Container>
    </section>
  );
}
