/**
 * Airport transfer and vehicle choice, shared by the trip page and the plan builder.
 *
 * The choice is a per-browser preference stored in `localStorage`. Nothing is sent
 * to a server, so it is not a booking: it records what the traveller wants so it
 * can be raised when they enquire.
 */

export const VEHICLE_IDS = [
  "sedan",
  "sedan-electric",
  "mini-car",
  "mini-car-electric",
  "van",
  "bus",
  "scooter",
  "tuk-tuk",
] as const;

export type VehicleId = (typeof VEHICLE_IDS)[number];

export interface Vehicle {
  readonly id: VehicleId;
  readonly label: string;
}

/** Offered in this order: cars first, then group transport, then two-/three-wheelers. */
export const VEHICLES: readonly Vehicle[] = [
  { id: "sedan", label: "Sedan" },
  { id: "sedan-electric", label: "Sedan (electric)" },
  { id: "mini-car", label: "Mini car" },
  { id: "mini-car-electric", label: "Mini car (electric)" },
  { id: "van", label: "Van" },
  { id: "bus", label: "Bus" },
  { id: "scooter", label: "Scooter" },
  { id: "tuk-tuk", label: "Tuk tuk" },
];

export interface TransferSelection {
  readonly airportPickup: boolean;
  readonly airportDrop: boolean;
  readonly vehicle: VehicleId | null;
}

export const EMPTY_TRANSFERS: TransferSelection = {
  airportPickup: false,
  airportDrop: false,
  vehicle: null,
};

/** Version lives in the key so an incompatible future shape is ignored, not migrated. */
export const TRANSFERS_STORAGE_KEY = "np.transfers.v1";

export function vehicleLabel(id: VehicleId): string {
  return VEHICLES.find((vehicle) => vehicle.id === id)?.label ?? id;
}

function isVehicleId(value: unknown): value is VehicleId {
  return typeof value === "string" && (VEHICLE_IDS as readonly string[]).includes(value);
}

/**
 * Parse a stored selection defensively. `localStorage` is editable by the visitor,
 * so every field is checked and anything unexpected falls back to "not chosen"
 * instead of reaching the UI.
 */
export function parseTransfers(raw: string): TransferSelection | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;

  return {
    airportPickup: record.airportPickup === true,
    airportDrop: record.airportDrop === true,
    vehicle: isVehicleId(record.vehicle) ? record.vehicle : null,
  };
}
