"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BedDouble, X } from "lucide-react";

import { StayPicker, type StayDestination } from "@/components/accommodation/stay-picker";
import { getAccommodationBySlug, getDestinationBySlug } from "@/lib/content";
import type { AccommodationTier } from "@/lib/types";

/** Versioned in the key so an incompatible future shape simply never collides. */
const STORAGE_KEY = "np.stays.v1";

interface Stored {
  readonly tier: AccommodationTier | null;
  readonly stays: Readonly<Record<string, string>>;
}

function isTier(value: unknown): value is AccommodationTier {
  return value === "budget" || value === "mid-range" || value === "luxury";
}

/**
 * localStorage is editable by the visitor, so it is parsed as untrusted input:
 * a stay is only kept if it exists and belongs to the destination it is filed under.
 */
function parse(raw: string): Stored | null {
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
    for (const [destination, stay] of Object.entries(record.stays)) {
      if (typeof stay === "string" && getAccommodationBySlug(stay)?.destinationSlug === destination) {
        stays[destination] = stay;
      }
    }
  }
  return { tier: isTier(record.tier) ? record.tier : null, stays };
}

/**
 * The standalone accommodation page: budget question, map, "Stay here", and a
 * saved list. It is independent of the trip planner and of bookings; picks live
 * only in this browser.
 */
export function StaysExplorer({
  destinations,
}: {
  readonly destinations: readonly StayDestination[];
}) {
  const [tier, setTier] = useState<AccommodationTier | null>(null);
  const [stays, setStays] = useState<Readonly<Record<string, string>>>({});
  const [announcement, setAnnouncement] = useState("");
  // Gates the write effect so the empty initial state never overwrites saved picks.
  const hydrated = useRef(false);

  useEffect(() => {
    const restore = (stored: Stored) => {
      setTier(stored.tier);
      setStays(stored.stays);
    };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const stored = raw === null ? null : parse(raw);
      if (stored) restore(stored);
    } catch {
      // Storage throws in private mode; the page still works, just unsaved.
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tier, stays }));
    } catch {
      // Degraded, not an error the visitor can act on.
    }
  }, [tier, stays]);

  const handleStay = useCallback((destinationSlug: string, accommodationSlug: string | null) => {
    setStays((previous) => {
      const next = { ...previous };
      if (accommodationSlug === null) delete next[destinationSlug];
      else next[destinationSlug] = accommodationSlug;
      return next;
    });
    const name = accommodationSlug ? getAccommodationBySlug(accommodationSlug)?.name : null;
    setAnnouncement(name ? `${name} saved to your list.` : "Stay removed from your list.");
  }, []);

  const chosen = Object.entries(stays);

  return (
    <>
      <div aria-live="polite" className="np-sr-only">
        {announcement}
      </div>

      <StayPicker
        destinations={destinations}
        tier={tier}
        stays={stays}
        onTierChange={setTier}
        onStay={handleStay}
      />

      {chosen.length > 0 ? (
        <section aria-labelledby="your-stays-heading" className="mt-14">
          <h2 id="your-stays-heading" className="flex items-center gap-2 text-h3 text-ink-900">
            <BedDouble size={24} aria-hidden className="text-jungle-600" />
            Your stays
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {chosen.map(([destinationSlug, staySlug]) => {
              const stay = getAccommodationBySlug(staySlug);
              if (!stay) return null;
              return (
                <li
                  key={destinationSlug}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <div>
                    <p className="text-small text-text-meta">
                      {getDestinationBySlug(destinationSlug)?.name ?? destinationSlug} · {stay.kind}
                    </p>
                    <p className="text-h5 text-ink-900">{stay.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStay(destinationSlug, null)}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-600 hover:bg-sand-100"
                  >
                    <X size={18} aria-hidden />
                    <span className="np-sr-only">Remove {stay.name} from my stays</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
