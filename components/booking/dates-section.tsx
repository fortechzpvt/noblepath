import { Card } from "@/components/booking/ui";
import { TextField } from "@/components/ui/field";
import { ids, todayIso, tripLength, type FormError, type TripDates } from "@/lib/booking-request";

/** Arrival and departure, with nights and days worked out for the traveller. */
export function DatesSection({
  value,
  onChange,
  errors,
}: {
  readonly value: TripDates;
  readonly onChange: (next: TripDates) => void;
  readonly errors: readonly FormError[];
}) {
  const errorFor = (id: string) => errors.find((error) => error.fieldId === id)?.message;
  const set = (patch: Partial<TripDates>) => onChange({ ...value, ...patch });
  const length = tripLength(value.arrivalDate, value.departureDate);

  return (
    <Card title="Trip dates" description="Use local Sri Lanka time for both times.">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          id={ids.arrivalDate}
          label="Arrival date"
          type="date"
          min={todayIso()}
          value={value.arrivalDate}
          onChange={(event) => set({ arrivalDate: event.target.value })}
          error={errorFor(ids.arrivalDate)}
        />
        <TextField
          id={ids.arrivalTime}
          label="Arrival time"
          type="time"
          value={value.arrivalTime}
          onChange={(event) => set({ arrivalTime: event.target.value })}
          error={errorFor(ids.arrivalTime)}
        />
        <TextField
          id={ids.departureDate}
          label="Departure date"
          type="date"
          min={value.arrivalDate || todayIso()}
          value={value.departureDate}
          onChange={(event) => set({ departureDate: event.target.value })}
          error={errorFor(ids.departureDate)}
        />
        <TextField
          id={ids.departureTime}
          label="Departure time"
          type="time"
          value={value.departureTime}
          onChange={(event) => set({ departureTime: event.target.value })}
          error={errorFor(ids.departureTime)}
        />
      </div>

      <dl aria-live="polite" className="grid grid-cols-2 gap-4 rounded-lg bg-jungle-50 p-4">
        <div>
          <dt className="text-small text-text-meta">Number of nights</dt>
          <dd className="text-h5 text-ink-900">{length ? length.nights : "Pick both dates"}</dd>
        </div>
        <div>
          <dt className="text-small text-text-meta">Number of days</dt>
          <dd className="text-h5 text-ink-900">{length ? length.days : "Pick both dates"}</dd>
        </div>
      </dl>
    </Card>
  );
}
