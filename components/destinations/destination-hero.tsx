import Image from "next/image";
import { Clock, MapPin, Sun } from "lucide-react";

import { Breadcrumb } from "@/components/ui/page-header";
import { Container } from "@/components/ui/section";
import { formatMonthRange, regionName } from "@/lib/format";
import type { Destination } from "@/lib/types";

/**
 * Medium full-bleed hero for a destination detail page (page-specs.md §3 S1).
 *
 * The photograph is the subject of the page here — not decoration as it is on
 * an index header — so it carries the authored descriptive `alt` rather than an
 * empty one (accessibility.md §7).
 */
export function DestinationHero({ destination }: { readonly destination: Destination }) {
  return (
    <header
      data-surface="dark"
      className="relative isolate flex min-h-[min(60svh,520px)] flex-col justify-end overflow-hidden pt-[72px] lg:min-h-[min(72svh,640px)] lg:pt-20"
    >
      <Image
        src={destination.image.src}
        alt={destination.image.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* design-system §10.2: wash → vertical → horizontal (desktop, because the
          text column is left-aligned there) → top band under the nav. */}
      <span aria-hidden className="np-scrim-wash absolute inset-0" />
      <span aria-hidden className="np-scrim-vertical absolute inset-0" />
      <span aria-hidden className="np-scrim-horizontal absolute inset-0 hidden lg:block" />
      <span aria-hidden className="np-scrim-top absolute inset-x-0 top-0 h-40" />

      <Container className="relative pt-6 pb-8 md:pb-12">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Destinations", href: "/destinations" },
            { label: destination.name },
          ]}
          onDark
          className="-mb-2"
        />
        <p className="text-overline uppercase text-amber-500">
          {regionName(destination.region)}
        </p>
        <h1 className="np-on-image mt-2 font-display text-h1">{destination.name}</h1>
        <p className="np-on-image-secondary np-measure-hero mt-3 text-lead">
          {destination.tagline}
        </p>

        <ul className="np-on-image-secondary mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-small">
          <li className="flex items-center gap-2">
            <MapPin size={16} aria-hidden />
            {regionName(destination.region)}
          </li>
          <li className="flex items-center gap-2">
            <Sun size={16} aria-hidden />
            Best {formatMonthRange(destination.bestMonths)}
          </li>
          <li className="flex items-center gap-2">
            <Clock size={16} aria-hidden />
            <span className="tabular-nums">{destination.suggestedNights}</span>
            {destination.suggestedNights === 1 ? "night" : "nights"} suggested
          </li>
        </ul>
      </Container>
    </header>
  );
}
