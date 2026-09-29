"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export interface JourneyChapter {
  readonly slug: string;
  readonly name: string;
  readonly character: string;
  readonly body: string;
  readonly image: { readonly src: string; readonly alt: string };
  readonly href: string;
}

/**
 * The home page's scrollytelling chapter (D-31): "A journey across Sri Lanka".
 *
 * A full-screen photograph is pinned (`position: sticky`) while one text card
 * per region scrolls up over it. When a card crosses the middle of the screen,
 * the photograph behind it cross-fades to that region.
 *
 * The text cards are ordinary document content in reading order, so the chapter
 * works for screen readers, keyboard users and with JavaScript disabled (the
 * first photograph simply stays). JavaScript only decides which photograph is
 * showing; everything that moves is CSS (`.np-chapter-text` in globals.css),
 * and under prefers-reduced-motion the cross-fade becomes an instant swap.
 */
export function JourneyChapters({ chapters }: { readonly chapters: readonly JourneyChapter[] }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // A zero-height band across the middle of the viewport: a card becomes
    // active the moment it reaches the centre, whatever its height.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const step of stepRefs.current) if (step) observer.observe(step);
    return () => observer.disconnect();
  }, []);

  const total = String(chapters.length).padStart(2, "0");

  return (
    <section aria-labelledby="journey-title" data-surface="dark" className="relative bg-ink-950">
      {/* Pinned stage. Decorative: each card below carries the words. */}
      <div className="sticky top-0 h-svh overflow-hidden" aria-hidden>
        {chapters.map((chapter, index) => (
          <Image
            key={chapter.slug}
            src={chapter.image.src}
            alt=""
            fill
            sizes="100vw"
            className={cn(
              "object-cover transition-[opacity,transform] duration-[var(--dur-6)] ease-[var(--ease-cinematic)] motion-reduce:transition-none",
              index === active ? "np-ken-burns scale-100 opacity-100" : "scale-[1.06] opacity-0",
            )}
          />
        ))}
        <div className="absolute inset-0 np-scrim-wash" />
        <div className="absolute inset-0 np-scrim-vertical" />
        <div className="absolute inset-0 hidden md:block np-scrim-horizontal" />

        {/* Progress along the route. */}
        <div className="np-container-wide absolute inset-x-0 bottom-8 flex items-center gap-3 md:bottom-10">
          {chapters.map((chapter, index) => (
            <span key={chapter.slug} className="flex items-center gap-3">
              {index > 0 ? (
                <span
                  className={cn(
                    "h-px w-8 transition-colors duration-[var(--dur-4)] md:w-14",
                    index <= active ? "bg-amber-500" : "bg-white/30",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full border transition-colors duration-[var(--dur-4)]",
                  index <= active ? "border-amber-500 bg-amber-500" : "border-white/60 bg-transparent",
                )}
              />
            </span>
          ))}
        </div>
      </div>

      <h2 id="journey-title" className="np-sr-only">
        A journey across Sri Lanka
      </h2>

      {/* The story. Pulled up by one screen so the first card starts over the
          pinned photograph rather than below it. */}
      <ol className="relative -mt-[100svh]">
        {chapters.map((chapter, index) => (
          <li
            key={chapter.slug}
            ref={(el) => {
              stepRefs.current[index] = el;
            }}
            data-index={index}
            className="flex min-h-svh items-end pb-[22svh] md:items-center md:pb-0"
          >
            <div className="np-container-wide w-full">
              <div className="np-chapter-text max-w-[560px]">
                <p
                  aria-hidden
                  className="font-display text-[clamp(5rem,14vw,11rem)] leading-[0.8] text-white/15"
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="np-on-image-secondary mt-4 text-overline uppercase tabular-nums">
                  {String(index + 1).padStart(2, "0")} / {total}
                </p>
                <h3 className="np-on-image mt-3 font-display text-display-sm">{chapter.name}</h3>
                <p className="np-on-image mt-3 text-lead">{chapter.character}</p>
                <p className="np-on-image-secondary mt-4 text-body">{chapter.body}</p>
                <Link
                  href={chapter.href}
                  className="np-on-image mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border-b-2 border-transparent text-body-sm font-semibold transition-colors duration-[var(--dur-2)] hover:border-amber-500"
                >
                  Explore the {chapter.name}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
