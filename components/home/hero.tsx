import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { RouteLine } from "@/components/home/route-line";
import { TrustBar } from "@/components/home/trust-bar";
import type { Destination } from "@/lib/types";

/**
 * The home hero (components.md §2).
 *
 * Layered exactly as design-system §10.2 specifies: photograph, cooling wash,
 * vertical scrim, horizontal scrim (≥768 only — below that the copy is
 * full-width, so the vertical layer is strengthened instead), and a top scrim
 * that carries the transparent nav.
 *
 * This is a server component. The Ken Burns push, the staggered text reveal and
 * the route-line draw-on are all CSS animations, so the hero ships no JavaScript
 * — which is what makes the LCP budget (NFR-1) achievable on the one page that
 * has to meet it.
 *
 * The photograph is marked decorative (`alt=""`): the <h1> directly beside it
 * already names the place and the page, so describing it again would be noise
 * in a screen reader (accessibility.md §7).
 */
export function Hero({ featured }: { readonly featured: readonly Destination[] }) {
  const thumbnails = featured.slice(0, 4);

  return (
    <section
      aria-labelledby="hero-title"
      data-surface="dark"
      // min-h, not h: on a short window the content is taller than the screen, and a
      // fixed height pushed the headline up underneath the fixed header.
      className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden"
    >
      {/* Fallback behind the photograph. If the asset fails to load the hero is
          still readable — white on jungle-900 measures 11.7:1. */}
      <div
        className="absolute inset-0 z-0 bg-gradient-to-b from-jungle-900 to-ink-900"
        aria-hidden
      />

      <Image
        src="/images/hero/sigiriya-sunrise-2.jpg"
        alt=""
        aria-hidden
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        quality={72}
        className="np-ken-burns z-0 object-cover object-[50%_45%]"
      />

      {/* Scrim stack. Decorative throughout. */}
      <div className="absolute inset-0 z-[1] np-scrim-wash" aria-hidden />
      <div className="absolute inset-0 z-[1] np-scrim-vertical" aria-hidden />
      <div className="absolute inset-0 z-[1] hidden md:block np-scrim-horizontal" aria-hidden />
      <div className="absolute inset-x-0 top-0 z-[1] h-40 np-scrim-top" aria-hidden />

      {/* Decorative route line, desktop only. */}
      <div
        className="pointer-events-none absolute right-[16%] bottom-[16%] z-[10] hidden h-[400px] w-[420px] lg:block xl:right-[21%]"
        aria-hidden
      >
        <RouteLine className="h-full w-full" />
        <Image
          src="/images/ui/route-pin.svg"
          alt=""
          width={36}
          height={48}
          aria-hidden
          className="np-fade-up absolute top-[-32px] left-[12px] h-12 w-9 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
          style={{ animationDelay: "2.7s" }}
        />
      </div>

      {/* Content. */}
      <div className="np-container-wide relative z-[2] pt-28 pb-10 lg:pt-32 lg:pb-[clamp(2rem,5svh,3.5rem)]">
        <div className="max-w-[min(560px,70%)] max-xs:max-w-full lg:max-w-[min(620px,54%)] xl:max-w-[min(660px,46%)]">
          <p
            className="np-fade-up np-on-image-secondary text-kicker"
            style={{ animationDelay: "0ms" }}
          >
            Sri Lanka is waiting ….
          </p>

          <h1
            id="hero-title"
            className="np-fade-up np-on-image mt-4 font-display text-display md:mt-5"
            // Capped by window height so a short laptop window does not get a
            // headline that fills the whole screen. Never below 2.25rem.
            style={{ animationDelay: "80ms", fontSize: "min(var(--text-display), max(2.25rem, 9svh))" }}
          >
            Explore
            <br className="hidden md:inline" />{" "}
            <span className="md:hidden"> </span>
            Sri Lanka with us
          </h1>

          <p
            className="np-fade-up np-on-image-secondary mt-4 text-lead md:mt-5 lg:mt-6"
            style={{ animationDelay: "160ms" }}
          >
            Discover breathtaking destinations, unique experiences and unforgettable
            memories across Sri Lanka.
          </p>

          <div className="np-fade-up mt-6 md:mt-7 lg:mt-8" style={{ animationDelay: "240ms" }}>
            <LinkButton href="/plan" variant="primary" size="lg">
              Plan Your Trip
              <ArrowRight size={20} aria-hidden />
            </LinkButton>
          </div>
        </div>

        {/* Thumbnail rail + trust bar. */}
        <div className="mt-8 flex flex-col gap-6 md:mt-10 lg:mt-[clamp(1.5rem,5svh,3.5rem)] lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          {thumbnails.length > 0 ? (
            <div className="min-w-0">
              <div className="flex items-baseline gap-4">
                <h2 className="np-on-image text-h3 font-semibold">Popular Destinations</h2>
                <Link
                  href="/destinations"
                  className="np-on-image rounded-sm border-b-2 border-transparent pb-0.5 text-body-sm font-semibold transition-colors duration-[var(--dur-2)] hover:border-amber-500"
                >
                  View all
                </Link>
              </div>

              <ul
                className="np-rail -mx-[var(--gutter)] mt-4 flex gap-4 px-[var(--gutter)] pb-1 md:mx-0 md:px-0"
                tabIndex={0}
                role="group"
                aria-label="Popular destinations"
              >
                {thumbnails.map((destination) => (
                  <li key={destination.slug} className="shrink-0">
                    <Link
                      href={`/destinations/${destination.slug}`}
                      className="group relative block h-[70px] w-[140px] overflow-hidden rounded-lg border border-[var(--color-on-image-rule)] shadow-media transition-transform duration-[var(--dur-3)] ease-[var(--ease-standard)] hover:scale-[1.04] hover:border-white/50 active:scale-[0.99] md:h-[74px] md:w-[148px] lg:h-20 lg:w-40 xl:h-22 xl:w-44"
                    >
                      <Image
                        src={destination.image.src}
                        alt=""
                        aria-hidden
                        fill
                        sizes="(min-width: 1440px) 176px, (min-width: 1024px) 160px, 148px"
                        className="object-cover"
                      />
                      <span className="absolute inset-0 np-scrim-card" aria-hidden />
                      <span className="np-on-image absolute inset-x-0 bottom-0 p-2.5 text-small font-semibold">
                        {destination.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <TrustBar className="lg:w-[min(520px,46%)] lg:shrink-0" />
        </div>
      </div>

      {/* Scroll cue. Decorative. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-2 z-[2] hidden justify-center lg:flex"
        aria-hidden
      >
        <ChevronDown size={24} className="animate-bounce text-white/55" />
      </div>
    </section>
  );
}
