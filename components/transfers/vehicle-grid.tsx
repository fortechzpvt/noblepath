import Image from "next/image";

import { cn } from "@/lib/cn";
import { VEHICLES, type VehicleId } from "@/lib/transfers";

/**
 * Controlled radio grid of vehicle cards with the cartoon artwork.
 *
 * Shared by the transfer picker and the booking form so a vehicle looks and
 * behaves the same everywhere. The caller supplies the surrounding `FieldGroup`
 * (legend and description) and a unique `name` for the radio group.
 */
export function VehicleGrid({
  name,
  value,
  onChange,
  className,
}: {
  readonly name: string;
  readonly value: VehicleId | null;
  readonly onChange: (vehicle: VehicleId) => void;
  readonly className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {VEHICLES.map((vehicle) => (
        <label key={vehicle.id} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={vehicle.id}
            checked={value === vehicle.id}
            onChange={() => onChange(vehicle.id)}
            className="np-sr-only peer"
          />
          <span
            className={cn(
              "flex h-full flex-col items-center gap-2 rounded-xl border-2 border-border bg-surface p-3 text-center",
              "transition-[background-color,border-color] duration-[var(--dur-2)] ease-[var(--ease-standard)]",
              "hover:border-border-strong hover:bg-sand-100",
              "peer-checked:border-jungle-700 peer-checked:bg-jungle-50 peer-focus-visible:shadow-[var(--focus-ring)]",
            )}
          >
            {/* Decorative: the label below names the vehicle. `unoptimized` because
                these are small SVGs that the image optimiser cannot improve. */}
            <Image
              src={`/images/vehicles/${vehicle.id}.svg`}
              alt=""
              width={160}
              height={100}
              unoptimized
              className="h-auto w-full max-w-[140px]"
            />
            <span className="text-body-sm font-semibold text-ink-900">{vehicle.label}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
