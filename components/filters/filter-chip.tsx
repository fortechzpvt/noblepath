import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Filter chips (components.md §9).
 *
 * Presentational only — the chips are driven by whichever filter bar renders
 * them, and every filter bar on this site writes its state to the URL rather
 * than to React state (ADR: URL-driven filtering).
 *
 * The visual chip is 40 px tall; the `::after` overlay extends the hit area to
 * 44 px without scaling the glyph or the label (accessibility.md §5).
 */
const chipBase = [
  "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill px-4",
  "text-body-sm font-medium",
  "transition-[background-color,border-color,color] duration-[var(--dur-2)] ease-[var(--ease-standard)]",
  "after:absolute after:inset-x-0 after:-top-0.5 after:-bottom-0.5 after:content-['']",
].join(" ");

export function FilterChip({
  children,
  selected = false,
  count,
  disabled = false,
  onClick,
  className,
}: {
  readonly children: ReactNode;
  readonly selected?: boolean;
  /** Results this chip would produce. Shown so a chip is never a blind guess. */
  readonly count?: number;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        chipBase,
        "border",
        count === undefined ? undefined : "pr-3",
        selected
          ? "border-jungle-700 bg-jungle-700 font-semibold text-white hover:bg-jungle-600"
          : "border-border bg-surface text-ink-600 hover:border-sand-300 hover:bg-sand-100 hover:text-ink-900 active:bg-sand-200",
        disabled &&
          "cursor-not-allowed border-border bg-sand-100 text-ink-400 hover:border-border hover:bg-sand-100 hover:text-ink-400",
        className,
      )}
    >
      {/* Selection is carried by the check glyph and `aria-pressed`, never by
          the fill colour alone (accessibility.md §2.4). */}
      {selected ? <Check size={16} aria-hidden /> : null}
      <span>{children}</span>
      {count === undefined ? null : (
        <span
          className={cn("text-small tabular-nums", selected ? "text-white/80" : "text-ink-500")}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** A filter that is currently applied, removable from the summary row (§9.4). */
export function AppliedFilterChip({
  label,
  onRemove,
}: {
  readonly label: string;
  readonly onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Remove filter: ${label}`}
      onClick={onRemove}
      className={cn(
        chipBase,
        "border border-jungle-200 bg-jungle-50 pr-3 text-jungle-700",
        "hover:border-jungle-600 hover:bg-jungle-200",
      )}
    >
      <span>{label}</span>
      <X size={16} aria-hidden />
    </button>
  );
}

/** The ghost "Clear all" chip that appears once at least one filter is applied (§9.3). */
export function ClearFiltersChip({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        chipBase,
        "text-ink-800 underline-offset-4 hover:bg-ink-900/[0.06] hover:underline",
      )}
    >
      Clear all
    </button>
  );
}

/**
 * A labelled set of chips.
 *
 * `role="group"` + `aria-labelledby` is what tells a screen-reader user which
 * dimension a chip belongs to; without it the row is an undifferentiated list
 * of toggle buttons. The id is passed in rather than generated so the component
 * stays usable from a server component.
 */
export function ChipGroup({
  id,
  label,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div role="group" aria-labelledby={`${id}-label`} className="min-w-0">
      <p id={`${id}-label`} className="text-overline uppercase text-jungle-600">
        {label}
      </p>
      {/* Scrolls horizontally below 1024 (§9.3) and wraps above it. The vertical
          padding keeps the focus ring from being clipped by the scroll box. */}
      <ul
        className={cn(
          "mt-2 flex gap-2 overflow-x-auto py-1 lg:flex-wrap lg:overflow-x-visible",
          "snap-x scroll-px-1 lg:snap-none [&>li]:snap-start",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children}
      </ul>
    </div>
  );
}
