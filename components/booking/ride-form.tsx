"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, Check, Copy } from "lucide-react";

import { RideSummary } from "@/components/booking/ride-summary";
import { Card, Chip } from "@/components/booking/ui";
import { VehicleGrid } from "@/components/transfers/vehicle-grid";
import { Button } from "@/components/ui/button";
import { ErrorSummary, FieldGroup, TextField, TextareaField } from "@/components/ui/field";
import { BookingSubmissionError, MAX_TRAVELLERS, todayIso, type FormError } from "@/lib/booking-request";
import {
  MAX_LUGGAGE,
  MAX_PLACE_LENGTH,
  MAX_RIDE_NOTES,
  PLACE_SUGGESTIONS,
  RIDE_TRIP_TYPES,
  createEmptyRide,
  rideIds,
  submitRideRequest,
  validateRide,
  validateRideTerms,
  type RideContact,
  type RideDetails,
  type RideDraft,
} from "@/lib/ride-request";

type Step = "form" | "review" | "done";

/**
 * Server field errors arrive as `server:ride.returnDate`. Point them at the
 * matching on-page field (`rd-returnDate`) when one exists so the error
 * summary link goes somewhere; otherwise at the submit button.
 */
function toPageFieldError(error: FormError): FormError {
  const field = error.fieldId.replace(/^server:(ride|contact)\./, "");
  const target = (rideIds as Record<string, string>)[field];
  return { ...error, fieldId: target ?? rideIds.submit };
}

const PLACES_LIST_ID = "rd-place-suggestions";

/** Same draft-wording caveat as `TERMS` in `booking-form.tsx`: review before go-live. */
const TERMS: readonly string[] = [
  "This is a ride request, not a confirmed booking. No vehicle is reserved and no payment is taken at this stage.",
  "We reply with availability and a written quotation, and the ride is confirmed only when you accept that quotation.",
  "The details you give are used only to reply to your request and to arrange your ride.",
  "Please check that your pickup, drop-off, date, time and contact details are correct.",
];

/**
 * Single point-to-point ride request (D-24), e.g. Matara to Kandy.
 *
 * Deliberately separate from `BookingForm`: a ride needs no arrival/departure
 * dates, nationality or trip plan, so it is a short form of its own with its
 * own endpoint (`POST /api/rides`), rather than a mode bolted into the
 * full-trip draft. Same three steps as the trip form: fill in, review, done.
 */
export function RideForm() {
  const [draft, setDraft] = useState<RideDraft>(createEmptyRide);
  const [step, setStep] = useState<Step>("form");
  const [errors, setErrors] = useState<readonly FormError[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const setRide = (patch: Partial<RideDetails>) =>
    setDraft((current) => ({ ...current, ride: { ...current.ride, ...patch } }));
  const setContact = (patch: Partial<RideContact>) =>
    setDraft((current) => ({ ...current, contact: { ...current.contact, ...patch } }));
  const errorFor = (id: string) => errors.find((error) => error.fieldId === id)?.message;

  // The button that had focus is gone after a step change, so move focus to the
  // new step's heading (or the top of the form when returning to edit).
  const scrollToTop = () =>
    window.requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });

  function handleReview(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const found = validateRide(draft);
    setErrors(found);
    if (found.length > 0) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStep("review");
    scrollToTop();
  }

  async function handleSubmit(): Promise<void> {
    const found = validateRideTerms(accepted);
    setErrors(found);
    if (found.length > 0) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitRideRequest(draft);
      setRequestId(result.id);
      setStep("done");
      scrollToTop();
    } catch (error) {
      const submitError: FormError = {
        fieldId: rideIds.submit,
        message:
          error instanceof BookingSubmissionError
            ? error.message
            : "Something went wrong sending your request. Please try again.",
      };
      const fieldErrors = error instanceof BookingSubmissionError ? (error.fieldErrors ?? []) : [];
      setErrors([submitError, ...fieldErrors.map(toPageFieldError)]);
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
  const r = draft.ride;

  if (step === "done") {
    return (
      <div ref={topRef}>
        <Card title="Your ride request">
          <div className="rounded-lg bg-jungle-50 p-5">
            <h3 ref={headingRef} tabIndex={-1} className="text-small font-normal text-text-meta">
              Ride request ID
            </h3>
            <p className="mt-1 font-mono text-h3 text-ink-900" data-testid="ride-id">
              {requestId}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copyId}>
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? "Copied" : "Copy ID"}
            </Button>
          </div>
          <p className="text-body text-ink-700">
            Thank you. We will reply to {draft.contact.email} with availability and a quotation
            for your ride. Quote this ID if you contact us.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      <ErrorSummary ref={summaryRef} id="rd-errors" title={summaryTitle} errors={errors} />

      {step === "form" ? (
        <form noValidate onSubmit={handleReview} className="flex flex-col gap-6">
          {/* Honeypot, same as the trip form (lib/validation.ts). */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, overflow: "hidden" }}
          >
            <label htmlFor="rd-website">Leave this field empty</label>
            <input
              id="rd-website"
              type="text"
              name="rd-website"
              tabIndex={-1}
              autoComplete="off"
              value={draft.website}
              onChange={(event) => setDraft((current) => ({ ...current, website: event.target.value }))}
            />
          </div>

          <datalist id={PLACES_LIST_ID}>
            {PLACE_SUGGESTIONS.map((place) => (
              <option key={place} value={place} />
            ))}
          </datalist>

          <Card
            title="Your ride"
            description="A private vehicle with a driver, from one place to another. Use local Sri Lanka time."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id={rideIds.pickup}
                label="Pickup location"
                description="A town, hotel, airport or address."
                list={PLACES_LIST_ID}
                autoComplete="off"
                value={r.pickup}
                onChange={(event) => setRide({ pickup: event.target.value })}
                error={errorFor(rideIds.pickup)}
                maxLength={MAX_PLACE_LENGTH}
              />
              <TextField
                id={rideIds.dropoff}
                label="Drop-off location"
                description="Where the driver should take you."
                list={PLACES_LIST_ID}
                autoComplete="off"
                value={r.dropoff}
                onChange={(event) => setRide({ dropoff: event.target.value })}
                error={errorFor(rideIds.dropoff)}
                maxLength={MAX_PLACE_LENGTH}
              />
            </div>
            {r.pickup.trim() !== "" || r.dropoff.trim() !== "" ? (
              <div>
                <button
                  type="button"
                  onClick={() => setRide({ pickup: r.dropoff, dropoff: r.pickup })}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xs text-body-sm text-jungle-600 underline underline-offset-4"
                >
                  <ArrowLeftRight size={16} aria-hidden />
                  Swap pickup and drop-off
                </button>
              </div>
            ) : null}

            <FieldGroup legend="Trip type">
              <div id={rideIds.tripType} className="flex flex-wrap gap-2">
                {RIDE_TRIP_TYPES.map((option) => (
                  <Chip
                    key={option.value}
                    type="radio"
                    name="rd-trip-type"
                    checked={r.tripType === option.value}
                    onChange={() => setRide({ tripType: option.value })}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </FieldGroup>

            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id={rideIds.date}
                label="Pickup date"
                type="date"
                min={todayIso()}
                value={r.date}
                onChange={(event) => setRide({ date: event.target.value })}
                error={errorFor(rideIds.date)}
              />
              <TextField
                id={rideIds.time}
                label="Pickup time"
                type="time"
                value={r.time}
                onChange={(event) => setRide({ time: event.target.value })}
                error={errorFor(rideIds.time)}
              />
              {r.tripType === "return" ? (
                <>
                  <TextField
                    id={rideIds.returnDate}
                    label="Return date"
                    description="The driver brings you back to your pickup location."
                    type="date"
                    min={r.date || todayIso()}
                    value={r.returnDate}
                    onChange={(event) => setRide({ returnDate: event.target.value })}
                    error={errorFor(rideIds.returnDate)}
                  />
                  <TextField
                    id={rideIds.returnTime}
                    label="Return pickup time"
                    description="When to collect you for the way back."
                    type="time"
                    value={r.returnTime}
                    onChange={(event) => setRide({ returnTime: event.target.value })}
                    error={errorFor(rideIds.returnTime)}
                  />
                </>
              ) : null}
            </div>
          </Card>

          <Card title="Vehicle and passengers" description="Choose a vehicle. We will confirm it suits your passengers and luggage.">
            <div id={rideIds.vehicle} tabIndex={-1}>
              <FieldGroup legend="Vehicle" description="Choose one." error={errorFor(rideIds.vehicle)}>
                <VehicleGrid
                  name="rd-vehicle"
                  value={r.vehicle}
                  onChange={(vehicle) => setRide({ vehicle })}
                />
              </FieldGroup>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id={rideIds.passengers}
                label="Passengers"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_TRAVELLERS}
                value={r.passengers}
                onChange={(event) => setRide({ passengers: event.target.value })}
                error={errorFor(rideIds.passengers)}
              />
              <TextField
                id={rideIds.luggage}
                label="Pieces of luggage"
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_LUGGAGE}
                value={r.luggage}
                onChange={(event) => setRide({ luggage: event.target.value })}
                error={errorFor(rideIds.luggage)}
              />
            </div>
            <TextareaField
              id={rideIds.notes}
              label="Notes for the driver"
              optional
              description="Stops on the way, child seats, flight number, anything we should know."
              value={r.notes}
              onChange={(event) => setRide({ notes: event.target.value })}
              maxLength={MAX_RIDE_NOTES}
            />
          </Card>

          <Card title="Your details" description="Who should we reply to?">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                id={rideIds.fullName}
                label="Full name"
                autoComplete="name"
                value={draft.contact.fullName}
                onChange={(event) => setContact({ fullName: event.target.value })}
                error={errorFor(rideIds.fullName)}
                maxLength={100}
              />
              <TextField
                id={rideIds.email}
                label="Email"
                type="email"
                autoComplete="email"
                value={draft.contact.email}
                onChange={(event) => setContact({ email: event.target.value })}
                error={errorFor(rideIds.email)}
                maxLength={254}
              />
              <TextField
                id={rideIds.phone}
                label="WhatsApp or phone number"
                type="tel"
                autoComplete="tel"
                description="Include the country code, for example +94 77 123 4567."
                value={draft.contact.phone}
                onChange={(event) => setContact({ phone: event.target.value })}
                error={errorFor(rideIds.phone)}
                maxLength={24}
              />
            </div>
          </Card>

          <div>
            <Button type="submit" variant="solid" size="lg" className="w-full md:w-auto">
              Review my ride
            </Button>
            <p className="mt-3 text-small text-text-meta">
              You will see a full summary before anything is submitted.
            </p>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="font-display text-h2 text-ink-900">
              Check your ride
            </h2>
            <p className="mt-2 text-body text-ink-600">
              Make sure everything is right, then accept the terms and submit.
            </p>
          </div>

          <RideSummary draft={draft} />

          <Card title="Terms and conditions">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-body-sm text-ink-700">
              {TERMS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id={rideIds.terms}
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
              id={rideIds.submit}
              type="button"
              variant="solid"
              size="lg"
              className="w-full md:w-auto"
              disabled={submitting}
              onClick={handleSubmit}
            >
              Submit ride request
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
              Edit my ride
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
