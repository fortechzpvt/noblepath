"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export interface CarouselItem {
  readonly key: string;
  /** Used for the control labels and the live announcement. */
  readonly name: string;
  /** The server-rendered card. */
  readonly card: ReactNode;
}

/** Swipes shorter than this are treated as taps. */
const SWIPE_THRESHOLD = 48;

/** Below this the card text gets too small to read, so the section may run taller. */
const MIN_FIT_SCALE = 0.62;

/**
 * The home trips section as a 3D cylindrical carousel (D-33).
 *
 * The cards stand on the wall of a cylinder: card i is turned `i × 360/N` deg
 * about the vertical axis and pushed out by the cylinder's radius. Choosing a
 * trip turns the whole ring so that card faces the viewer. The ring's rotation
 * is an unbounded step count, not an index, so going from the last card to the
 * first turns one step forward instead of spinning all the way back.
 *
 * Only the ring's transform and each card's opacity change, and both are CSS
 * transitions (`.np-ring` in globals.css). The radius comes from CSS `tan()`
 * rather than a measurement, so there is no layout read and no resize listener.
 *
 * Accessibility follows the APG carousel pattern:
 * - only the front card is interactive; the rest are `inert`, so tab order and
 *   the accessibility tree hold one trip at a time;
 * - previous/next buttons, one button per trip, and the arrow keys (while focus
 *   is inside) change the front card;
 * - a polite live region announces the new trip, but only after the visitor
 *   has acted, so nothing is announced on page load;
 * - under reduced motion the turn is instant.
 *
 * The cards are rendered on the server and passed in, so this component ships
 * only the rotation logic.
 *
 * Fit to the screen (≥1024 px): the whole section, heading to controls, must fit
 * on a laptop screen under the fixed nav. The ring is scaled down just enough
 * to do that (never below MIN_FIT_SCALE) and the stage's height is set to the
 * scaled height, because a transform alone does not free up layout space.
 * The controls sit beside the heading at this width for the same reason.
 */
export function TripCarousel({
  items,
  label,
  header,
  aside,
}: {
  readonly items: readonly CarouselItem[];
  readonly label: string;
  /** The section heading. At ≥1024 px the controls sit to its right. */
  readonly header?: ReactNode;
  /** Shown next to the controls, e.g. a "See all" link. */
  readonly aside?: ReactNode;
}) {
  const count = items.length;
  const [step, setStep] = useState(0);
  const [announce, setAnnounce] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLUListElement>(null);
  const [fit, setFit] = useState({ scale: 1, natural: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    const ring = ringRef.current;
    const section = stage?.closest("section");
    if (!stage || !ring || !section) return;
    const laptop = window.matchMedia("(min-width: 1024px)");

    function measure() {
      if (!stage || !ring || !section) return;
      if (!laptop.matches) {
        setFit({ scale: 1, natural: 0 });
        return;
      }
      // Transforms do not change layout, so this is the unscaled card height.
      const natural = ring.offsetHeight;
      const nav = document.querySelector("header")?.getBoundingClientRect().height ?? 80;
      const rest = section.offsetHeight - stage.offsetHeight;
      const scale = Math.min(1, Math.max(MIN_FIT_SCALE, (window.innerHeight - nav - rest) / natural));
      setFit({ scale, natural });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(ring);
    window.addEventListener("resize", measure);
    laptop.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      laptop.removeEventListener("change", measure);
    };
  }, []);

  const active = ((step % count) + count) % count;

  function turnBy(delta: number) {
    if (delta === 0) return;
    setStep((s) => s + delta);
    setAnnounce(true);
  }

  /** Turn to card `index` the short way round. */
  function goTo(index: number) {
    let delta = (((index - active) % count) + count) % count;
    if (delta > count / 2) delta -= count;
    turnBy(delta);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") turnBy(1);
    else if (event.key === "ArrowLeft") turnBy(-1);
    else return;
    event.preventDefault();
  }

  if (count === 0) return null;

  const angle = 360 / count;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-x-10 lg:gap-y-[clamp(1.25rem,4svh,2.5rem)]"
    >
      {header ? <div className="min-w-0">{header}</div> : null}

      <div
        ref={stageRef}
        className="np-ring-stage order-2 lg:order-none lg:col-span-2 lg:row-start-2"
        style={fit.scale < 1 ? { height: fit.natural * fit.scale } : undefined}
        onPointerDown={(event) => {
          swipe.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
          // A drag that ends on a link must not also follow it.
          suppressClick.current = true;
          turnBy(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <ul
          ref={ringRef}
          className="np-ring"
          style={
            {
              "--np-ring-count": count,
              "--np-ring-scale": fit.scale,
              "--np-ring-turn": `${-step * angle}deg`,
            } as CSSProperties
          }
        >
          {items.map((item, index) => {
            // How many places this card is from the front, either way round.
            const raw = Math.abs(index - active);
            const distance = Math.min(raw, count - raw);
            const isActive = distance === 0;
            return (
              <li
                key={item.key}
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}: ${item.name}`}
                className="np-ring-item"
                data-distance={Math.min(distance, 3)}
                style={{ "--np-ring-angle": `${index * angle}deg` } as CSSProperties}
              >
                <div inert={!isActive} className="h-full">
                  {item.card}
                </div>
                {!isActive ? (
                  // Pointer shortcut only: keyboard and screen-reader users have
                  // the labelled controls below, so this stays out of both.
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    onClick={() => goTo(index)}
                    className="absolute inset-0 z-[2] cursor-pointer rounded-xl"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="order-3 flex flex-col items-center gap-6 lg:order-none lg:col-start-2 lg:row-start-1 lg:flex-row lg:gap-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => turnBy(-1)}
            aria-label="Previous trip"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink-900 transition-colors duration-[var(--dur-2)] hover:border-jungle-600 hover:text-jungle-700"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>

          <ul className="flex items-center gap-1" aria-label="Choose a trip">
            {items.map((item, index) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Show ${item.name}`}
                  aria-current={index === active ? "true" : undefined}
                  className="group inline-flex size-6 items-center justify-center rounded-full"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "block h-2 rounded-full transition-all duration-[var(--dur-3)] ease-[var(--ease-standard)]",
                      index === active ? "w-6 bg-jungle-700" : "w-2 bg-ink-300 group-hover:bg-ink-500",
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => turnBy(1)}
            aria-label="Next trip"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink-900 transition-colors duration-[var(--dur-2)] hover:border-jungle-600 hover:text-jungle-700"
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
        {aside}
      </div>

      <p aria-live="polite" aria-atomic="true" className="np-sr-only">
        {announce ? `Trip ${active + 1} of ${count}: ${items[active]?.name ?? ""}` : ""}
      </p>
    </div>
  );
}
