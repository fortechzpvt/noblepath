"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/cn";

const NAV = [
  { href: "/destinations", label: "Destinations" },
  { href: "/experiences", label: "Experiences" },
  { href: "/trips", label: "Trips" },
  { href: "/about", label: "About Us" },
] as const;

/**
 * The site header.
 *
 * Two modes. Over the home hero it is transparent, sitting on the photograph and
 * relying on the hero's top scrim for contrast (design-system §10.2 measures that
 * band at 0.553 composite — at the body floor). Everywhere else, and as soon as
 * the hero has scrolled away, it becomes a solid ink bar.
 *
 * This is a client component only because it reads scroll position and owns the
 * mobile menu; it is the only client code in the page shell.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Off the home page there is no hero to scroll past, so the header is
  // always solid — computed at render time rather than pushed into state by
  // an effect.
  const scrolled = !isHome || scrolledPastHero;

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolledPastHero(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // Close the mobile menu on navigation. Adjusted during render rather than
  // in an effect (react.dev "you might not need an effect" — adjusting
  // state when a prop changes): the route changes without unmounting this
  // component, so there is no natural point to reset `menuOpen` otherwise.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  // While the drawer is open the page behind it must not scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const solid = scrolled || menuOpen;

  return (
    <header
      data-surface="dark"
      className={cn(
        "fixed inset-x-0 top-0 z-[50] transition-[background-color,box-shadow,backdrop-filter]",
        "duration-[var(--dur-3)] ease-[var(--ease-standard)]",
        solid
          ? "bg-ink-950/90 shadow-md backdrop-blur-[var(--blur-md)]"
          : "bg-transparent",
      )}
    >
      <div className="np-container-wide flex h-[72px] items-center justify-between gap-6 lg:h-20">
        <Link
          href="/"
          aria-label="Noble Path, home"
          className="rounded-sm font-sans text-wordmark font-bold tracking-[0.01em] text-white uppercase"
        >
          {/* Hidden from AT so the link is not announced twice — the accessible
              name comes from aria-label above (components.md §1.6). */}
          <span aria-hidden>Noble Path</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8 xl:gap-10">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-sm py-2 text-nav font-normal text-white/90 transition-colors",
                      "duration-[var(--dur-2)] hover:text-white",
                      "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left",
                      "after:scale-x-0 after:bg-amber-500 after:transition-transform",
                      "after:duration-[var(--dur-2)] hover:after:scale-x-100",
                      active && "text-white after:scale-x-100",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/bookings"
            className={cn(
              "hidden rounded-pill border border-white/30 px-5 py-2.5 text-button",
              "text-white transition-colors duration-[var(--dur-2)] hover:bg-white hover:text-ink-900 lg:inline-flex",
            )}
          >
            Book
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-pill text-white lg:hidden"
          >
            {menuOpen ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile drawer. Rendered rather than hidden so the close transition can run. */}
      <div
        id="mobile-nav"
        hidden={!menuOpen}
        className="border-t border-white/10 bg-ink-950/95 backdrop-blur-[var(--blur-md)] lg:hidden"
      >
        <nav aria-label="Primary" className="np-container py-6">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-white/10 last:border-0">
                <Link
                  href={item.href}
                  className="block py-4 font-display text-h3 text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/bookings"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-pill bg-white px-6 font-display text-button-serif font-semibold text-ink-900"
          >
            Book a trip
          </Link>
        </nav>
      </div>
    </header>
  );
}
