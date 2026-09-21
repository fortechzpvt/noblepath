import Link from "next/link";
import { Car, Plane, Ship, TrainFront } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatDuration } from "@/lib/format";
import type { TravelMode } from "@/lib/types";

/** One resolved journey from this destination to a neighbour. */
export interface TravelConnection {
  readonly slug: string;
  readonly name: string;
  readonly minutes: number;
  readonly mode: TravelMode;
  readonly note?: string;
}

const MODES: Readonly<Record<TravelMode, { readonly heading: string; readonly icon: LucideIcon }>> =
  {
    road: { heading: "By road", icon: Car },
    train: { heading: "By train", icon: TrainFront },
    boat: { heading: "By boat", icon: Ship },
    flight: { heading: "By air", icon: Plane },
  };

// Road first: it is how nearly every transfer on the island is actually made.
const MODE_ORDER: readonly TravelMode[] = ["road", "train", "boat", "flight"];

/**
 * "Getting there and around" (page-specs.md §3 S4).
 *
 * Journey times are advisory estimates from typical road conditions rather than
 * a live routing API (requirements §7.5), which is why the panel says so in
 * plain words instead of presenting them as precise figures.
 */
export function TravelLinks({
  connections,
  originName,
}: {
  readonly connections: readonly TravelConnection[];
  readonly originName: string;
}) {
  const groups = MODE_ORDER.map((mode) => ({
    mode,
    items: connections
      .filter((connection) => connection.mode === mode)
      .sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const { heading, icon: Icon } = MODES[group.mode];
        return (
          <section key={group.mode} aria-labelledby={`travel-${group.mode}`}>
            <h3
              id={`travel-${group.mode}`}
              className="flex items-center gap-2 font-display text-h4 text-ink-900"
            >
              <Icon size={20} aria-hidden className="text-jungle-600" />
              {heading}
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {group.items.map((item) => (
                <li key={item.slug} className="border-b border-border pb-3 last:border-0">
                  <p className="flex flex-wrap items-center justify-between gap-x-4">
                    <Link
                      href={`/destinations/${item.slug}`}
                      className="inline-flex min-h-11 items-center rounded-sm text-body font-medium text-ink-900 underline-offset-4 hover:text-jungle-700 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="text-small tabular-nums text-text-meta">
                      {formatDuration(item.minutes)}
                      <span className="np-sr-only"> journey from {originName}</span>
                    </span>
                  </p>
                  {item.note ? (
                    <p className="mt-1 text-small text-ink-600">{item.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
