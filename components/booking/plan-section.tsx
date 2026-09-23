import Link from "next/link";
import { Check, ExternalLink, Plus, Route, X } from "lucide-react";

import { Card, Chip, Entry } from "@/components/booking/ui";
import { VehicleGrid } from "@/components/transfers/vehicle-grid";
import { Button } from "@/components/ui/button";
import { FieldGroup, SelectField, TextField, TextareaField } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  INTEREST_OPTIONS,
  MAX_ACTIVITIES,
  MAX_STAYS,
  MAX_TRANSPORT,
  ROOM_TYPES,
  STAY_KINDS,
  TIERS,
  ids,
  makeEntryId,
  todayIso,
  totalTravellers,
  type ActivityEntry,
  type BookingDraft,
  type CustomMode,
  type FormError,
  type PlanChoice,
  type StayEntry,
  type TransportEntry,
} from "@/lib/booking-request";
import { getAccommodationBySlug, getActivityBySlug } from "@/lib/content";
import { formatPriceBand, interestName } from "@/lib/format";
import type { PriceBand } from "@/lib/types";

export interface TripOption {
  readonly slug: string;
  readonly name: string;
  readonly tagline: string;
  readonly durationDays: number;
  readonly band: PriceBand;
}
export interface NamedOption {
  readonly slug: string;
  readonly name: string;
}

const cardBase =
  "flex h-full flex-col gap-2 rounded-xl border-2 p-5 text-left " +
  "transition-[background-color,border-color] duration-[var(--dur-2)] ease-[var(--ease-standard)]";

function PlanChoiceCard({
  value,
  current,
  onSelect,
  title,
  text,
}: {
  readonly value: PlanChoice;
  readonly current: PlanChoice | null;
  readonly onSelect: (value: PlanChoice) => void;
  readonly title: string;
  readonly text: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name="bk-plan-choice"
        checked={current === value}
        onChange={() => onSelect(value)}
        className="np-sr-only peer"
      />
      <span
        className={cn(
          cardBase,
          "border-border bg-surface hover:border-border-strong hover:bg-sand-100",
          "peer-checked:border-jungle-700 peer-checked:bg-jungle-50 peer-focus-visible:shadow-[var(--focus-ring)]",
        )}
      >
        <span className="text-h5 text-ink-900">{title}</span>
        <span className="text-body-sm text-ink-600">{text}</span>
      </span>
    </label>
  );
}

/** Option A (pre-planned trip) or Option B (build my own). */
export function PlanSection({
  draft,
  update,
  trips,
  destinations,
  experiences,
  errors,
}: {
  readonly draft: BookingDraft;
  readonly update: (patch: Partial<BookingDraft>) => void;
  readonly trips: readonly TripOption[];
  readonly destinations: readonly NamedOption[];
  readonly experiences: readonly NamedOption[];
  readonly errors: readonly FormError[];
}) {
  const errorFor = (id: string) => errors.find((error) => error.fieldId === id)?.message;
  const party = String(Math.max(totalTravellers(draft.traveller), 1));

  /* ---- stays ---- */
  const setStay = (id: string, patch: Partial<StayEntry>) =>
    update({ stays: draft.stays.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const addStay = () =>
    update({
      stays: [
        ...draft.stays,
        {
          id: makeEntryId("stay"),
          destination: "",
          tier: "mid-range",
          kind: "hotel",
          checkIn: draft.dates.arrivalDate,
          checkOut: "",
          roomType: "Double",
          guests: party,
          accommodationSlug: "",
        },
      ],
    });

  /* ---- activities ---- */
  const setActivity = (id: string, patch: Partial<ActivityEntry>) =>
    update({ activities: draft.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const addActivity = () =>
    update({
      activities: [
        ...draft.activities,
        {
          id: makeEntryId("act"),
          activity: "",
          otherName: "",
          date: draft.dates.arrivalDate,
          participants: party,
          sourceActivitySlug: "",
        },
      ],
    });

  /* ---- transport ---- */
  const setTransport = (id: string, patch: Partial<TransportEntry>) =>
    update({ transport: draft.transport.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const addTransport = () =>
    update({
      transport: [
        ...draft.transport,
        {
          id: makeEntryId("trn"),
          vehicle: null,
          mode: "private",
          pickup: "",
          dropoff: "",
          date: draft.dates.arrivalDate,
        },
      ],
    });

  const prefs = draft.preferences;
  const setPrefs = (patch: Partial<BookingDraft["preferences"]>) =>
    update({ preferences: { ...prefs, ...patch } });
  const toggle = <T,>(list: readonly T[], item: T): T[] =>
    list.includes(item) ? list.filter((value) => value !== item) : [...list, item];

  return (
    <Card
      title="Your trip plan"
      description="Pick a ready-made trip, or build your own. Either way we confirm a price before you commit to anything."
    >
      <div id={ids.planChoice} className="grid gap-4 md:grid-cols-2">
        <PlanChoiceCard
          value="package"
          current={draft.planChoice}
          onSelect={(planChoice) => update({ planChoice })}
          title="Option A: Pre-planned trip"
          text="Choose one of our ready-made packages, view its itinerary and add it to your trip."
        />
        <PlanChoiceCard
          value="custom"
          current={draft.planChoice}
          onSelect={(planChoice) => update({ planChoice })}
          title="Option B: Build my own trip"
          text="Choose your stays, activities and transport, or just tell us what you like."
        />
      </div>
      {errorFor(ids.planChoice) ? (
        <p className="text-small text-error-600">{errorFor(ids.planChoice)}</p>
      ) : null}

      {draft.plannedItinerary ? (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-jungle-700 bg-jungle-50 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Route size={22} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
            <div>
              <p className="text-h5 text-ink-900">
                Your saved itinerary: {draft.plannedItinerary.days}-day route
              </p>
              <p className="mt-1 text-body-sm text-ink-700">
                {draft.plannedItinerary.destinationSlugs
                  .map((slug) => destinations.find((d) => d.slug === slug)?.name ?? slug)
                  .join(" · ")}
                {draft.plannedItinerary.interests.length > 0
                  ? ` — interests: ${draft.plannedItinerary.interests.map(interestName).join(", ")}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/plan"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xs text-body-sm text-jungle-600 underline underline-offset-4"
            >
              View full itinerary
              <ExternalLink size={14} aria-hidden />
              <span className="np-sr-only">(opens in a new tab)</span>
            </Link>
            <button
              type="button"
              onClick={() => update({ plannedItinerary: null })}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-600 hover:bg-sand-100"
            >
              <X size={18} aria-hidden />
              <span className="np-sr-only">Remove saved itinerary from this request</span>
            </button>
          </div>
        </div>
      ) : null}

      {draft.planChoice === "package" ? (
        <div id={ids.package}>
          <FieldGroup legend="Select a pre-planned package" error={errorFor(ids.package)}>
            <ul className="grid gap-4 md:grid-cols-2">
              {trips.map((trip) => {
                const chosen = draft.packageSlug === trip.slug;
                return (
                  <li
                    key={trip.slug}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border-2 p-5",
                      chosen ? "border-jungle-700 bg-jungle-50" : "border-border bg-surface",
                    )}
                  >
                    <div>
                      <p className="text-h5 text-ink-900">{trip.name}</p>
                      <p className="mt-1 text-small text-text-meta">
                        {trip.durationDays} days · {formatPriceBand(trip.band)} per person
                      </p>
                      <p className="mt-2 text-body-sm text-ink-600">{trip.tagline}</p>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={chosen ? "solid" : "outline"}
                        aria-pressed={chosen}
                        onClick={() => update({ packageSlug: chosen ? "" : trip.slug })}
                      >
                        {chosen ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
                        {chosen ? "Added to my trip" : "Add to my trip"}
                      </Button>
                      <Link
                        href={`/trips/${trip.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xs text-body-sm text-jungle-600 underline underline-offset-4"
                      >
                        View itinerary
                        <ExternalLink size={14} aria-hidden />
                        <span className="np-sr-only">for {trip.name} (opens in a new tab)</span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </FieldGroup>
        </div>
      ) : null}

      {draft.planChoice === "custom" ? (
        <div className="flex flex-col gap-8">
          <FieldGroup legend="How would you like to build it?">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["choose", "I will choose the details"],
                  ["preferences", "Just send my preferences"],
                ] as const satisfies ReadonlyArray<readonly [CustomMode, string]>
              ).map(([mode, label]) => (
                <Chip
                  key={mode}
                  type="radio"
                  name="bk-custom-mode"
                  checked={draft.customMode === mode}
                  onChange={() => update({ customMode: mode })}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </FieldGroup>

          {draft.customMode === "choose" ? (
            <div id={ids.customEntries} className="flex flex-col gap-8">
              {errorFor(ids.customEntries) ? (
                <p className="text-small text-error-600">{errorFor(ids.customEntries)}</p>
              ) : null}

              <section aria-labelledby="bk-stays-heading" className="flex flex-col gap-4">
                <h3 id="bk-stays-heading" className="text-h5 text-ink-900">
                  Accommodation
                </h3>
                {draft.stays.map((stay, index) => (
                  <Entry
                    key={stay.id}
                    legend={
                      stay.accommodationSlug
                        ? `Stay ${index + 1} — ${getAccommodationBySlug(stay.accommodationSlug)?.name ?? "picked"} (from Accommodation)`
                        : `Stay ${index + 1}`
                    }
                    removeLabel={`Remove stay ${index + 1}`}
                    onRemove={() => update({ stays: draft.stays.filter((s) => s.id !== stay.id) })}
                  >
                    <SelectField
                      id={ids.stay(index, "destination")}
                      label="Destination"
                      value={stay.destination}
                      onChange={(e) => setStay(stay.id, { destination: e.target.value })}
                      error={errorFor(ids.stay(index, "destination"))}
                    >
                      <option value="">Choose a destination</option>
                      {destinations.map((d) => (
                        <option key={d.slug} value={d.slug}>
                          {d.name}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      id={ids.stay(index, "tier")}
                      label="Budget"
                      value={stay.tier}
                      onChange={(e) =>
                        setStay(stay.id, { tier: e.target.value as StayEntry["tier"] })
                      }
                    >
                      {TIERS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      id={ids.stay(index, "kind")}
                      label="Hotel or villa"
                      value={stay.kind}
                      onChange={(e) =>
                        setStay(stay.id, { kind: e.target.value as StayEntry["kind"] })
                      }
                    >
                      {STAY_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      id={ids.stay(index, "roomType")}
                      label="Room type"
                      value={stay.roomType}
                      onChange={(e) => setStay(stay.id, { roomType: e.target.value })}
                      error={errorFor(ids.stay(index, "roomType"))}
                    >
                      {ROOM_TYPES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </SelectField>
                    <TextField
                      id={ids.stay(index, "checkIn")}
                      label="Check-in"
                      type="date"
                      min={todayIso()}
                      value={stay.checkIn}
                      onChange={(e) => setStay(stay.id, { checkIn: e.target.value })}
                      error={errorFor(ids.stay(index, "checkIn"))}
                    />
                    <TextField
                      id={ids.stay(index, "checkOut")}
                      label="Check-out"
                      type="date"
                      min={stay.checkIn || todayIso()}
                      value={stay.checkOut}
                      onChange={(e) => setStay(stay.id, { checkOut: e.target.value })}
                      error={errorFor(ids.stay(index, "checkOut"))}
                    />
                    <TextField
                      id={ids.stay(index, "guests")}
                      label="Number of guests"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={20}
                      value={stay.guests}
                      onChange={(e) => setStay(stay.id, { guests: e.target.value })}
                      error={errorFor(ids.stay(index, "guests"))}
                    />
                  </Entry>
                ))}
                {draft.stays.length < MAX_STAYS ? (
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={addStay}>
                      <Plus size={16} aria-hidden />
                      Add a stay
                    </Button>
                  </div>
                ) : null}
              </section>

              <section aria-labelledby="bk-activities-heading" className="flex flex-col gap-4">
                <h3 id="bk-activities-heading" className="text-h5 text-ink-900">
                  Activities
                </h3>
                {draft.activities.map((activity, index) => (
                  <Entry
                    key={activity.id}
                    legend={
                      activity.sourceActivitySlug
                        ? `Activity ${index + 1} — ${getActivityBySlug(activity.sourceActivitySlug)?.name ?? "picked"} (from Activities)`
                        : `Activity ${index + 1}`
                    }
                    removeLabel={`Remove activity ${index + 1}`}
                    onRemove={() =>
                      update({ activities: draft.activities.filter((a) => a.id !== activity.id) })
                    }
                  >
                    <SelectField
                      id={ids.activity(index, "activity")}
                      label="Activity"
                      value={activity.activity}
                      onChange={(e) => setActivity(activity.id, { activity: e.target.value })}
                      error={errorFor(ids.activity(index, "activity"))}
                    >
                      <option value="">Choose an activity</option>
                      {experiences.map((x) => (
                        <option key={x.slug} value={x.slug}>
                          {x.name}
                        </option>
                      ))}
                      <option value="other">Something else</option>
                    </SelectField>
                    {activity.activity === "other" ? (
                      <TextField
                        id={ids.activity(index, "otherName")}
                        label="Name the activity"
                        value={activity.otherName}
                        onChange={(e) => setActivity(activity.id, { otherName: e.target.value })}
                        error={errorFor(ids.activity(index, "otherName"))}
                        maxLength={100}
                      />
                    ) : null}
                    <TextField
                      id={ids.activity(index, "date")}
                      label="Date"
                      type="date"
                      min={todayIso()}
                      value={activity.date}
                      onChange={(e) => setActivity(activity.id, { date: e.target.value })}
                      error={errorFor(ids.activity(index, "date"))}
                    />
                    <TextField
                      id={ids.activity(index, "participants")}
                      label="Number of participants"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={20}
                      value={activity.participants}
                      onChange={(e) => setActivity(activity.id, { participants: e.target.value })}
                      error={errorFor(ids.activity(index, "participants"))}
                    />
                  </Entry>
                ))}
                {draft.activities.length < MAX_ACTIVITIES ? (
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={addActivity}>
                      <Plus size={16} aria-hidden />
                      Add an activity
                    </Button>
                  </div>
                ) : null}
              </section>

              <section aria-labelledby="bk-transport-heading" className="flex flex-col gap-4">
                <h3 id="bk-transport-heading" className="text-h5 text-ink-900">
                  Transportation
                </h3>
                {draft.transport.map((entry, index) => (
                  <Entry
                    key={entry.id}
                    legend={`Transport ${index + 1}`}
                    removeLabel={`Remove transport ${index + 1}`}
                    onRemove={() =>
                      update({ transport: draft.transport.filter((t) => t.id !== entry.id) })
                    }
                  >
                    <div id={ids.transport(index, "vehicle")} className="md:col-span-2">
                      <FieldGroup
                        legend="Vehicle type"
                        error={errorFor(ids.transport(index, "vehicle"))}
                      >
                        <VehicleGrid
                          name={`bk-transport-${entry.id}-vehicle`}
                          value={entry.vehicle}
                          onChange={(vehicle) => setTransport(entry.id, { vehicle })}
                        />
                      </FieldGroup>
                    </div>
                    <SelectField
                      id={ids.transport(index, "mode")}
                      label="Private or shared"
                      value={entry.mode}
                      onChange={(e) =>
                        setTransport(entry.id, { mode: e.target.value as TransportEntry["mode"] })
                      }
                    >
                      <option value="private">Private</option>
                      <option value="shared">Shared</option>
                    </SelectField>
                    <TextField
                      id={ids.transport(index, "date")}
                      label="Date required"
                      type="date"
                      min={todayIso()}
                      value={entry.date}
                      onChange={(e) => setTransport(entry.id, { date: e.target.value })}
                      error={errorFor(ids.transport(index, "date"))}
                    />
                    <TextField
                      id={ids.transport(index, "pickup")}
                      label="Pickup location"
                      value={entry.pickup}
                      onChange={(e) => setTransport(entry.id, { pickup: e.target.value })}
                      error={errorFor(ids.transport(index, "pickup"))}
                      maxLength={120}
                    />
                    <TextField
                      id={ids.transport(index, "dropoff")}
                      label="Drop-off location"
                      value={entry.dropoff}
                      onChange={(e) => setTransport(entry.id, { dropoff: e.target.value })}
                      error={errorFor(ids.transport(index, "dropoff"))}
                      maxLength={120}
                    />
                  </Entry>
                ))}
                {draft.transport.length < MAX_TRANSPORT ? (
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={addTransport}>
                      <Plus size={16} aria-hidden />
                      Add transport
                    </Button>
                  </div>
                ) : null}
              </section>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div id={ids.prefDestinations}>
                <FieldGroup
                  legend="Preferred destinations"
                  error={errorFor(ids.prefDestinations)}
                >
                  <ul className="flex flex-wrap gap-2">
                    {destinations.map((d) => (
                      <li key={d.slug}>
                        <Chip
                          type="checkbox"
                          checked={prefs.destinations.includes(d.slug)}
                          onChange={() => setPrefs({ destinations: toggle(prefs.destinations, d.slug) })}
                        >
                          {d.name}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                </FieldGroup>
              </div>

              <FieldGroup legend="Accommodation preference">
                <div className="flex flex-wrap gap-2">
                  {TIERS.map((t) => (
                    <Chip
                      key={t.value}
                      type="radio"
                      name="bk-pref-tier"
                      checked={prefs.tier === t.value}
                      onChange={() => setPrefs({ tier: t.value })}
                    >
                      {t.label}
                    </Chip>
                  ))}
                  {STAY_KINDS.map((k) => (
                    <Chip
                      key={k.value}
                      type="radio"
                      name="bk-pref-kind"
                      checked={prefs.kind === k.value}
                      onChange={() => setPrefs({ kind: k.value })}
                    >
                      {k.label}
                    </Chip>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup legend="Activities you enjoy">
                <ul className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <li key={interest}>
                      <Chip
                        type="checkbox"
                        checked={prefs.interests.includes(interest)}
                        onChange={() => setPrefs({ interests: toggle(prefs.interests, interest) })}
                      >
                        {interestName(interest)}
                      </Chip>
                    </li>
                  ))}
                </ul>
              </FieldGroup>

              <FieldGroup legend="Vehicle preference">
                <VehicleGrid
                  name="bk-pref-vehicle"
                  value={prefs.vehicle}
                  onChange={(vehicle) => setPrefs({ vehicle })}
                />
              </FieldGroup>

              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  id={ids.prefBudget}
                  label="Approximate budget (USD)"
                  optional
                  type="number"
                  inputMode="numeric"
                  min={0}
                  description="For the whole trip. A rough figure is fine."
                  value={prefs.budget}
                  onChange={(e) => setPrefs({ budget: e.target.value })}
                  error={errorFor(ids.prefBudget)}
                />
                <TextField
                  id={ids.prefDays}
                  label="Number of days"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={60}
                  value={prefs.days}
                  onChange={(e) => setPrefs({ days: e.target.value })}
                  error={errorFor(ids.prefDays)}
                />
              </div>

              <TextareaField
                id="bk-prefRequests"
                label="Special requests"
                optional
                value={prefs.requests}
                onChange={(e) => setPrefs({ requests: e.target.value })}
                maxLength={2000}
              />
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
