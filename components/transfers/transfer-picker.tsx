"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PlaneLanding, PlaneTakeoff, X } from "lucide-react";

import { FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  EMPTY_TRANSFERS,
  TRANSFERS_STORAGE_KEY,
  VEHICLES,
  parseTransfers,
  vehicleLabel,
  type TransferSelection,
  type VehicleId,
} from "@/lib/transfers";

const chipBase =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-body-sm " +
  "transition-[background-color,border-color,color] duration-[var(--dur-2)] ease-[var(--ease-standard)]";
const chipOff =
  "border-border bg-surface font-medium text-ink-600 hover:border-border-strong hover:bg-sand-100 hover:text-ink-900";
const chipChecked =
  "peer-checked:border-jungle-700 peer-checked:bg-jungle-700 peer-checked:font-semibold peer-checked:text-white " +
  "peer-checked:hover:border-jungle-600 peer-checked:hover:bg-jungle-600 peer-checked:hover:text-white " +
  "peer-focus-visible:shadow-[var(--focus-ring)]";

function summarise(selection: TransferSelection): string {
  const parts: string[] = [];
  if (selection.airportPickup) parts.push("airport pickup");
  if (selection.airportDrop) parts.push("airport drop");
  if (selection.vehicle) parts.push(vehicleLabel(selection.vehicle).toLowerCase());
  return parts.length === 0 ? "Nothing selected yet." : `Selected: ${parts.join(", ")}.`;
}

/**
 * Airport pickup / drop and vehicle choice.
 *
 * Self-contained: it reads and writes its own `localStorage` entry, so the trip
 * page (a server component) and the plan builder can both drop it in and stay in
 * sync. The choice never leaves the browser.
 */
export function TransferPicker({ className }: { readonly className?: string }) {
  const baseId = useId();
  const [selection, setSelection] = useState<TransferSelection>(EMPTY_TRANSFERS);
  const hydrated = useRef(false);

  useEffect(() => {
    const restore = (stored: TransferSelection) => setSelection(stored);
    try {
      const raw = window.localStorage.getItem(TRANSFERS_STORAGE_KEY);
      const stored = raw === null ? null : parseTransfers(raw);
      if (stored) restore(stored);
    } catch {
      // Storage throws in private mode; the picker still works, just unsaved.
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    // Without this gate the first render would overwrite what is still being read back.
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(selection));
    } catch {
      // Degraded, not an error the traveller can act on.
    }
  }, [selection]);

  const setVehicle = (vehicle: VehicleId | null) =>
    setSelection((current) => ({ ...current, vehicle }));

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <FieldGroup
        legend="Airport transfers"
        description="Tick the ones you want. Leave both empty if you are arranging your own."
      >
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={selection.airportPickup}
              onChange={(event) =>
                setSelection((current) => ({ ...current, airportPickup: event.target.checked }))
              }
              className="np-sr-only peer"
            />
            <span className={cn(chipBase, chipOff, chipChecked)}>
              <PlaneLanding size={16} aria-hidden />
              Airport pickup
            </span>
          </label>
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={selection.airportDrop}
              onChange={(event) =>
                setSelection((current) => ({ ...current, airportDrop: event.target.checked }))
              }
              className="np-sr-only peer"
            />
            <span className={cn(chipBase, chipOff, chipChecked)}>
              <PlaneTakeoff size={16} aria-hidden />
              Airport drop
            </span>
          </label>
        </div>
      </FieldGroup>

      <FieldGroup legend="Vehicle" description="Choose one.">
        <div className="flex flex-wrap gap-2">
          {VEHICLES.map((vehicle) => (
            <label key={vehicle.id} className="cursor-pointer">
              <input
                type="radio"
                name={`${baseId}-vehicle`}
                value={vehicle.id}
                checked={selection.vehicle === vehicle.id}
                onChange={() => setVehicle(vehicle.id)}
                className="np-sr-only peer"
              />
              <span className={cn(chipBase, chipOff, chipChecked)}>{vehicle.label}</span>
            </label>
          ))}
        </div>
        {selection.vehicle !== null ? (
          <button
            type="button"
            onClick={() => setVehicle(null)}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xs text-body-sm text-jungle-600 underline underline-offset-4"
          >
            <X size={16} aria-hidden />
            Clear vehicle choice
          </button>
        ) : null}
      </FieldGroup>

      <p aria-live="polite" className="text-small text-text-meta">
        {summarise(selection)} Saved in this browser only. Mention it when you enquire and
        we will confirm availability and price.
      </p>
    </div>
  );
}
