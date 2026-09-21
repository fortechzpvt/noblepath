import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Empty state (components.md §14).
 *
 * Always offers a way out: user-flows.md §7 rule 9 — "no dead ends". A blank
 * grid with no explanation and no action is a specification violation, so
 * `actions` is required rather than optional.
 *
 * `headingLevel` keeps the page outline correct: the empty state replaces a
 * grid that sits under a section heading, so it is usually an `<h3>`.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  actions,
  headingLevel = "h3",
  className,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly actions: ReactNode;
  readonly headingLevel?: "h2" | "h3";
  readonly className?: string;
}) {
  const Heading = headingLevel;

  return (
    <div className={cn("flex flex-col items-center px-5 py-16 text-center", className)}>
      <Icon size={32} strokeWidth={2} aria-hidden className="text-sand-400" />
      <Heading className="mt-4 font-display text-h3 text-ink-900">{title}</Heading>
      <p className="np-measure-lead mt-3 text-body text-ink-600">{body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  );
}
