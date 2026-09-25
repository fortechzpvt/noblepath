"use client";

import { useState } from "react";
import { CarFront, Map } from "lucide-react";

import { BookingForm } from "@/components/booking/booking-form";
import type { NamedOption, TripOption } from "@/components/booking/plan-section";
import { RideForm } from "@/components/booking/ride-form";
import { cn } from "@/lib/cn";

export type BookingService = "trip" | "ride";

const OPTIONS: ReadonlyArray<{
  readonly value: BookingService;
  readonly title: string;
  readonly text: string;
  readonly icon: React.ReactNode;
}> = [
  {
    value: "trip",
    title: "A full trip",
    text: "Dates, stays, activities and transfers, as a package or built your own way.",
    icon: <Map size={20} aria-hidden />,
  },
  {
    value: "ride",
    title: "A single ride",
    text: "One journey with a driver, for example Matara to Kandy. One way or return.",
    icon: <CarFront size={20} aria-hidden />,
  },
];

/**
 * What is being booked: a full trip (`BookingForm`) or a single ride
 * (`RideForm`, D-24).
 *
 * Both forms stay mounted and the inactive one is `hidden`, so switching back
 * and forth never throws away what the traveller has already typed. The
 * choice is mirrored into `?service=` with `replaceState` so the view can be
 * linked to (the page reads it back as `initialService`) without adding a
 * history entry per click.
 */
export function BookingOptions({
  initialService,
  trips,
  destinations,
  experiences,
}: {
  readonly initialService: BookingService;
  readonly trips: readonly TripOption[];
  readonly destinations: readonly NamedOption[];
  readonly experiences: readonly NamedOption[];
}) {
  const [service, setService] = useState<BookingService>(initialService);

  const choose = (next: BookingService) => {
    setService(next);
    try {
      const url = new URL(window.location.href);
      if (next === "ride") url.searchParams.set("service", "ride");
      else url.searchParams.delete("service");
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // Cosmetic only: the form still switches if the URL cannot be updated.
    }
  };

  return (
    <div className="mx-auto flex max-w-[var(--container-prose)] flex-col gap-6">
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="text-h3 text-ink-900">What would you like to book?</legend>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {OPTIONS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="bk-service"
                value={option.value}
                checked={service === option.value}
                onChange={() => choose(option.value)}
                className="np-sr-only peer"
              />
              <span
                className={cn(
                  "flex h-full flex-col gap-2 rounded-xl border-2 border-border bg-surface p-5 text-left",
                  "transition-[background-color,border-color] duration-[var(--dur-2)] ease-[var(--ease-standard)]",
                  "hover:border-border-strong hover:bg-sand-100",
                  "peer-checked:border-jungle-700 peer-checked:bg-jungle-50 peer-focus-visible:shadow-[var(--focus-ring)]",
                )}
              >
                <span className="flex items-center gap-2 text-h5 text-ink-900">
                  {option.icon}
                  {option.title}
                </span>
                <span className="text-body-sm text-ink-600">{option.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div hidden={service !== "trip"}>
        <BookingForm trips={trips} destinations={destinations} experiences={experiences} />
      </div>
      <div hidden={service !== "ride"}>
        <RideForm />
      </div>
    </div>
  );
}
