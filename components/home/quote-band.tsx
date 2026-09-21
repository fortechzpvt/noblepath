import Image from "next/image";

/**
 * Home S7 (page-specs §1 S7) — a full-bleed editorial beat between the trip grid
 * and the closing call to action.
 *
 * The serif is used at display size here, which is the only size the design
 * system permits it over photography (§13, D-02).
 */
export function QuoteBand() {
  return (
    <section
      data-surface="dark"
      aria-label="About travelling in Sri Lanka"
      className="relative isolate flex h-[min(70svh,620px)] min-h-[420px] items-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0 bg-jungle-900" aria-hidden />
      <Image
        src="/images/experiences/jungle-villa-yala.jpg"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="z-0 object-cover object-center"
      />
      <div className="absolute inset-0 z-[1] np-scrim-wash" aria-hidden />
      <div className="absolute inset-0 z-[1] np-scrim-vertical" aria-hidden />

      <div className="np-container relative z-[2] text-center">
        <blockquote className="mx-auto max-w-[18ch] font-display text-display-sm np-on-image">
          An island you can cross in a day, and spend a lifetime learning.
        </blockquote>
        <p className="np-on-image-secondary mt-6 text-small">
          Yala, Southern Province
        </p>
      </div>
    </section>
  );
}
