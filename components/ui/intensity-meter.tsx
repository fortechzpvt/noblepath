import { cn } from "@/lib/cn";
import type { Intensity } from "@/lib/types";

const FILLED: Record<Intensity, number> = {
  easy: 1,
  moderate: 2,
  challenging: 3,
};

/**
 * Three-segment intensity bar (components.md §5.2).
 *
 * Decorative and `aria-hidden` — the text label beside it is what carries the
 * meaning. Colour is never the only signal.
 */
export function IntensityMeter({ intensity }: { readonly intensity: Intensity }) {
  const filled = FILLED[intensity];
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "h-1 w-3 rounded-xs",
            index < filled ? "bg-jungle-600" : "bg-sand-200",
          )}
        />
      ))}
    </span>
  );
}
