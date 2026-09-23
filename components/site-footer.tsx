import Link from "next/link";

const COLUMNS = [
  {
    heading: "Explore",
    links: [
      { href: "/destinations", label: "Destinations" },
      { href: "/experiences", label: "Experiences" },
      { href: "/trips", label: "Trips" },
    ],
  },
  {
    heading: "Plan",
    links: [
      { href: "/plan", label: "Build an itinerary" },
      { href: "/bookings", label: "Make an enquiry" },
    ],
  },
  {
    heading: "Noble Path",
    links: [
      { href: "/about", label: "About us" },
      { href: "/about#how-we-plan", label: "How we plan" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer data-surface="dark" className="bg-ink-950 text-white">
      <div className="np-container-wide np-section-tight">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="np-measure-lead">
            <p className="font-sans text-wordmark font-bold uppercase">Noble Path</p>
            <p className="mt-4 text-body-sm text-white/70">
              Trip planning for Sri Lanka. We arrange destinations, experiences and
              ready-made trips into a route that fits the days you actually have.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:gap-16">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="font-sans text-overline uppercase text-white/60">
                  {column.heading}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-body-sm text-white/85 transition-colors duration-[var(--dur-2)] hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/12 pt-8 text-small text-white/55 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Developed by Fortechz.</p>
          <p>
            Prices shown are indicative bands, not quotes. Travel times are advisory.
          </p>
        </div>
      </div>
    </footer>
  );
}
