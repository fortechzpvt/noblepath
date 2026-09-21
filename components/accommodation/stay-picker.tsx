"use client";

import { useMemo, useState } from "react";
import { BedDouble, Check, Crown, Gem, Wallet, type LucideIcon } from "lucide-react";

import { StayMap } from "@/components/accommodation/stay-map";
import { Button } from "@/components/ui/button";
import { getAccommodations, getAllAccommodations, getDestinationBySlug } from "@/lib/content";
import { cn } from "@/lib/cn";
import type { AccommodationTier } from "@/lib/types";

export interface StayDestination {
  readonly slug: string;
  readonly name: string;
  /** Nights at this stop. Omitted on the standalone page, where there is no route. */
  readonly nights?: number;
}

/** Slug of the island-wide tab. Not a real destination. */
const ALL = "all";

const TIERS: ReadonlyArray<{
  readonly value: AccommodationTier;
  readonly label: string;
  readonly hint: string;
  readonly Icon: LucideIcon;
}> = [
  { value: "budget", label: "Budget", hint: "Homestays, guesthouses and hostels. Simple, friendly, good value.", Icon: Wallet },
  { value: "mid-range", label: "Mid-range", hint: "Comfortable hotels and boutique stays with a pool or a view.", Icon: Gem },
  { value: "luxury", label: "Luxury", hint: "Heritage hotels, villas and resorts where the stay is the point.", Icon: Crown },
];

/**
 * Accommodation step of the plan builder.
 *
 * Order matters: the budget question comes first, and no property is shown until
 * it is answered. Choosing a tier animates the other two cards away and the
 * stay list and map in. Stays are chosen per destination, one tab each, and
 * "Stay here" reports the choice through `onStay`.
 *
 * The tier cards are a radio group (arrow keys move the choice), and motion is
 * CSS-only so `prefers-reduced-motion` switches it off globally.
 */
export function StayPicker({
  destinations,
  tier,
  stays,
  onTierChange,
  onStay,
}: {
  readonly destinations: readonly StayDestination[];
  readonly tier: AccommodationTier | null;
  /** Chosen accommodation slug per destination slug. */
  readonly stays: Readonly<Record<string, string>>;
  readonly onTierChange: (tier: AccommodationTier) => void;
  readonly onStay: (destinationSlug: string, accommodationSlug: string | null) => void;
}) {
  const [activeDestination, setActiveDestination] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // The first tab shows every stay on the island; the rest narrow to one place.
  const tabs = useMemo<readonly StayDestination[]>(
    () => [{ slug: ALL, name: "All Sri Lanka" }, ...destinations],
    [destinations],
  );
  const current = tabs.find((d) => d.slug === activeDestination) ?? tabs[0] ?? null;

  const options = useMemo(() => {
    if (!current || !tier) return [];
    return current.slug === ALL ? getAllAccommodations(tier) : getAccommodations(current.slug, tier);
  }, [current, tier]);

  const allStays = useMemo(() => getAllAccommodations(), []);
  const chosenSlugs = useMemo(() => Object.values(stays), [stays]);
  const chosenCount = chosenSlugs.length;

  function moveTier(direction: -1 | 1) {
    const index = TIERS.findIndex((t) => t.value === tier);
    const next = TIERS[(index + direction + TIERS.length) % TIERS.length];
    if (next) onTierChange(next.value);
  }

  return (
    <section aria-labelledby="stay-heading">
      <h2 id="stay-heading" className="font-display text-h2 text-ink-900">
        What kind of stay do you want?
      </h2>
      <p className="np-measure-lead mt-3 text-lead text-ink-600">
        Pick a budget first. We will show places to stay on the map, and anything you
        choose is saved to your list.
      </p>

      <div
        role="radiogroup"
        aria-label="Accommodation budget"
        className="mt-6 grid gap-3 md:grid-cols-3"
      >
        {TIERS.map(({ value, label, hint, Icon }) => {
          const selected = tier === value;
          const dimmed = tier !== null && !selected;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (tier === null && value === "budget") ? 0 : -1}
              onClick={() => onTierChange(value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveTier(1);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveTier(-1);
                }
              }}
              className={cn(
                "flex min-h-32 flex-col items-start gap-2 rounded-xl border p-5 text-left",
                "transition-[transform,opacity,background-color,border-color,box-shadow] duration-[var(--dur-4)] ease-[var(--ease-out)]",
                selected
                  ? "scale-[1.02] border-jungle-700 bg-jungle-700 text-white shadow-lg"
                  : "border-border bg-surface text-ink-900 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
                dimmed && "scale-[0.98] opacity-60 hover:opacity-100",
              )}
            >
              <span className="flex w-full items-center justify-between">
                <Icon size={24} aria-hidden />
                {selected ? <Check size={20} aria-hidden className="np-pop" /> : null}
              </span>
              <span className="text-h4">{label}</span>
              <span className={cn("text-body-sm", selected ? "text-white/85" : "text-ink-600")}>
                {hint}
              </span>
            </button>
          );
        })}
      </div>

      {tier === null ? (
        <div className="mt-8">
          <p className="mb-3 text-body-sm text-ink-600">
            All {allStays.length} places we list across Sri Lanka. Pick a budget above to narrow
            them down.
          </p>
          <div className="h-80 lg:h-[28rem]">
            <StayMap
              stays={allStays}
              chosenSlugs={chosenSlugs}
              activeSlug={null}
              onPick={() => undefined}
            />
          </div>
        </div>
      ) : null}

      {tier !== null && current ? (
        // Keyed on tier so a change replays the entrance animation.
        <div key={tier} className="np-fade-up mt-8">
          {tabs.length > 1 ? (
            <div
              role="tablist"
              aria-label="Destinations"
              className="np-rail flex gap-2 pb-1"
            >
              {tabs.map((destination) => {
                const active = destination.slug === current.slug;
                return (
                  <button
                    key={destination.slug}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveDestination(destination.slug)}
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center gap-2 rounded-pill border px-4 text-body-sm",
                      "transition-[background-color,border-color,color] duration-[var(--dur-2)]",
                      active
                        ? "border-jungle-700 bg-jungle-700 font-semibold text-white"
                        : "border-border bg-surface font-medium text-ink-600 hover:border-border-strong hover:bg-sand-100",
                    )}
                  >
                    {destination.name}
                    {destination.nights !== undefined ? (
                      <span className={cn("text-small", active ? "text-white/80" : "text-text-meta")}>
                        {destination.nights} {destination.nights === 1 ? "night" : "nights"}
                      </span>
                    ) : null}
                    {stays[destination.slug] ? (
                      <Check size={16} aria-label="Stay chosen" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {options.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-sand-300 px-6 py-10 text-center">
              <BedDouble size={24} aria-hidden className="mx-auto text-ink-400" />
              <h3 className="mt-3 text-h4 text-ink-900">
                No {TIERS.find((t) => t.value === tier)?.label.toLowerCase()} stays listed
                {current.slug === ALL ? "" : ` in ${current.name}`} yet
              </h3>
              <p className="np-measure-body mx-auto mt-2 text-body-sm text-ink-600">
                Try another budget or another destination.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ul
                aria-label={`${options.length} places to stay in ${current.name}`}
                className="flex flex-col gap-4 lg:max-h-[28rem] lg:overflow-y-auto lg:pr-1"
              >
                {options.map((stay) => {
                  const chosen = stays[stay.destinationSlug] === stay.slug;
                  return (
                    <li
                      key={stay.slug}
                      onMouseEnter={() => setHovered(stay.slug)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(stay.slug)}
                      onBlur={() => setHovered(null)}
                      className={cn(
                        "rounded-xl border bg-surface p-5 transition-[border-color,box-shadow] duration-[var(--dur-3)]",
                        chosen ? "border-jungle-700 shadow-md" : "border-border hover:shadow-sm",
                      )}
                    >
                      <p className="text-small text-text-meta">
                        {stay.kind}
                        {current.slug === ALL ? ` · ${getDestinationBySlug(stay.destinationSlug)?.name ?? ""}` : ""}
                      </p>
                      <h3 className="mt-0.5 text-h4 text-ink-900">{stay.name}</h3>
                      <p className="mt-2 text-body-sm text-ink-700">{stay.summary}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {chosen ? (
                          <>
                            <span className="np-pop inline-flex h-10 items-center gap-2 rounded-pill bg-jungle-50 px-4 text-button text-jungle-700">
                              <Check size={16} aria-hidden />
                              In your plan
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onStay(stay.destinationSlug, null)}
                            >
                              Remove
                              <span className="np-sr-only"> {stay.name} from my plan</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="solid"
                            size="sm"
                            onClick={() => onStay(stay.destinationSlug, stay.slug)}
                          >
                            <BedDouble size={16} aria-hidden />
                            Stay here
                            <span className="np-sr-only">
                              , {stay.name}
                            </span>
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="h-80 lg:sticky lg:top-32 lg:h-[28rem] lg:self-start">
                <StayMap
                  stays={options}
                  chosenSlugs={chosenSlugs}
                  activeSlug={hovered}
                  onPick={(slug) => setHovered(slug)}
                />
              </div>
            </div>
          )}

          <p className="mt-6 text-small text-text-meta" role="status">
            {chosenCount === 0
              ? "Nothing chosen yet."
              : `${chosenCount} ${chosenCount === 1 ? "stay" : "stays"} chosen. Pins are approximate and details are indicative.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
