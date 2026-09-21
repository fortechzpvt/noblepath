import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

/**
 * Home S8 (page-specs §1 S8).
 *
 * DEVIATION IMPL-03: the specification calls for a newsletter sign-up band. v1 has
 * no mailing list, no consent record and no endpoint to receive an address, so
 * an email field here would be a control that silently does nothing. The band
 * keeps its position and weight but carries the two actions that do work.
 * Restore the sign-up when a mailing list actually exists.
 */
export function ClosingCta() {
  return (
    <section data-surface="dark" className="bg-jungle-900 text-white">
      <Container wide className="np-section-tight">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="np-measure-lead">
            <h2 className="font-display text-h2">Ready when you are</h2>
            <p className="mt-3 text-lead text-[var(--color-on-image-secondary)]">
              Build your own route in a few minutes, or tell us what you have in mind
              and we&rsquo;ll come back to you with a plan.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 md:flex-row">
            <LinkButton href="/plan" variant="primary" size="lg">
              Plan your trip
            </LinkButton>
            <LinkButton
              href="/bookings"
              variant="glass"
              size="lg"
              className="border border-white/30"
            >
              Make an enquiry
            </LinkButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
