import { cn } from "@/lib/cn";

/**
 * The four assurances in the glass bar, from the approved mockup.
 *
 * DEVIATION IMPL-01: the mockup's fourth item reads "Secure Payments". v1 takes no
 * card payments at all (ADR-004), so that claim would be untrue on the live site.
 * It ships as "Secure Booking", which is accurate today. Restore the original
 * wording when payment processing actually exists.
 */
const ASSURANCES = [
  "Best Price",
  "24/7 Travel Support",
  "Flexible Booking",
  "Secure Booking",
] as const;

/**
 * Non-interactive reassurance strip (components.md §7).
 *
 * A `<ul>` because it is four peer claims. Dividers are borders rather than
 * characters so screen readers never announce them. Text-only by design — four
 * icons in an 88px strip would crowd it and carry no information the labels
 * don't already.
 */
export function TrustBar({ className }: { readonly className?: string }) {
  return (
    <ul
      aria-label="Why book with Noble Path"
      className={cn(
        "np-glass np-glass-text grid grid-cols-2 rounded-lg md:grid-cols-4 md:rounded-xl",
        className,
      )}
    >
      {ASSURANCES.map((item, index) => (
        <li
          key={item}
          className={cn(
            "flex min-h-16 items-center justify-center text-balance px-3 py-4 text-center",
            "text-body-sm font-medium text-white md:min-h-20 md:px-3.5 lg:min-h-22 lg:px-5",
            // 2x2 on mobile: a left rule on the right-hand column, a top rule on
            // the second row. From 768 up it is a single divided row.
            index % 2 === 1 && "border-l border-[var(--color-on-image-rule)]",
            index > 1 && "border-t border-[var(--color-on-image-rule)] md:border-t-0",
            index > 0 && "md:border-l md:border-[var(--color-on-image-rule)]",
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
