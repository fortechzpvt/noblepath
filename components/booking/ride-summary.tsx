import type { ReactNode } from "react";

import type { RideDraft } from "@/lib/ride-request";
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

/** Read-only summary of a single-ride request, shown before it is submitted. */
export function RideSummary({ draft }: { readonly draft: RideDraft }) {
  const { ride: r, contact: c } = draft;
  return (
    <div className="flex flex-col gap-4">
      <Block title="Your ride">
        <Row label="From" value={r.pickup} />
        <Row label="To" value={r.dropoff} />
        <Row label="Outward" value={`${r.date} at ${r.time}`} />
        <Row
          label="Return"
          value={r.tripType === "return" ? `${r.returnDate} at ${r.returnTime}, ${r.dropoff} to ${r.pickup}` : "One way only"}
        />
        <Row label="Vehicle" value={r.vehicle ? vehicleLabel(r.vehicle) : "Not chosen"} />
        <Row label="Passengers" value={r.passengers} />
        <Row label="Luggage" value={`${r.luggage} ${r.luggage.trim() === "1" ? "piece" : "pieces"}`} />
        {r.notes.trim() ? <Row label="Notes" value={r.notes} /> : null}
      </Block>
      <Block title="Contact">
        <Row label="Name" value={c.fullName} />
        <Row label="Email" value={c.email} />
        <Row label="WhatsApp or phone" value={c.phone} />
      </Block>
      <Block title="Price">
        <p>Quotation. We price the ride for your vehicle and route, and reply with a quote.</p>
      </Block>
    </div>
  );
}
