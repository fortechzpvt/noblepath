import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Page gutter + max width. `.np-container` carries the responsive gutter from the
 * design system so the value lives in exactly one place.
 */
export function Container({
  children,
  wide = false,
  className,
}: {
  readonly children: ReactNode;
  readonly wide?: boolean;
  readonly className?: string;
}) {
  return (
    <div className={cn(wide ? "np-container-wide" : "np-container", className)}>{children}</div>
  );
}

/** Vertical section rhythm, driven by the responsive `--section-y` token. */
export function Section({
  children,
  tight = false,
  className,
  id,
}: {
  readonly children: ReactNode;
  readonly tight?: boolean;
  readonly className?: string;
  readonly id?: string;
}) {
  return (
    <section id={id} className={cn(tight ? "np-section-tight" : "np-section", className)}>
      {children}
    </section>
  );
}

/**
 * The standard section heading block: an overline, a display heading, an optional
 * lead paragraph and an optional trailing action.
 *
 * `onDark` switches the type to the on-image tokens rather than inverting colours
 * ad hoc at each call site.
 */
export function SectionHeading({
  overline,
  title,
  lead,
  action,
  onDark = false,
  className,
}: {
  readonly overline?: string;
  readonly title: ReactNode;
  readonly lead?: string;
  readonly action?: ReactNode;
  readonly onDark?: boolean;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10",
        className,
      )}
    >
      <div className="np-measure-lead">
        {overline ? (
          <p
            className={cn(
              "text-overline uppercase",
              onDark ? "np-on-image-secondary" : "text-jungle-600",
            )}
          >
            {overline}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-display text-h2",
            overline ? "mt-3" : undefined,
            onDark ? "np-on-image" : "text-ink-900",
          )}
        >
          {title}
        </h2>
        {lead ? (
          <p
            className={cn(
              "mt-4 text-lead",
              onDark ? "np-on-image-secondary" : "text-ink-600",
            )}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
