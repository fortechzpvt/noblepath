"use client";

import { useEffect, useRef, useState } from "react";

import { getAccommodationBySlug } from "@/lib/content";

/**
 * Shared "picked elsewhere" store.
 *
 * The accommodation page and the activities page each let a traveller pick
 * specific items while just browsing, before there is any traveller detail or
 * booking in progress. Those picks are kept here, in `localStorage`, so that
 * when the traveller later opens the booking form it can find them and carry
 * them into the request instead of asking the traveller to re-enter what they
 * already chose.
 *
 * Versioned in the key so an incompatible future shape simply does not
 * collide with this one (the same convention `np.plan.v1` already uses).
 */
const STORAGE_KEY = "np.selections.v1";

export interface TripSelections {
  /** destinationSlug -> the specific accommodation picked there. */
  readonly stays: Readonly<Record<string, string>>;
  /** Slugs from the `/activities` catalogue, in the order picked. */
  readonly activitySlugs: readonly string[];
}

const EMPTY: TripSelections = { stays: {}, activitySlugs: [] };

/**
 * `localStorage` is editable by the visitor, so it is parsed as untrusted
 * input: anything that is not a plain string in the expected shape is
 * dropped rather than trusted. A stay is kept only if the accommodation slug
 * still exists and actually belongs to the destination it is filed under —
 * the same cross-check the old `np.stays.v1` parser made, so a hand-edited
 * or stale entry can't file one destination's stay under another's.
 */
function parse(raw: string): TripSelections | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;

  const stays: Record<string, string> = {};
  if (typeof record.stays === "object" && record.stays !== null) {
    for (const [destination, accommodation] of Object.entries(record.stays)) {
      if (
        typeof accommodation === "string" &&
        getAccommodationBySlug(accommodation)?.destinationSlug === destination
      ) {
        stays[destination] = accommodation;
      }
    }
  }

  const activitySlugs = Array.isArray(record.activitySlugs)
    ? record.activitySlugs.filter((value): value is string => typeof value === "string")
    : [];

  return { stays, activitySlugs };
}

/** Safe, synchronous, one-shot read — for a mount effect elsewhere (e.g. the booking form). */
export function readTripSelections(): TripSelections {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY;
    return parse(raw) ?? EMPTY;
  } catch {
    // Storage throws in private mode; callers just see no selections.
    return EMPTY;
  }
}

function write(selections: TripSelections): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
  } catch {
    // Degraded, not an error the visitor can act on.
  }
}

/**
 * Read/write access to the shared selections, for the accommodation and
 * activities pages. Each page owns one side of the record (`setStay` /
 * `toggleActivity` and `removeActivity`) and leaves the other untouched.
 */
export function useTripSelections() {
  const [selections, setSelections] = useState<TripSelections>(EMPTY);
  // Gates the write effect so the empty initial state never overwrites a saved pick.
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      setSelections(readTripSelections());
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    write(selections);
  }, [selections]);

  const setStay = (destinationSlug: string, accommodationSlug: string | null) => {
    setSelections((current) => {
      const stays = { ...current.stays };
      if (accommodationSlug === null) delete stays[destinationSlug];
      else stays[destinationSlug] = accommodationSlug;
      return { ...current, stays };
    });
  };

  const toggleActivity = (slug: string) => {
    setSelections((current) => {
      const activitySlugs = current.activitySlugs.includes(slug)
        ? current.activitySlugs.filter((value) => value !== slug)
        : [...current.activitySlugs, slug];
      return { ...current, activitySlugs };
    });
  };

  const removeActivity = (slug: string) => {
    setSelections((current) => ({
      ...current,
      activitySlugs: current.activitySlugs.filter((value) => value !== slug),
    }));
  };

  return { selections, setStay, toggleActivity, removeActivity };
}
