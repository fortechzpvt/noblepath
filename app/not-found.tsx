import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for has moved or never existed.",
  robots: { index: false, follow: true },
};

const ROUTES_OUT = [
  { href: "/destinations", label: "Destinations" },
  { href: "/experiences", label: "Experiences" },
  { href: "/trips", label: "Trips" },
  { href: "/plan", label: "Build a plan" },
  { href: "/about", label: "About Noble Path" },
] as const;

/**
 * 404 (page-specs §9).
 *
 * DEVIATION: the specification puts a search field on this page. Global search
 * (user-flows §F7) is not built in v1, so rendering a search box here would be a
 * dead control. The named routes out replace it — the rule the spec is actually
 * protecting is "no dead ends" (user-flows §7.9), and links satisfy it.
 */
export default function NotFound() {
  return (
    <section data-surface="dark" className="relative isolate flex min-h-[min(80svh,700px)] items-end">
      <Image
        src="/images/destinations/ella.jpg"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <span aria-hidden className="np-scrim-wash absolute inset-0 -z-10" />
      <span aria-hidden className="np-scrim-vertical absolute inset-0 -z-10" />
      <span aria-hidden className="np-scrim-top absolute inset-x-0 top-0 -z-10 h-40" />

      <Container className="pt-32 pb-[var(--section-y)]">
        <p className="np-on-image-secondary text-overline uppercase">Error 404</p>
        <h1 className="np-on-image np-measure-hero mt-3 font-display text-h1">
          This path doesn&rsquo;t exist
        </h1>
        <p className="np-on-image-secondary np-measure-lead mt-4 text-lead">
          The page you&rsquo;re looking for has moved, or never was. Everything we cover is
          still one step away.
        </p>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
          <LinkButton href="/" variant="primary" size="lg" className="w-full md:w-auto">
            Back to home
          </LinkButton>
          <LinkButton
            href="/destinations"
            variant="glass"
            size="lg"
            className="w-full md:w-auto"
          >
            Explore destinations
          </LinkButton>
        </div>

        <nav aria-label="Elsewhere on Noble Path" className="mt-10">
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {ROUTES_OUT.map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  className="np-on-image inline-flex min-h-11 items-center rounded-xs text-body-sm underline decoration-amber-500 decoration-2 underline-offset-8"
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}
