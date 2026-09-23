"use client";

import { useEffect, useRef, useState } from "react";
import { BedDouble, X } from "lucide-react";

import { StayPicker, type StayDestination } from "@/components/accommodation/stay-picker";
import { LinkButton } from "@/components/ui/button";
import { getAccommodationBySlug, getDestinationBySlug } from "@/lib/content";
import { useTripSelections } from "@/lib/trip-selections";
import type { AccommodationTier } from "@/lib/types";

/** Own tiny key: the budget filter is a page preference, not a booking-relevant pick. */
const TIER_STORAGE_KEY = "np.accommodation-tier.v1";

function isTier(value: unknown): value is AccommodationTier {
  return value === "budget" || value === "mid-range" || value === "luxury";
}

/**
 * The standalone accommodation page: budget question, map, "Stay here", and a
 * saved list. Independent of the trip planner, but the stays picked here are
 * shared with the booking form: they are kept in `np.selections.v1`
 * (`useTripSelections`), and `/bookings` reads that on load and carries them
 * into the request so the traveller does not have to re-enter what they
 * already chose here.
 */
export function StaysExplorer({
  destinations,
}: {
  readonly destinations: readonly StayDestination[];
}) {
  const [tier, setTier] = useState<AccommodationTier | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const { selections, setStay } = useTripSelections();
  // Gates the tier write effect so the empty initial state never overwrites a saved tier.
  const hydrated = useRef(false);

  useEffect(() => {
    const restore = () => {
      const raw = window.localStorage.getItem(TIER_STORAGE_KEY);
      const stored: unknown = raw === null ? null : JSON.parse(raw);
      if (isTier(stored)) setTier(stored);
    };
    try {
      restore();
    } catch {
      // Storage throws in private mode; the page still works, just unsaved.
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(tier));
    } catch {
      // Degraded, not an error the visitor can act on.
    }
  }, [tier]);

  const handleStay = (destinationSlug: string, accommodationSlug: string | null) => {
    setStay(destinationSlug, accommodationSlug);
    const name = accommodationSlug ? getAccommodationBySlug(accommodationSlug)?.name : null;
    setAnnouncement(name ? `${name} saved to your list.` : "Stay removed from your list.");
  };

  const chosen = Object.entries(selections.stays);

  return (
    <>
      <div aria-live="polite" className="np-sr-only">
        {announcement}
      </div>

      <StayPicker
        destinations={destinations}
        tier={tier}
        stays={selections.stays}
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-small text-text-meta">
              These will carry into your booking request.
            </p>
            <LinkButton href="/bookings" variant="outline" size="sm">
              Continue to booking
            </LinkButton>
          </div>
        </section>
      ) : null}
    </>
  );
}
