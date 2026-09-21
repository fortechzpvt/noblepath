import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/section";
import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  readonly label: string;
  /** Omitted on the current page, which is text rather than a link (components.md §14). */
  readonly href?: string;
}

/**
 * Breadcrumb trail (components.md §14).
 *
 * Hidden below 768 px, where the back affordance is the browser or OS. The
 * links carry a 44 px minimum height rather than relying on their text box,
 * which would be ~20 px (accessibility.md §5).
 */
export function Breadcrumb({
  items,
  onDark = false,
  className,
}: {
  readonly items: readonly BreadcrumbItem[];
  readonly onDark?: boolean;
  readonly className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("hidden md:block", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 text-small">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden className={onDark ? "np-on-image-muted" : "text-ink-400"}>
                /
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:underline",
                  onDark ? "np-on-image-secondary" : "text-ink-600",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className={cn(
                  "inline-flex min-h-11 items-center",
                  onDark ? "np-on-image" : "text-ink-900",
                )}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Compact photographic page header for index pages (page-specs.md §2 S1).
 *
 * 320 px tall, 260 px below 768 — an index page gets a header, not a hero: the
 * visitor came to scan a list and a full-height hero would push the grid below
 * the fold.
 *
 * The photograph is decoration — the `<h1>` beside it names the page — so it is
 * `alt=""` and `aria-hidden`. It is also the largest element on the route, so it
 * is marked `priority` to keep the LCP budget (NFR-1).
 */
export function PageHeader({
  imageSrc,
  title,
  lead,
  breadcrumb,
  children,
}: {
  readonly imageSrc: string;
  readonly title: string;
  readonly lead?: string;
  readonly breadcrumb?: readonly BreadcrumbItem[];
  /** Rendered under the lead — the result count line on filtered index pages. */
  readonly children?: ReactNode;
}) {
  return (
    <header
      data-surface="dark"
      className="relative isolate flex min-h-[260px] flex-col justify-end overflow-hidden pt-[72px] md:min-h-[320px] lg:pt-20"
    >
      <Image
        src={imageSrc}
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Scrim stack, design-system §10.2: wash → vertical → top band under the nav. */}
      <span aria-hidden className="np-scrim-wash absolute inset-0" />
      <span aria-hidden className="np-scrim-vertical absolute inset-0" />
      <span aria-hidden className="np-scrim-top absolute inset-x-0 top-0 h-40" />

      <Container className="relative pt-6 pb-7 md:pb-9">
        {breadcrumb && breadcrumb.length > 0 ? (
          <Breadcrumb items={breadcrumb} onDark className="-mb-2" />
        ) : null}
        <h1 className="np-on-image font-display text-h1">{title}</h1>
        {lead ? (
          <p className="np-on-image-secondary np-measure-lead mt-3 text-lead">{lead}</p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </Container>
    </header>
  );
}
