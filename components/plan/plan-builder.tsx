"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Car, Info, MapPin, Route, RotateCcw, Undo2 } from "lucide-react";

import { ItineraryDay } from "@/components/plan/itinerary-day";
import { PlanIntake } from "@/components/plan/plan-intake";
import { TransferPicker } from "@/components/transfers/transfer-picker";
import { Button, LinkButton } from "@/components/ui/button";
import { getDestinationBySlug, getExperienceBySlug } from "@/lib/content";
import { formatDuration, interestName, regionName } from "@/lib/format";
import { generateItinerary } from "@/lib/itinerary";
import { PLAN_STORAGE_KEY, parseStoredPlan, type StoredPlan } from "@/lib/plan-storage";
import type { Itinerary, PlanInput, Region } from "@/lib/types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function describeClamping(itinerary: Itinerary, requested: PlanInput): readonly string[] {
  const notes: string[] = [];
  const resolved = itinerary.input;

  if (resolved.days !== requested.days) {
    notes.push(
      `You asked for ${requested.days} days; we planned ${resolved.days}, which is the range this planner covers.`,
    );
  }
  if (resolved.arrivalMonth !== requested.arrivalMonth) {
    notes.push(
      `We used ${MONTH_NAMES[resolved.arrivalMonth - 1] ?? "a default month"} as your arrival month.`,
    );
  }
  if (resolved.interests.length !== requested.interests.length) {
    notes.push(
      resolved.interests.length === 0
        ? "We could not use the interests you picked, so this route is the island's strongest places."
        : `We planned around ${resolved.interests.map((interest) => interestName(interest)).join(", ")}.`,
    );
  }
  return notes;
}

/**
 * The itinerary builder (FR-4, page-specs §6).
 *
 * The only client component on `/plan`. It holds three things: the traveller's
 * answers, the order of days after their edits, and nothing else — the itinerary
 * itself is derived by `generateItinerary`, which is pure, so a stored plan is
 * re-created from the answers rather than restored from a stale snapshot
 * (FR-4.4). That is why edits are stored as a list of original day numbers and
 * dropped when the engine version changes: the answers survive an algorithm
 * change, a snapshot would not.
 */
export function PlanBuilder() {
  const [input, setInput] = useState<PlanInput | null>(null);
  const [dayOrder, setDayOrder] = useState<readonly number[] | null>(null);
  const [restored, setRestored] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [editingAnswers, setEditingAnswers] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<{
    readonly day: number;
    readonly index: number;
  } | null>(null);

  // `hydrated` gates the write effect. Without it the first render would persist
  // the empty initial state over a plan that is still being read back.
  const hydrated = useRef(false);
  const planHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Reading localStorage and applying what it holds are both genuinely
    // effect work (an external store), so the state updates below are named
    // callbacks invoked from the effect rather than bare statements in its
    // body — each is a single, deliberate sync point, not cascading renders.
    const restore = () => {
      const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (raw === null) return;
      const stored = parseStoredPlan(raw);
      if (!stored) return;
      const engineVersion = generateItinerary(stored.input).engineVersion;
      setInput(stored.input);
      // An engine change invalidates positional edits but not the answers.
      setDayOrder(stored.engineVersion === engineVersion ? stored.dayOrder : null);
      setRestored(true);
    };
    const markUnavailable = () => setStorageAvailable(false);

    try {
      restore();
    } catch {
      // Storage throws in private mode and inside some embedded browsers. The
      // planner must keep working without it, so this is a degraded feature,
      // not an error the traveller needs to act on.
      markUnavailable();
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current || input === null) return;
    const markUnavailable = () => setStorageAvailable(false);
    try {
      const payload: StoredPlan = {
        input,
        engineVersion: generateItinerary(input).engineVersion,
        dayOrder,
      };
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      markUnavailable();
    }
  }, [input, dayOrder]);

  const itinerary = useMemo(
    () => (input === null ? null : generateItinerary(input)),
    [input],
  );

  const days = useMemo(() => {
    if (itinerary === null) return [];
    if (dayOrder === null) return itinerary.days;
    return dayOrder
      .map((dayNumber) => itinerary.days.find((day) => day.day === dayNumber))
      .filter((day) => day !== undefined);
  }, [itinerary, dayOrder]);

  const currentOrder = useMemo(() => days.map((day) => day.day), [days]);

  const handleGenerate = useCallback((next: PlanInput) => {
    const generated = generateItinerary(next);
    setInput(next);
    setDayOrder(null);
    setLastRemoved(null);
    setRestored(false);
    setEditingAnswers(false);
    setAnnouncement(
      `Your ${generated.input.days}-day plan is ready. ${generated.destinationSlugs.length} destinations across ${generated.regions.length} regions.`,
    );
    // Move the eye and the screen reader to the plan, not back to the top.
    window.requestAnimationFrame(() => planHeadingRef.current?.focus());
  }, []);

  const move = useCallback(
    (dayNumber: number, direction: -1 | 1) => {
      const from = currentOrder.indexOf(dayNumber);
      const to = from + direction;
      if (from === -1 || to < 0 || to >= currentOrder.length) return;

      const next = [...currentOrder];
      const moved = next[from];
      const displaced = next[to];
      if (moved === undefined || displaced === undefined) return;
      next[from] = displaced;
      next[to] = moved;

      setDayOrder(next);
      setLastRemoved(null);
      setAnnouncement(
        `Moved ${direction === -1 ? "earlier" : "later"}. Now day ${to + 1} of ${next.length}.`,
      );
    },
    [currentOrder],
  );

  const remove = useCallback(
    (dayNumber: number) => {
      const index = currentOrder.indexOf(dayNumber);
      if (index === -1) return;
      const next = currentOrder.filter((value) => value !== dayNumber);
      setDayOrder(next);
      setLastRemoved({ day: dayNumber, index });
      setAnnouncement(
        `Day removed. ${next.length} ${next.length === 1 ? "day" : "days"} remain. You can undo this.`,
      );
    },
    [currentOrder],
  );

  const undoRemove = useCallback(() => {
    if (lastRemoved === null) return;
    const next = [...currentOrder];
    next.splice(lastRemoved.index, 0, lastRemoved.day);
    setDayOrder(next);
    setLastRemoved(null);
    setAnnouncement(`Day restored at position ${lastRemoved.index + 1}.`);
  }, [currentOrder, lastRemoved]);

  const resetEdits = useCallback(() => {
    setDayOrder(null);
    setLastRemoved(null);
    setAnnouncement("Your edits were undone. This is the route as we generated it.");
  }, []);

  const destinationNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const day of days) {
      const destination = getDestinationBySlug(day.destinationSlug);
      if (destination) names[day.destinationSlug] = destination.name;
    }
    return names;
  }, [days]);

  const totalDriveMinutes = days.reduce((total, day) => total + day.driveMinutes, 0);

  const visibleDestinations = useMemo(() => {
    const slugs: string[] = [];
    for (const day of days) {
      if (!slugs.includes(day.destinationSlug)) slugs.push(day.destinationSlug);
    }
    return slugs;
  }, [days]);

  const visibleRegions = useMemo(() => {
    const regions: Region[] = [];
    for (const slug of visibleDestinations) {
      const destination = getDestinationBySlug(slug);
      if (destination && !regions.includes(destination.region)) regions.push(destination.region);
    }
    return regions;
  }, [visibleDestinations]);

  const edited = dayOrder !== null;
  const longDriveDays = days.filter((day) => day.isLongDrive).length;
  const clampNotes = itinerary && input ? describeClamping(itinerary, input) : [];

  return (
    <>
      {/* One polite region for every change the traveller makes. Assertive would
          interrupt them mid-sentence for what are all non-urgent updates. */}
      <div aria-live="polite" className="np-sr-only">
        {announcement}
      </div>

      {itinerary === null || editingAnswers ? (
        <div className="mx-auto max-w-[var(--container-prose)]">
          {itinerary === null ? (
            <div className="mb-8">
              <h2 className="font-display text-h2 text-ink-900">
                Three questions, then a route
              </h2>
              <p className="np-measure-lead mt-3 text-lead text-ink-600">
                No account, no email address. Your answers stay in this browser, and you can
                change every day of the result afterwards.
              </p>
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="font-display text-h2 text-ink-900">Change your answers</h2>
              <p className="np-measure-lead mt-3 text-lead text-ink-600">
                Rebuilding replaces the current route, including any days you moved or
                removed.
              </p>
              <button
                type="button"
                onClick={() => setEditingAnswers(false)}
                className="mt-4 inline-flex min-h-11 items-center rounded-xs text-body-sm text-jungle-600 underline underline-offset-4"
              >
                Keep the plan I have
              </button>
            </div>
          )}

          <PlanIntake
            {...(input ? { initialInput: input } : {})}
            onSubmit={handleGenerate}
            submitLabel={itinerary === null ? "Build my plan" : "Rebuild my plan"}
          />
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-12">
          <div>
            <h2
              ref={planHeadingRef}
              tabIndex={-1}
              className="font-display text-h2 text-ink-900"
            >
              Your {days.length}-day Sri Lanka
            </h2>
            <p className="np-measure-lead mt-3 text-lead text-ink-600">
              {visibleDestinations.length} destinations across{" "}
              {visibleRegions.length === 1
                ? "one region"
                : `${visibleRegions.length} regions`}
              , arriving in {MONTH_NAMES[itinerary.input.arrivalMonth - 1]}.
            </p>

            {restored ? (
              <p
                role="status"
                className="mt-5 flex items-start gap-2 rounded-lg bg-jungle-50 px-4 py-3 text-body-sm text-jungle-700"
              >
                <Info size={20} aria-hidden className="mt-0.5 shrink-0" />
                <span>
                  We found the plan you built here last time and rebuilt it from your answers.
                </span>
              </p>
            ) : null}

            {clampNotes.length > 0 ? (
              <div className="mt-5 rounded-lg bg-jungle-50 px-4 py-3 text-body-sm text-jungle-700">
                <p className="flex items-start gap-2">
                  <Info size={20} aria-hidden className="mt-0.5 shrink-0" />
                  <span>We adjusted what you asked for:</span>
                </p>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-9">
                  {clampNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!storageAvailable ? (
              <p
                role="status"
                className="mt-5 flex items-start gap-2 rounded-lg bg-warning-50 px-4 py-3 text-body-sm text-warning-700"
              >
                <AlertTriangle size={20} aria-hidden className="mt-0.5 shrink-0" />
                <span>
                  This browser will not let us save your plan on this device — private
                  browsing usually causes that. Everything still works, but the plan will be
                  gone when you close the tab.
                </span>
              </p>
            ) : null}

            {lastRemoved !== null ? (
              <div
                role="status"
                className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-body-sm text-ink-700"
              >
                <span>A day was removed from your plan.</span>
                <Button type="button" variant="outline" size="sm" onClick={undoRemove}>
                  <Undo2 size={16} aria-hidden />
                  Undo
                </Button>
              </div>
            ) : null}

            {days.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-sand-300 px-6 py-12 text-center">
                <h3 className="text-h3 text-ink-900">There is nothing left in this plan</h3>
                <p className="np-measure-lead mx-auto mt-3 text-body text-ink-600">
                  You have removed every day. Put them back, or answer the questions again
                  for a different route.
                </p>
                <div className="mt-6 flex flex-col items-center gap-3 md:flex-row md:justify-center">
                  <Button type="button" variant="solid" size="md" onClick={resetEdits}>
                    Restore the original route
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setEditingAnswers(true)}
                  >
                    Change my answers
                  </Button>
                </div>
              </div>
            ) : (
              <ol aria-label="Your itinerary" className="mt-8 flex flex-col gap-6 lg:gap-8">
                {days.map((day, index) => (
                  <li key={day.day}>
                    <ItineraryDay
                      day={day}
                      position={index + 1}
                      total={days.length}
                      destinationName={
                        destinationNames[day.destinationSlug] ?? day.destinationSlug
                      }
                      overnightName={
                        day.overnightIn
                          ? (getDestinationBySlug(day.overnightIn)?.name ?? day.overnightIn)
                          : null
                      }
                      driveFromName={
                        day.driveFromSlug
                          ? (getDestinationBySlug(day.driveFromSlug)?.name ??
                            day.driveFromSlug)
                          : null
                      }
                      experienceNames={day.experienceSlugs
                        .map((slug) => getExperienceBySlug(slug)?.name)
                        .filter((name) => name !== undefined)}
                      onMoveEarlier={() => move(day.day, -1)}
                      onMoveLater={() => move(day.day, 1)}
                      onRemove={() => remove(day.day)}
                    />
                  </li>
                ))}
              </ol>
            )}

            {edited && days.length > 0 ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <p className="text-small text-text-meta">
                  You have changed this route. Driving estimates below were measured on the
                  order we generated.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={resetEdits}>
                  <RotateCcw size={16} aria-hidden />
                  Undo my changes
                </Button>
              </div>
            ) : null}

            <section aria-labelledby="plan-transfers-heading" className="mt-12">
              <h2 id="plan-transfers-heading" className="font-display text-h3 text-ink-900">
                Transfers &amp; vehicle
              </h2>
              <TransferPicker className="mt-5" />
            </section>
          </div>

          <aside
            aria-labelledby="plan-summary-heading"
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <div className="rounded-xl border border-border bg-surface p-6 shadow-md">
              <h2 id="plan-summary-heading" className="text-h4 text-ink-900">
                This plan at a glance
              </h2>

              <dl className="mt-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Route size={20} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
                  <div>
                    <dt className="text-small text-text-meta">Length</dt>
                    <dd className="text-h5 text-ink-900">
                      {days.length} {days.length === 1 ? "day" : "days"}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={20} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
                  <div>
                    <dt className="text-small text-text-meta">Where you go</dt>
                    <dd className="text-h5 text-ink-900">
                      {visibleDestinations.length} destinations
                    </dd>
                    <dd className="mt-1 text-small text-text-meta">
                      {visibleRegions.map((region) => regionName(region)).join(" · ")}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Car size={20} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
                  <div>
                    <dt className="text-small text-text-meta">Estimated driving</dt>
                    <dd className="text-h5 text-ink-900">
                      About {formatDuration(totalDriveMinutes)}
                    </dd>
                    <dd className="mt-1 text-small text-text-meta">
                      {longDriveDays === 0
                        ? "No day is over five hours on the road."
                        : `${longDriveDays} ${longDriveDays === 1 ? "day is" : "days are"} over five hours on the road.`}
                    </dd>
                  </div>
                </div>
              </dl>

              {itinerary.warnings.length > 0 ? (
                <div className="mt-6 rounded-lg bg-warning-50 p-4">
                  <h3 className="flex items-start gap-2 text-h5 text-warning-700">
                    <AlertTriangle size={20} aria-hidden className="mt-0.5 shrink-0" />
                    Worth knowing
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2 text-body-sm text-warning-700">
                    {itinerary.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                <LinkButton
                  href="/bookings?type=custom-plan"
                  variant="solid"
                  size="md"
                  className="w-full"
                >
                  Enquire about this plan
                </LinkButton>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => setEditingAnswers(true)}
                >
                  Change my answers
                </Button>
              </div>

              <p className="mt-4 text-small text-text-meta">
                Enquiring costs nothing and commits nothing. We reply with availability and a
                real price — the bands on this site are indicative.{" "}
                <Link
                  href="/about#how-we-plan"
                  className="rounded-xs text-jungle-600 underline underline-offset-4"
                >
                  How we plan
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
