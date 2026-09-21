import { Card } from "@/components/booking/ui";
import { TextField, TextareaField } from "@/components/ui/field";
import { ids, type FormError, type TravellerDetails } from "@/lib/booking-request";

/** Traveller details and party size. */
export function TravellerSection({
  value,
  onChange,
  errors,
}: {
  readonly value: TravellerDetails;
  readonly onChange: (next: TravellerDetails) => void;
  readonly errors: readonly FormError[];
}) {
  const errorFor = (id: string) => errors.find((error) => error.fieldId === id)?.message;
  const set = (patch: Partial<TravellerDetails>) => onChange({ ...value, ...patch });

  return (
    <Card title="Traveller details" description="Who should we reply to?">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          id={ids.fullName}
          label="Full name"
          autoComplete="name"
          value={value.fullName}
          onChange={(event) => set({ fullName: event.target.value })}
          error={errorFor(ids.fullName)}
          maxLength={100}
        />
        <TextField
          id={ids.nationality}
          label="Nationality"
          autoComplete="country-name"
          value={value.nationality}
          onChange={(event) => set({ nationality: event.target.value })}
          error={errorFor(ids.nationality)}
          maxLength={60}
        />
        <TextField
          id={ids.email}
          label="Email"
          type="email"
          autoComplete="email"
          value={value.email}
          onChange={(event) => set({ email: event.target.value })}
          error={errorFor(ids.email)}
          maxLength={254}
        />
        <TextField
          id={ids.phone}
          label="WhatsApp or phone number"
          type="tel"
          autoComplete="tel"
          description="Include the country code, for example +94 77 123 4567."
          value={value.phone}
          onChange={(event) => set({ phone: event.target.value })}
          error={errorFor(ids.phone)}
          maxLength={24}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <TextField
          id={ids.adults}
          label="Adults"
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={value.adults}
          onChange={(event) => set({ adults: event.target.value })}
          error={errorFor(ids.adults)}
        />
        <TextField
          id={ids.children}
          label="Children"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={value.children}
          onChange={(event) => set({ children: event.target.value })}
          error={errorFor(ids.children)}
        />
        <TextField
          id={ids.infants}
          label="Infants"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          value={value.infants}
          onChange={(event) => set({ infants: event.target.value })}
          error={errorFor(ids.infants)}
        />
      </div>

      <TextareaField
        id="bk-specialRequirements"
        label="Special requirements"
        optional
        description="Dietary needs, mobility, celebrations, anything we should know."
        value={value.specialRequirements}
        onChange={(event) => set({ specialRequirements: event.target.value })}
        maxLength={2000}
      />
    </Card>
  );
}
