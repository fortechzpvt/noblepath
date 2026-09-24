"use client";

import { useEffect, useRef, useState } from "react";
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
import { getAccommodationBySlug, getActivityBySlug } from "@/lib/content";
import { generateItinerary } from "@/lib/itinerary";
import {
  BookingSubmissionError,
  MAX_ACTIVITIES,
  MAX_STAYS,
  createEmptyDraft,
  ids,
  makeEntryId,
  submitBookingRequest,
  totalTravellers,
  validateDraft,
  validateTerms,
  type BookingDraft,
  type FormError,
  type StayEntry,
  type ActivityEntry,
} from "@/lib/booking-request";
import { readStoredPlan } from "@/lib/plan-storage";
import { readTripSelections } from "@/lib/trip-selections";

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

  // Mount-only: carry in whatever the traveller already picked on /accommodation,
  // /activities and /plan, so they never have to re-enter it here. Runs once, like
  // the restore effects on those pages, and only fills fields that are still
  // empty — it must never clobber a request the traveller is already editing.
  // The `setDraft` call is made from a named function invoked in the effect body
  // (not written inline) to keep it a single, deliberate sync point rather than
  // a bare statement — same convention as the restore effects on those pages.
  useEffect(() => {
    const seedFromElsewhere = () => {
      const selections = readTripSelections();
      const storedPlan = readStoredPlan();

      setDraft((current) => {
        const party = String(Math.max(totalTravellers(current.traveller), 1));
        let stays = current.stays;
        let activities = current.activities;
        let plannedItinerary = current.plannedItinerary;
        let seededEntries = false;
        let changed = false;

        if (current.stays.length === 0) {
          const seeded: StayEntry[] = [];
          // Capped at MAX_STAYS: a traveller who picked a stay in more
          // destinations than the form allows still gets a valid draft,
          // just not every pick — the rest stay chosen on /accommodation.
          for (const [destinationSlug, accommodationSlug] of Object.entries(
            selections.stays,
          ).slice(0, MAX_STAYS)) {
            const accommodation = getAccommodationBySlug(accommodationSlug);
            if (!accommodation) continue;
            seeded.push({
              id: makeEntryId("stay"),
              destination: destinationSlug,
              tier: accommodation.tier,
              kind: /villa/i.test(accommodation.kind) ? "villa" : "hotel",
              checkIn: current.dates.arrivalDate,
              checkOut: "",
              roomType: "Double",
              guests: party,
              accommodationSlug,
            });
          }
          if (seeded.length > 0) {
            stays = seeded;
            changed = true;
            seededEntries = true;
          }
        }

        if (current.activities.length === 0) {
          const seeded: ActivityEntry[] = [];
          // Capped at MAX_ACTIVITIES for the same reason as stays above.
          for (const slug of selections.activitySlugs.slice(0, MAX_ACTIVITIES)) {
            const activity = getActivityBySlug(slug);
            if (!activity) continue;
            seeded.push({
              id: makeEntryId("act"),
              activity: "other",
              otherName: `${activity.name} (${activity.location})`.slice(0, 100),
              date: current.dates.arrivalDate,
              participants: party,
              sourceActivitySlug: slug,
            });
          }
          if (seeded.length > 0) {
            activities = seeded;
            changed = true;
            seededEntries = true;
          }
        }

        if (current.plannedItinerary === null && storedPlan) {
          const itinerary = generateItinerary(storedPlan.input);
          plannedItinerary = {
            days: itinerary.input.days,
            destinationSlugs: itinerary.destinationSlugs,
            interests: itinerary.input.interests,
          };
          changed = true;
        }

        if (!changed) return current;

        return {
          ...current,
          stays,
          activities,
          plannedItinerary,
          planChoice: seededEntries && current.planChoice === null ? "custom" : current.planChoice,
          customMode: seededEntries ? "choose" : current.customMode,
        };
      });
    };

    seedFromElsewhere();
  }, []);

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
    } catch (error) {
      // The traveller stays on the review step with their draft intact, so
      // they can retry without re-entering anything.
      const submitError: FormError = {
        fieldId: ids.submit,
        message:
          error instanceof BookingSubmissionError
            ? error.message
            : "Something went wrong sending your request. Please try again.",
      };
      const fieldErrors = error instanceof BookingSubmissionError ? (error.fieldErrors ?? []) : [];
      setErrors([submitError, ...fieldErrors]);
      window.requestAnimationFrame(() => summaryRef.current?.focus());
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
          <p className="text-body text-ink-700">
            Thank you. We will reply to {draft.traveller.email} with availability and a
            quotation. Quote this ID if you contact us.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div ref={topRef} className="mx-auto max-w-[var(--container-prose)]">
      <ErrorSummary ref={summaryRef} id="bk-errors" title={summaryTitle} errors={errors} />

      {step === "form" ? (
        <form noValidate onSubmit={handleReview} className="mt-0 flex flex-col gap-6">
          {/* Honeypot (lib/validation.ts). Off-screen and out of both the tab
              order and the accessibility tree — a real traveller, sighted or
              using assistive technology, never encounters it; a bot filling
              every field it finds does. */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, overflow: "hidden" }}
          >
            <label htmlFor="bk-website">Leave this field empty</label>
            <input
              id="bk-website"
              type="text"
              name="bk-website"
              tabIndex={-1}
              autoComplete="off"
              value={draft.website}
              onChange={(event) => update({ website: event.target.value })}
            />
          </div>

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
