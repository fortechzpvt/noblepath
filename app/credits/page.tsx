import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { Container, Section } from "@/components/ui/section";
import { destinations, ownedPhotos } from "@/content/destinations";
import type { ImageAsset } from "@/lib/types";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "The photographers and licences behind the photographs on Noble Path.",
  alternates: { canonical: "/credits" },
};

/**
 * Photo credits (ADR-006, design-system.md "Attribution").
 *
 * CC BY and CC BY-SA require the author, source and licence to be shown with
 * the work. The design system keeps credits off the photographs themselves, so
 * this page is where that obligation is met; it is linked from every footer.
 * The list is derived from content, so a new or replaced image is credited the
 * moment it is used — there is no second list to forget to update.
 */
export default function CreditsPage() {
  const entries: { readonly place: string; readonly image: ImageAsset }[] = [
    ...destinations.map((d) => ({ place: d.name, image: d.image })),
    ...Object.values(ownedPhotos).map((image) => ({ place: "Across the site", image })),
  ];
  const seen = new Set<string>();
  const credited = entries.filter(({ image }) => {
    if (!image.credit || seen.has(image.src)) return false;
    seen.add(image.src);
    return true;
  });

  return (
    <>
      <PageHeader
        imageSrc={ownedPhotos.sigiriyaSunrise.src}
        title="Photo credits"
        lead="The photographers whose work appears on this site, and the licences it is used under."
      />
      <Section className="bg-sand-50">
        <Container>
          <ul className="flex max-w-[var(--container-prose)] flex-col divide-y divide-ink-900/10">
            {credited.map(({ place, image }) => (
              <li key={image.src} className="py-4">
                <p className="text-body font-semibold text-ink-900">{place}</p>
                <p className="mt-1 text-body-sm text-ink-600">{image.alt}</p>
                <p className="mt-1 text-small text-ink-600">
                  {image.sourceUrl ? (
                    <a href={image.sourceUrl} rel="noopener" className="underline underline-offset-4">
                      {image.credit}
                    </a>
                  ) : (
                    image.credit
                  )}
                  {image.licenceUrl ? (
                    <>
                      {" · "}
                      <a href={image.licenceUrl} rel="license noopener" className="underline underline-offset-4">
                        Licence
                      </a>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
