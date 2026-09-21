import { PlaneLanding, PlaneTakeoff } from "lucide-react";

import { Card, Chip } from "@/components/booking/ui";
import { VehicleGrid } from "@/components/transfers/vehicle-grid";
import { FieldGroup, SelectField, TextField } from "@/components/ui/field";
import {
  AIRPORTS,
  ids,
  totalTravellers,
  type AirportLeg,
  type BookingDraft,
  type FormError,
} from "@/lib/booking-request";

function formatWhen(date: string, time: string): string {
  return date && time ? `${date} at ${time}` : "Set this in Trip dates above";
}

function Leg({
  legKey,
  title,
  icon,
  requiredLabel,
  whenLabel,
  when,
  leg,
  defaultPassengers,
  onChange,
  errors,
}: {
  readonly legKey: "pickup" | "drop";
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly requiredLabel: string;
  readonly whenLabel: string;
  readonly when: string;
  readonly leg: AirportLeg;
  readonly defaultPassengers: string;
  readonly onChange: (next: AirportLeg) => void;
  readonly errors: readonly FormError[];
}) {
  const errorFor = (field: string) =>
    errors.find((error) => error.fieldId === ids.leg(legKey, field))?.message;
  const set = (patch: Partial<AirportLeg>) => onChange({ ...leg, ...patch });

  return (
    <div className="rounded-lg border border-border bg-sand-50 p-4 md:p-5">
      <h3 className="flex items-center gap-2 text-h5 text-ink-900">
        {icon}
        {title}
      </h3>

      <div className="mt-4">
        <Chip
          type="checkbox"
          checked={leg.required}
          onChange={(required) =>
            set({
              required,
              passengers: required && leg.passengers === "" ? defaultPassengers : leg.passengers,
            })
          }
        >
          {requiredLabel}
        </Chip>
      </div>

      {leg.required ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField
              id={ids.leg(legKey, "airport")}
              label="Airport"
              value={leg.airport}
              onChange={(event) => set({ airport: event.target.value })}
              error={errorFor("airport")}
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.value} value={airport.value}>
                  {airport.label}
                </option>
              ))}
            </SelectField>
            <div>
              <p className="text-body-sm font-semibold text-ink-900">{whenLabel}</p>
              <p className="mt-2 text-body text-ink-700">{when}</p>
            </div>
          </div>

          <div id={ids.leg(legKey, "vehicle")}>
            <FieldGroup legend="Vehicle type" error={errorFor("vehicle")}>
              <VehicleGrid
                name={`bk-${legKey}-vehicle`}
                value={leg.vehicle}
                onChange={(vehicle) => set({ vehicle })}
              />
            </FieldGroup>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              id={ids.leg(legKey, "passengers")}
              label="Number of passengers"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={leg.passengers}
              onChange={(event) => set({ passengers: event.target.value })}
              error={errorFor("passengers")}
            />
            <TextField
              id={ids.leg(legKey, "luggage")}
              label="Pieces of luggage"
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              value={leg.luggage}
              onChange={(event) => set({ luggage: event.target.value })}
              error={errorFor("luggage")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Airport pickup on arrival and drop-off on departure. */
export function TransfersSection({
  draft,
  onPickup,
  onDrop,
  errors,
}: {
  readonly draft: BookingDraft;
  readonly onPickup: (next: AirportLeg) => void;
  readonly onDrop: (next: AirportLeg) => void;
  readonly errors: readonly FormError[];
}) {
  const travellers = totalTravellers(draft.traveller);
  const defaultPassengers = travellers > 0 ? String(travellers) : "";

  return (
    <Card
      title="Airport transfers"
      description="Tick the ones you want. Leave both empty if you are arranging your own."
    >
      <Leg
        legKey="pickup"
        title="Airport pickup (arrival)"
        icon={<PlaneLanding size={20} aria-hidden className="text-jungle-600" />}
        requiredLabel="I need an airport pickup"
        whenLabel="Arrival date and time"
        when={formatWhen(draft.dates.arrivalDate, draft.dates.arrivalTime)}
        leg={draft.pickup}
        defaultPassengers={defaultPassengers}
        onChange={onPickup}
        errors={errors}
      />
      <Leg
        legKey="drop"
        title="Airport drop (departure)"
        icon={<PlaneTakeoff size={20} aria-hidden className="text-jungle-600" />}
        requiredLabel="I need an airport drop"
        whenLabel="Departure date and time"
        when={formatWhen(draft.dates.departureDate, draft.dates.departureTime)}
        leg={draft.drop}
        defaultPassengers={defaultPassengers}
        onChange={onDrop}
        errors={errors}
      />
    </Card>
  );
}
