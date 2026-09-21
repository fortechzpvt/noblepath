import { AlertTriangle, ArrowDown, ArrowUp, BedDouble, Car, MapPin, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import type { ItineraryDay as ItineraryDayModel } from "@/lib/types";

const controlClass =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-pill border border-border " +
  "bg-surface px-3 text-small font-medium text-ink-700 " +
  "transition-[background-color,border-color,color] duration-[var(--dur-2)] ease-[var(--ease-standard)] " +
  "hover:border-border-strong hover:bg-sand-100 hover:text-ink-900 " +
  "disabled:cursor-not-allowed disabled:border-sand-200 disabled:bg-sand-100 disabled:text-ink-400";

/**
 * One generated day in the plan builder (components.md §10, editable variant).
 *
 * Reordering is exposed as two ordinary buttons rather than a drag handle.
 * Drag-only reordering is unusable by keyboard and by anyone with a motor
 * impairment, and components.md §10.5 makes the keyboard equivalent
 * build-blocking; two buttons are the equivalent, so they are the control.
 *
 * Each control's accessible name carries the day number, because "Remove" on its
 * own is ambiguous across fourteen identical-looking blocks.
 */
export function ItineraryDay({
  day,
  position,
  total,
  destinationName,
  overnightName,
  driveFromName,
  experienceNames,
  onMoveEarlier,
  onMoveLater,
  onRemove,
}: {
  readonly day: ItineraryDayModel;
  /** 1-based position after the traveller's edits — not `day.day`. */
  readonly position: number;
  readonly total: number;
  readonly destinationName: string;
  readonly overnightName: string | null;
  readonly driveFromName: string | null;
  readonly experienceNames: readonly string[];
  readonly onMoveEarlier: () => void;
  readonly onMoveLater: () => void;
  readonly onRemove: () => void;
}) {
  const headingId = `plan-day-${day.day}-heading`;

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "rounded-xl border bg-surface p-[var(--card-pad)] shadow-sm",
        day.isLongDrive ? "border-warning-200" : "border-border",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-jungle-700 text-small font-semibold text-white"
        >
          {position}
        </span>

        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-h4 text-ink-900">
            <span className="np-sr-only">
              Day {position} of {total}:{" "}
            </span>
            <span aria-hidden className="text-text-meta">
              Day {position} ·{" "}
            </span>
            {day.title}
          </h3>

          <p className="mt-1.5 flex items-center gap-1.5 text-small text-text-meta">
            <MapPin size={16} aria-hidden />
            {destinationName}
          </p>

          <p className="np-measure-body mt-3 text-body-sm text-ink-700">{day.summary}</p>

          {experienceNames.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {experienceNames.map((name) => (
                <li
                  key={name}
                  className="inline-flex items-center rounded-pill bg-jungle-50 px-3 py-1.5 text-small text-jungle-700"
                >
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-small text-text-meta">
              Nothing booked this day — a rest day, or time to wander.
            </p>
          )}

          <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-small text-text-meta">
            <li className="flex items-center gap-1.5">
              <Car size={16} aria-hidden />
              {day.driveMinutes > 0
                ? `${driveFromName ? `${driveFromName} → ${destinationName}, ` : ""}about ${formatDuration(day.driveMinutes)}`
                : "No transfer today"}
            </li>
            <li className="flex items-center gap-1.5">
              <BedDouble size={16} aria-hidden />
              {overnightName ? `Overnight in ${overnightName}` : "Departure day"}
            </li>
          </ul>

          {day.isLongDrive ? (
            <p className="mt-3 flex items-start gap-2 rounded-sm bg-warning-50 px-3 py-2 text-small text-warning-700">
              <AlertTriangle size={16} aria-hidden className="mt-px shrink-0" />
              <span>
                Long drive. This day is mostly travel — worth splitting, or worth accepting
                deliberately.
              </span>
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMoveEarlier}
              disabled={position === 1}
              className={controlClass}
            >
              <ArrowUp size={16} aria-hidden />
              <span aria-hidden className="hidden lg:inline">
                Earlier
              </span>
              <span className="np-sr-only">Move day {position} earlier</span>
            </button>

            <button
              type="button"
              onClick={onMoveLater}
              disabled={position === total}
              className={controlClass}
            >
              <ArrowDown size={16} aria-hidden />
              <span aria-hidden className="hidden lg:inline">
                Later
              </span>
              <span className="np-sr-only">Move day {position} later</span>
            </button>

            <button
              type="button"
              onClick={onRemove}
              className={cn(controlClass, "hover:border-error-200 hover:bg-error-50 hover:text-error-600")}
            >
              <Trash2 size={16} aria-hidden />
              <span aria-hidden className="hidden lg:inline">
                Remove
              </span>
              <span className="np-sr-only">
                Remove day {position}, {day.title}
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
