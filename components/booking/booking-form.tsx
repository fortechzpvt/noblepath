"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { BookingSummary } from "@/components/booking/booking-summary";
import { DatesSection } from "@/components/booking/dates-section";
import {
  PlanSection,
  type NamedOption,
  type TripOption,
} from "@/components/booking/plan-section";
import { TransfersSection } from "@/components/booking/transfers-section";
import { TravellerSection } from "@/components/booking/traveller-section";
import { Card } from "@/components/booking/ui";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/field";
import {
  DELIVERY_CONNECTED,
  createEmptyDraft,
  ids,
  submitBookingRequest,
  validateDraft,
  validateTerms,
  type BookingDraft,
  type FormError,
} from "@/lib/booking-request";

type Step = "form" | "review" | "done";

/**
 * Terms shown before submission. DRAFT WORDING: it describes how the request
 * process works, not legal terms. Have it reviewed against Noble Path's real
 * booking, cancellation and privacy policies before this goes live.
 */
const TERMS: readonly string[] = [
  "This is a booking request, not a confirmed booking. Nothing is reserved and no payment is taken at this stage.",
  "Prices shown are indicative. We reply with availability and a written quotation, and a booking is confirmed only when you accept that quotation.",
  "The details you give are used only to reply to your request and to plan your trip.",
  "Please check that your dates, traveller numbers and contact details are correct. We use them to prepare your quotation.",
];

export function BookingForm({
  trips,
  destinations,
  experiences,
}: {
  readonly trips: readonly TripOption[];
  readonly destinations: readonly NamedOption[];
  readonly experiences: readonly NamedOption[];
}) {
  const [draft, setDraft] = useState<BookingDraft>(createEmptyDraft);
  const [step, setStep] = useState<Step>("form");
  const [errors, setErrors] = useState<readonly FormError[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<BookingDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const scrollToTop = () =>
    window.requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }));

  function handleReview(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (found.length > 0) {
      // Focus the summary, not the first field, so the traveller sees how many things need attention.
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStep("review");
    scrollToTop();
  }

  async function handleSubmit(): Promise<void> {
    const found = validateTerms(accepted);
    setErrors(found);
    if (found.length > 0) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitBookingRequest(draft);
      setRequestId(result.id);
      setStep("done");
      scrollToTop();
    } finally {
      setSubmitting(false);
    }
  }

  async function copyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the ID is on screen to copy by hand.
    }
  }

  const summaryTitle =
    errors.length === 1 ? "One thing needs your attention" : `${errors.length} things need your attention`;

  if (step === "done") {
    return (
      <div ref={topRef} className="mx-auto max-w-[var(--container-prose)]">
        <Card title="Your booking request">
          <div className="rounded-lg bg-jungle-50 p-5">
            <p className="text-small text-text-meta">Booking request ID</p>
            <p className="mt-1 font-mono text-h3 text-ink-900" data-testid="booking-id">
              {requestId}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copyId}>
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? "Copied" : "Copy ID"}
            </Button>
          </div>
          {DELIVERY_CONNECTED ? (
            <p className="text-body text-ink-700">
              Thank you. We will reply to {draft.traveller.email} with availability and a
              quotation. Quote this ID if you contact us.
            </p>
          ) : (
            <p role="status" className="rounded-lg bg-warning-50 p-4 text-body-sm text-warning-700">
              This request has not been sent to our team yet: sending is still being connected.
              Keep this ID and contact us directly to confirm we have your request.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto max-w-[var(--container-prose)]">
      <ErrorSummary ref={summaryRef} id="bk-errors" title={summaryTitle} errors={errors} />

      {step === "form" ? (
        <form noValidate onSubmit={handleReview} className="mt-0 flex flex-col gap-6">
          <TravellerSection
            value={draft.traveller}
            onChange={(traveller) => update({ traveller })}
            errors={errors}
          />
          <DatesSection value={draft.dates} onChange={(dates) => update({ dates })} errors={errors} />
          <TransfersSection
            draft={draft}
            onPickup={(pickup) => update({ pickup })}
            onDrop={(drop) => update({ drop })}
            errors={errors}
          />
          <PlanSection
            draft={draft}
            update={update}
            trips={trips}
            destinations={destinations}
            experiences={experiences}
            errors={errors}
          />
          <div>
            <Button type="submit" variant="solid" size="lg" className="w-full md:w-auto">
              Review my request
            </Button>
            <p className="mt-3 text-small text-text-meta">
              You will see a full summary before anything is submitted.
            </p>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-display text-h2 text-ink-900">Check your request</h2>
            <p className="mt-2 text-body text-ink-600">
              Make sure everything is right, then accept the terms and submit.
            </p>
          </div>

          <BookingSummary
            draft={draft}
            trips={trips}
            destinations={destinations}
            experiences={experiences}
          />

          <Card title="Terms and conditions">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-body-sm text-ink-700">
              {TERMS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id={ids.terms}
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[var(--color-jungle-700)]"
              />
              <span className="text-body-sm text-ink-900">
                I have read and accept the terms and conditions.
              </span>
            </label>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              type="button"
              variant="solid"
              size="lg"
              className="w-full md:w-auto"
              disabled={submitting}
              onClick={handleSubmit}
            >
              Submit booking request
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full md:w-auto"
              onClick={() => {
                setStep("form");
                setErrors([]);
                scrollToTop();
              }}
            >
              Edit my request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
