import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/section";
import { ownedPhotos } from "@/content/destinations";

const CATEGORIES = [
  { label: "Accommodation", href: "/accommodation", image: ownedPhotos.jungleVilla },
  { label: "Itinerary", href: "/plan", image: ownedPhotos.ellaRoadSign },
  { label: "Activities", href: "/experiences", image: ownedPhotos.surfSouthCoast },
  { label: "Trip Plans", href: "/trips", image: ownedPhotos.tuktukRoadTrip },
] as const;

/**
 * Home — planning categories band.
 *
 * Four entry points into the site framed as the things Noble Path helps a
 * traveller plan. Each image is decorative (`alt=""`); the visible pill
 * carries the meaning, so a screen reader is not told the same thing twice.
 */
export function PlanCategories() {
  return (
    <section className="np-section">
      <Container wide>
        <h2 className="max-w-[16ch] font-display text-h2 text-jungle-800">
          Come on, let&rsquo;s plan your trip around Sri Lanka.........
        </h2>

        <div className="mt-6 rounded-2xl bg-jungle-200 p-4 md:mt-8 md:rounded-3xl md:p-6 lg:p-8 xl:p-10">
          <ul className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
            {CATEGORIES.map((category) => (
              <li key={category.label}>
                <Link
                  href={category.href}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-xl shadow-sm transition-transform duration-[var(--dur-3)] ease-[var(--ease-standard)] hover:-translate-y-1 active:translate-y-0 md:aspect-[4/5] md:rounded-2xl"
                >
                  <Image
                    src={category.image.src}
                    alt=""
                    aria-hidden
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-[var(--dur-3)] ease-[var(--ease-standard)] group-hover:scale-105"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent"
                  />
                  <span className="absolute bottom-2 left-2 inline-flex items-center rounded-pill bg-white/85 px-2.5 py-1 text-small font-semibold text-ink-900 backdrop-blur-sm md:bottom-3 md:left-3 md:px-3 md:py-1.5">
                    {category.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
