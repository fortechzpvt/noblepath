"use client";

import { useRef, useState } from "react";
import { ArrowLeftRight, Check, Copy, LocateFixed, Route } from "lucide-react";

import { PlaceSearchField } from "@/components/booking/place-search-field";
import { RideSummary } from "@/components/booking/ride-summary";
import { TripMap, type TripEnd } from "@/components/booking/trip-map";
import { Card, Chip } from "@/components/booking/ui";
import { VehicleGrid } from "@/components/transfers/vehicle-grid";
import { Button } from "@/components/ui/button";
import { ErrorSummary, FieldGroup, TextField, TextareaField } from "@/components/ui/field";
import { BookingSubmissionError, MAX_TRAVELLERS, todayIso, type FormError } from "@/lib/booking-request";
import {
  estimateRoadTrip,
  formatDuration,
  formatPoint,
  isInSriLanka,
  roundPoint,
  type GeoPoint,
} from "@/lib/geo";
import { fetchPlaceAt, placeLabel } from "@/lib/place-lookup";
import {
  MAX_LUGGAGE,
  MAX_PLACE_LENGTH,
  MAX_RIDE_NOTES,
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
  const field = error.fieldId
    .replace(/^server:(ride|contact)\./, "")
    .replace(/^(pickup|dropoff)Point(\..*)?$/, "$1");
  const target = (rideIds as Record<string, string>)[field];
  return { ...error, fieldId: target ?? rideIds.submit };
}

const POINT_KEY = { pickup: "pickupPoint", dropoff: "dropoffPoint" } as const;

/** Same draft-wording caveat as `TERMS` in `booking-form.tsx`: review before go-live. */
const TERMS: readonly string[] = [
  "This is a trip request, not a confirmed booking. No vehicle is reserved and no payment is taken at this stage.",
  "We reply with availability and a written quotation, and the trip is confirmed only when you accept that quotation.",
  "The details you give, including any map pins or location you share, are used only to reply to your request and to arrange your trip.",
  "Place searches and map pins are looked up through our server with Photon (komoot), and map images come from OpenStreetMap. Your IP address is not passed to Photon.",
  "Please check that your pickup, drop-off, date, time and contact details are correct.",
];

/**
 * Single point-to-point ride request (D-24), e.g. Matara to Kandy. Shown to
 * travellers as "A single trip". D-25 made pickup and drop-off searchable and
 * pinnable on a map, with "Use my current location" for the pickup.
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
  const [activeEnd, setActiveEnd] = useState<TripEnd>("pickup");
  const [locating, setLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState("");
  const labelLookupRef = useRef<Partial<Record<TripEnd, AbortController>>>({});
  /** Labels we generated for a pin ("Pinned location (…)", "Near …"), so removing the pin can remove them too. */
  const autoLabelsRef = useRef<Record<TripEnd, Set<string>>>({ pickup: new Set(), dropoff: new Set() });

  const setRide = (patch: Partial<RideDetails>) =>
    setDraft((current) => ({ ...current, ride: { ...current.ride, ...patch } }));
  const setContact = (patch: Partial<RideContact>) =>
    setDraft((current) => ({ ...current, contact: { ...current.contact, ...patch } }));
  const errorFor = (id: string) => errors.find((error) => error.fieldId === id)?.message;

  /** Typing replaces the pin: the text is a search, and a stale pin would disagree with it. */
  function typePlace(end: TripEnd, text: string): void {
    labelLookupRef.current[end]?.abort();
    setRide({ [end]: text, [POINT_KEY[end]]: null } as Partial<RideDetails>);
  }

  function choosePlace(end: TripEnd, label: string, point: GeoPoint): void {
    labelLookupRef.current[end]?.abort();
    setRide({ [end]: label, [POINT_KEY[end]]: roundPoint(point) } as Partial<RideDetails>);
    if (end === "pickup") setActiveEnd("dropoff");
  }

  /**
   * A pin placed without a name (map tap, drag, current location). The field
   * shows a placeholder label at once, then the nearest named place from
   * `/api/places/reverse` — but only if the traveller has not typed over the
   * placeholder in the meantime.
   */
  function pinPlace(end: TripEnd, point: GeoPoint, placeholder = `Pinned location (${formatPoint(point)})`): void {
    labelLookupRef.current[end]?.abort();
    autoLabelsRef.current[end].add(placeholder);
    setRide({ [end]: placeholder, [POINT_KEY[end]]: point } as Partial<RideDetails>);
    if (end === "pickup" && draft.ride.dropoffPoint === null) setActiveEnd("dropoff");

    const controller = new AbortController();
    labelLookupRef.current[end] = controller;
    fetchPlaceAt(point, controller.signal)
      .then((place) => {
        if (!place) return;
        const label = `Near ${placeLabel(place)}`.slice(0, MAX_PLACE_LENGTH);
        autoLabelsRef.current[end].add(label);
        setDraft((current) =>
          current.ride[end] === placeholder ? { ...current, ride: { ...current.ride, [end]: label } } : current,
        );
      })
      .catch(() => {
        // The placeholder already names the exact coordinates; nothing to fix.
      });
  }

  /** Removing a pin also removes a label that only described that pin; typed text stays. */
  function removePin(end: TripEnd): void {
    labelLookupRef.current[end]?.abort();
    setDraft((current) => {
      const text = current.ride[end];
      const generated = autoLabelsRef.current[end].has(text);
      return {
        ...current,
        ride: { ...current.ride, [POINT_KEY[end]]: null, ...(generated ? { [end]: "" } : {}) },
      };
    });
  }

  function swapEnds(): void {
    // A lookup still in flight would write its label into the wrong field.
    labelLookupRef.current.pickup?.abort();
    labelLookupRef.current.dropoff?.abort();
    const labels = autoLabelsRef.current;
    autoLabelsRef.current = { pickup: labels.dropoff, dropoff: labels.pickup };
    setRide({
      pickup: r.dropoff,
      dropoff: r.pickup,
      pickupPoint: r.dropoffPoint,
      dropoffPoint: r.pickupPoint,
    });
  }

  function locateMe(): void {
    if (!("geolocation" in navigator)) {
      setLocateMessage("This browser cannot share its location. Search for your pickup or tap the map instead.");
      return;
    }
    setLocating(true);
    setLocateMessage("Finding your location…");
    // Only ever asked for on this button press, never on page load.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const point = roundPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        if (!isInSriLanka(point)) {
          setLocateMessage(
            "Your location looks to be outside Sri Lanka. Search for your pickup or tap the map instead.",
          );
          return;
        }
        pinPlace("pickup", point, "My current location");
        setLocateMessage(
          `Pickup set to your current location, accurate to about ${Math.max(1, Math.round(position.coords.accuracy))} m. ` +
            "Drag pin A on the map if it is not quite right.",
        );
      },
      (error) => {
        setLocating(false);
        setLocateMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location access was not allowed. Search for your pickup or tap the map instead."
            : error.code === error.TIMEOUT
              ? "Finding your location took too long. Try again, search, or tap the map."
              : "Your location is not available right now. Search for your pickup or tap the map instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

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
  const estimate =
    r.pickupPoint && r.dropoffPoint ? estimateRoadTrip(r.pickupPoint, r.dropoffPoint) : null;

  if (step === "done") {
    return (
      <div ref={topRef}>
        <Card title="Your trip request">
          <div className="rounded-lg bg-jungle-50 p-5">
            <h3 ref={headingRef} tabIndex={-1} className="text-small font-normal text-text-meta">
              Trip request ID
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
            for your trip. Quote this ID if you contact us.
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

          <Card
            title="Your trip"
            description="A private vehicle with a driver, from one place to another. Search each place or pin it on the map. Use local Sri Lanka time."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <PlaceSearchField
                id={rideIds.pickup}
                label="Pickup location"
                description="Search a town, hotel, airport or address."
                value={r.pickup}
                point={r.pickupPoint}
                onTextChange={(text) => typePlace("pickup", text)}
                onSelect={(label, point) => choosePlace("pickup", label, point)}
                onClearPin={() => removePin("pickup")}
                onFocus={() => setActiveEnd("pickup")}
                error={errorFor(rideIds.pickup)}
              >
                <div>
                  <button
                    type="button"
                    onClick={locateMe}
                    disabled={locating}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xs text-body-sm font-semibold text-jungle-600 underline underline-offset-4 disabled:cursor-wait disabled:opacity-60"
                  >
                    <LocateFixed size={16} aria-hidden />
                    Use my current location
                  </button>
                  <p className="text-small text-text-meta">
                    Your browser asks first. The location is used only for this pickup.
                  </p>
                  <p aria-live="polite" className="text-small text-text-meta empty:hidden">
                    {locateMessage}
                  </p>
                </div>
              </PlaceSearchField>
              <PlaceSearchField
                id={rideIds.dropoff}
                label="Drop-off location"
                description="Where the driver should take you."
                value={r.dropoff}
                point={r.dropoffPoint}
                onTextChange={(text) => typePlace("dropoff", text)}
                onSelect={(label, point) => choosePlace("dropoff", label, point)}
                onClearPin={() => removePin("dropoff")}
                onFocus={() => setActiveEnd("dropoff")}
                error={errorFor(rideIds.dropoff)}
              />
            </div>
            {r.pickup.trim() !== "" || r.dropoff.trim() !== "" ? (
              <div>
                <button
                  type="button"
                  onClick={swapEnds}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xs text-body-sm text-jungle-600 underline underline-offset-4"
                >
                  <ArrowLeftRight size={16} aria-hidden />
                  Swap pickup and drop-off
                </button>
              </div>
            ) : null}

            <div id={rideIds.map} tabIndex={-1}>
              <FieldGroup
                legend="Pin it on the map"
                description="Optional. Choose which pin you are setting, then tap the map. Drag a pin to fine-tune it."
              >
                <div className="flex flex-wrap gap-2">
                  <Chip
                    type="radio"
                    name="rd-active-end"
                    checked={activeEnd === "pickup"}
                    onChange={() => setActiveEnd("pickup")}
                  >
                    <span className="np-trip-pin np-trip-pin--a !h-6 !w-6 !border-2 !text-[12px] !shadow-none" aria-hidden>
                      A
                    </span>
                    Setting pickup
                  </Chip>
                  <Chip
                    type="radio"
                    name="rd-active-end"
                    checked={activeEnd === "dropoff"}
                    onChange={() => setActiveEnd("dropoff")}
                  >
                    <span className="np-trip-pin np-trip-pin--b !h-6 !w-6 !border-2 !text-[12px] !shadow-none" aria-hidden>
                      B
                    </span>
                    Setting drop-off
                  </Chip>
                </div>
                <TripMap
                  className="mt-3"
                  pickup={r.pickupPoint}
                  dropoff={r.dropoffPoint}
                  activeEnd={activeEnd}
                  onPlace={(end, point) => pinPlace(end, point)}
                />
              </FieldGroup>
            </div>

            {/* The live region stays mounted so the estimate is announced when it appears. */}
            <div aria-live="polite">
              {estimate ? (
                <p className="flex items-start gap-2 rounded-lg bg-jungle-50 p-4 text-body-sm text-ink-900">
                  <Route size={18} aria-hidden className="mt-0.5 shrink-0 text-jungle-700" />
                  <span>
                    Roughly <strong>{estimate.km} km</strong> and{" "}
                    <strong>{formatDuration(estimate.minutes)}</strong> by road, estimated from the
                    straight-line distance. Your quotation confirms the route and price.
                  </span>
                </p>
              ) : null}
            </div>

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
              Review my trip
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
              Check your trip
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
              Submit trip request
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
              Edit my trip
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
