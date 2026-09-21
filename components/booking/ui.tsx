import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** White card used for every block of the form, matching the plan intake cards. */
export function Card({
  title,
  description,
  children,
  className,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface p-6 shadow-sm md:p-8",
        className,
      )}
    >
      <h2 className="text-h4 text-ink-900">{title}</h2>
      {description ? <p className="mt-1.5 text-small text-text-meta">{description}</p> : null}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  );
}

const chipBase =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-body-sm " +
  "transition-[background-color,border-color,color] duration-[var(--dur-2)] ease-[var(--ease-standard)]";
const chipOff =
  "border-border bg-surface font-medium text-ink-600 hover:border-border-strong hover:bg-sand-100 hover:text-ink-900";
const chipChecked =
  "peer-checked:border-jungle-700 peer-checked:bg-jungle-700 peer-checked:font-semibold peer-checked:text-white " +
  "peer-checked:hover:border-jungle-600 peer-checked:hover:bg-jungle-600 peer-checked:hover:text-white " +
  "peer-focus-visible:shadow-[var(--focus-ring)]";

/** A checkbox or radio drawn as a pill. The native input stays for keyboard and screen readers. */
export function Chip({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  readonly type: "checkbox" | "radio";
  readonly name?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type={type}
        {...(name ? { name } : {})}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="np-sr-only peer"
      />
      <span className={cn(chipBase, chipOff, chipChecked)}>{children}</span>
    </label>
  );
}

/** A repeatable entry (a stay, an activity, a transport) with its own remove button. */
export function Entry({
  legend,
  onRemove,
  removeLabel,
  children,
}: {
  readonly legend: string;
  readonly onRemove: () => void;
  readonly removeLabel: string;
  readonly children: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-lg border border-border bg-sand-50 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-body-sm font-semibold text-ink-900">{legend}</legend>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="inline-flex min-h-11 items-center rounded-xs px-2 text-body-sm text-jungle-600 underline underline-offset-4"
        >
          Remove
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}
