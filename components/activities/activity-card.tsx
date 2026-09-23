import { Check, Clock, MapPin, Plus, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IntensityMeter } from "@/components/ui/intensity-meter";
import type { Activity } from "@/content/activities";
import { formatIntensity, formatPriceBand } from "@/lib/format";

/**
 * Activity card: name, location, duration, difficulty and an indicative price
 * band. The band is a label, never a figure (requirements §7.4). "Add to my
 * trip" saves the pick so it can carry into the booking form later.
 */
export function ActivityCard({
  activity,
  selected,
  onToggle,
}: {
  readonly activity: Activity;
  readonly selected: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-h5 text-ink-900">{activity.name}</h3>

      <dl className="flex flex-col gap-2.5 text-body-sm text-ink-700">
        <div className="flex items-start gap-2.5">
          <MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
          <div>
            <dt className="np-sr-only">Location</dt>
            <dd>{activity.location}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock size={18} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
          <div>
            <dt className="np-sr-only">Duration</dt>
            <dd>{activity.duration}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="mt-2 shrink-0 text-jungle-600">
            <IntensityMeter intensity={activity.difficulty} />
          </span>
          <div>
            <dt className="np-sr-only">Difficulty</dt>
            <dd>{formatIntensity(activity.difficulty)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Wallet size={18} aria-hidden className="mt-0.5 shrink-0 text-jungle-600" />
          <div>
            <dt className="np-sr-only">Price</dt>
            <dd>{formatPriceBand(activity.priceBand)}</dd>
          </div>
        </div>
      </dl>

      <Button
        type="button"
        size="sm"
        variant={selected ? "solid" : "outline"}
        aria-pressed={selected}
        onClick={onToggle}
        className="mt-auto"
      >
        {selected ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
        {selected ? "Added to my trip" : "Add to my trip"}
      </Button>
    </article>
  );
}
