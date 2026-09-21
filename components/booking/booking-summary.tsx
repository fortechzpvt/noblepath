import type { ReactNode } from "react";

import type { NamedOption, TripOption } from "@/components/booking/plan-section";
import {
  AIRPORTS,
  STAY_KINDS,
  TIERS,
  estimatePrice,
  tripLength,
  totalTravellers,
  type AirportLeg,
  type BookingDraft,
} from "@/lib/booking-request";
import { interestName } from "@/lib/format";
import { vehicleLabel } from "@/lib/transfers";


function Block({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-h5 text-ink-900">{title}</h3>
      <div className="mt-3 flex flex-col gap-2 text-body-sm text-ink-700">{children}</div>
    </section>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: ReactNode }) {
  return (
    <p>
      <span className="text-text-meta">{label}: </span>
      <span className="text-ink-900">{value}</span>
    </p>
  );
}

const nameOf = (list: readonly NamedOption[], slug: string) =>
  list.find((item) => item.slug === slug)?.name ?? slug;

const tierLabel = (value: string) => TIERS.find((t) => t.value === value)?.label ?? value;
const kindLabel = (value: string) => STAY_KINDS.find((k) => k.value === value)?.label ?? value;

function legText(leg: AirportLeg, when: string): string {
  if (!leg.required) return "Not needed";
  const airport = AIRPORTS.find((a) => a.value === leg.airport)?.label ?? leg.airport;
  const vehicle = leg.vehicle ? vehicleLabel(leg.vehicle) : "no vehicle chosen";
  return `${airport}, ${when}, ${vehicle}, ${leg.passengers} passengers, ${leg.luggage} pieces of luggage`;
}

/** Read-only summary of the request, shown before it is submitted. */
export function BookingSummary({
  draft,
  trips,
  destinations,
  experiences,
}: {
  readonly draft: BookingDraft;
  readonly trips: readonly TripOption[];
  readonly destinations: readonly NamedOption[];
  readonly experiences: readonly NamedOption[];
}) {
  const t = draft.traveller;
  const d = draft.dates;
  const length = tripLength(d.arrivalDate, d.departureDate);
  const trip = trips.find((option) => option.slug === draft.packageSlug) ?? null;
  const estimate = estimatePrice(draft, trip ? trip.band : null);
  const p = draft.preferences;

  return (
    <div className="flex flex-col gap-4">
      <Block title="Traveller details">
        <Row label="Name" value={t.fullName} />
        <Row label="Nationality" value={t.nationality} />
        <Row label="Email" value={t.email} />
        <Row label="WhatsApp or phone" value={t.phone} />
        <Row
          label="Travellers"
          value={`${t.adults} adults, ${t.children} children, ${t.infants} infants (${totalTravellers(t)} in total)`}
        />
        {t.specialRequirements.trim() ? (
          <Row label="Special requirements" value={t.specialRequirements} />
        ) : null}
      </Block>

      <Block title="Trip dates">
        <Row label="Arrival" value={`${d.arrivalDate} at ${d.arrivalTime}`} />
        <Row label="Departure" value={`${d.departureDate} at ${d.departureTime}`} />
        <Row
          label="Length"
          value={length ? `${length.nights} nights, ${length.days} days` : "Not set"}
        />
      </Block>

      <Block title="Airport transfers">
        <Row label="Pickup" value={legText(draft.pickup, `${d.arrivalDate} at ${d.arrivalTime}`)} />
        <Row label="Drop" value={legText(draft.drop, `${d.departureDate} at ${d.departureTime}`)} />
      </Block>

      {draft.planChoice === "package" ? (
        <Block title="Pre-planned trip">
          <Row label="Package" value={trip ? `${trip.name} (${trip.durationDays} days)` : "None"} />
        </Block>
      ) : draft.customMode === "choose" ? (
        <>
          <Block title="Accommodation">
            {draft.stays.length === 0 ? <p>None chosen.</p> : null}
            {draft.stays.map((s, i) => (
              <p key={s.id}>
                {i + 1}. {nameOf(destinations, s.destination)}: {tierLabel(s.tier)}{" "}
                {kindLabel(s.kind).toLowerCase()}, {s.roomType} room, {s.guests} guests,{" "}
                {s.checkIn} to {s.checkOut}
              </p>
            ))}
          </Block>
          <Block title="Activities">
            {draft.activities.length === 0 ? <p>None chosen.</p> : null}
            {draft.activities.map((a, i) => (
              <p key={a.id}>
                {i + 1}. {a.activity === "other" ? a.otherName : nameOf(experiences, a.activity)}{" "}
                on {a.date}, {a.participants} participants
              </p>
            ))}
          </Block>
          <Block title="Transportation">
            {draft.transport.length === 0 ? <p>None chosen.</p> : null}
            {draft.transport.map((x, i) => (
              <p key={x.id}>
                {i + 1}. {x.vehicle ? vehicleLabel(x.vehicle) : ""}, {x.mode}, {x.pickup} to{" "}
                {x.dropoff} on {x.date}
              </p>
            ))}
          </Block>
        </>
      ) : (
        <Block title="Your preferences">
          <Row
            label="Destinations"
            value={p.destinations.map((slug) => nameOf(destinations, slug)).join(", ")}
          />
          <Row
            label="Accommodation"
            value={[p.tier ? tierLabel(p.tier) : "", p.kind ? kindLabel(p.kind) : ""]
              .filter(Boolean)
              .join(", ") || "No preference"}
          />
          <Row
            label="Activities"
            value={p.interests.map(interestName).join(", ") || "No preference"}
          />
          <Row label="Vehicle" value={p.vehicle ? vehicleLabel(p.vehicle) : "No preference"} />
          <Row label="Days" value={p.days} />
          <Row label="Approximate budget" value={p.budget ? `USD ${p.budget}` : "Not given"} />
          {p.requests.trim() ? <Row label="Special requests" value={p.requests} /> : null}
        </Block>
      )}

      <Block title="Estimated price">
        <p className="text-h5 text-ink-900">
          {estimate.kind === "band" ? "Indicative price" : "Custom quotation"}
        </p>
        <p>{estimate.text}</p>
      </Block>
    </div>
  );
}
