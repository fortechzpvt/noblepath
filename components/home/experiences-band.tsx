import Image from "next/image";

import { ExperienceCard } from "@/components/cards/experience-card";
import { LinkButton } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { SnapRail } from "@/components/ui/snap-rail";
import type { Experience } from "@/lib/types";

/**
 * Home S4 (page-specs §1 S4) — a dark photographic band.
 *
 * The cards keep their light surface: they are intended to read as light islands
 * on a dark band, which is where the contrast comes from.
 */
export function ExperiencesBand({
  experiences,
  destinationNames,
}: {
  readonly experiences: readonly Experience[];
  /** Destination slug → display name, resolved by the page. */
  readonly destinationNames: Readonly<Record<string, string>>;
}) {
  return (
    <section
      data-surface="dark"
      className="relative isolate overflow-hidden py-[var(--section-y)] lg:min-h-[560px]"
    >
      <div className="absolute inset-0 z-0 bg-ink-900" aria-hidden />
      <Image
        src="/images/experiences/surfing-south-coast.jpg"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="z-0 object-cover object-center"
      />
      <div className="absolute inset-0 z-[1] np-scrim-wash" aria-hidden />
      <div className="absolute inset-0 z-[1] bg-ink-950/60" aria-hidden />

      <Container wide className="relative z-[2]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="np-measure-lead">
            <p className="np-on-image-secondary text-overline uppercase">What to do</p>
            <h2 className="np-on-image mt-3 font-display text-h2">
              Experiences worth the detour
            </h2>
            <p className="np-on-image-secondary mt-4 text-lead">
              Climbs at first light, a train through the tea, a whale off the southern
              shelf. The parts of the trip people actually talk about afterwards.
            </p>
          </div>
          <LinkButton
            href="/experiences"
            variant="glass"
            size="md"
            className="shrink-0 border border-white/30"
          >
            All experiences
          </LinkButton>
        </div>

        <SnapRail label="Featured experiences" className="mt-8">
          {experiences.map((experience) => (
            <li
              key={experience.slug}
              className="w-[78vw] shrink-0 md:w-[42vw] lg:w-[31%] xl:w-[23%]"
            >
              <ExperienceCard
                experience={experience}
                destinationName={destinationNames[experience.destinationSlug]}
              />
            </li>
          ))}
        </SnapRail>
      </Container>
    </section>
  );
}
