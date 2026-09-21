import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The pill button from the approved mockup.
 *
 * `primary` is the white-on-photography hero CTA: white fill, dark display-serif
 * label, fully rounded. `solid` is its inverse for use on light pages, `ghost`
 * and `outline` cover secondary actions in both contexts.
 *
 * Focus is handled globally by the dual ring in globals.css (design-system §11);
 * no variant may add `outline-none`.
 */
type Variant = "primary" | "solid" | "outline" | "ghost" | "glass";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-pill font-medium " +
  "transition-[transform,background-color,color,box-shadow,border-color] duration-[var(--dur-2)] " +
  "ease-[var(--ease-standard)] active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  // White pill, serif label — the hero's "Plan Your Trip".
  primary:
    "bg-white text-ink-900 font-display font-semibold shadow-md hover:bg-sand-50 hover:shadow-lg",
  // The same shape inverted, for light-background sections.
  solid:
    "bg-ink-900 text-sand-50 font-sans shadow-sm hover:bg-ink-800 hover:shadow-md",
  outline:
    "border border-ink-900/20 bg-transparent text-ink-900 font-sans hover:border-ink-900/40 hover:bg-ink-900/[0.04]",
  ghost: "bg-transparent text-ink-800 font-sans hover:bg-ink-900/[0.06]",
  // Frosted pill for use directly over photography.
  glass:
    "np-glass np-glass-text text-white font-sans hover:bg-[rgba(10,15,13,0.68)]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-button",
  md: "h-12 px-6 text-button",
  // The hero CTA. 56px tall — comfortably above the 44px touch-target minimum.
  lg: "h-14 px-7 text-button-serif",
};

interface CommonProps {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly className?: string;
  readonly children: ReactNode;
}

type ButtonProps = CommonProps & ComponentPropsWithoutRef<"button">;
type LinkButtonProps = CommonProps & { readonly href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "href" | "className" | "children"
  >;

export function Button({
  variant = "solid",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "solid",
  size = "md",
  className,
  children,
  href,
  ...props
}: LinkButtonProps) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}
