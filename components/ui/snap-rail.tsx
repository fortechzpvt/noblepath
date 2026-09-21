import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Horizontal snap rail used by the home-page previews.
 *
 * Keyboard-scrollable: the container is focusable and carries a group label, so
 * a keyboard user can reach and scroll it without a pointer (components.md §2.4).
 * The negative inline margin lets items bleed to the viewport edge while the
 * first item still aligns to the page gutter.
 *
 * Callers supply their own `<li>` elements so they control per-item width.
 */
export function SnapRail({
  children,
  label,
  className,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly className?: string;
}) {
  return (
    <ul
      role="group"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "np-rail -mx-[var(--gutter)] flex gap-[var(--grid-gap)] px-[var(--gutter)] pt-1 pb-2",
        className,
      )}
    >
      {children}
    </ul>
  );
}
