import { AIRPORTS, STAY_KINDS, TIERS, type AirportLeg } from "@/lib/booking-request";
import {
  getAccommodationBySlug,
  getDestinationBySlug,
  getExperienceBySlug,
  getTripBySlug,
} from "@/lib/content";
import { formatPriceBand, interestName } from "@/lib/format";
import { vehicleLabel } from "@/lib/transfers";
import type { BookingDraftEnquiry } from "@/lib/validation";

/**
 * Composes the staff notification email for a validated booking request
 * (D-23). Plain text only, deliberately: this field set is large, and plain
 * text sidesteps HTML-injection concerns entirely rather than needing an
 * escaping discipline across every one of these fields — a staff inbox does
 * not need styled mail to be useful. The grouping mirrors
 * `components/booking/booking-summary.tsx`, the on-screen equivalent the
 * traveller reviewed before submitting, so the two never tell staff and
 * traveller different stories about the same request.
 *
 * Names are resolved from `lib/content.ts` here rather than passed in, unlike
 * the client component (which is handed `destinations`/`experiences` props) —
 * this runs server-side, so the full content module is already in scope.
 */

const destinationName = (slug: string): string => getDestinationBySlug(slug)?.name ?? slug;
const experienceName = (slug: string): string => getExperienceBySlug(slug)?.name ?? slug;
const tierLabel = (value: string): string => TIERS.find((t) => t.value === value)?.label ?? value;
const kindLabel = (value: string): string => STAY_KINDS.find((k) => k.value === value)?.label ?? value;
const airportLabel = (value: string): string => AIRPORTS.find((a) => a.value === value)?.label ?? value;

function legLine(label: string, leg: AirportLeg, when: string): string {
  if (!leg.required) return `${label}: not needed`;
  const vehicle = leg.vehicle ? vehicleLabel(leg.vehicle) : "no vehicle chosen";
  return `${label}: ${airportLabel(leg.airport)}, ${when}, ${vehicle}, ${leg.passengers} passengers, ${leg.luggage} pieces of luggage`;
}

function estimatePriceLine(enquiry: BookingDraftEnquiry): string {
  if (enquiry.planChoice === "package") {
    const trip = enquiry.packageSlug ? getTripBySlug(enquiry.packageSlug) : undefined;
    if (trip) {
      return `${formatPriceBand(trip.priceBandPerPerson)} per person, indicative — confirm with a written quotation.`;
    }
  }
  return "Custom quotation — price to be confirmed.";
}

/**
 * Subject-line control-character guard.
 *
 * The Resend SDK sends a structured JSON payload over HTTPS, not a raw SMTP
 * conversation, so classic CRLF header injection does not apply the way it
 * would with a hand-built `Subject:` line over `sendmail` — but stripping
 * `\r`/`\n` from the one field that becomes a mail header costs nothing and
 * removes the question entirely rather than relying on that distinction
 * holding forever.
 */
function sanitiseSubjectFragment(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildBookingEmail(
  enquiry: BookingDraftEnquiry,
  id: string,
): { readonly subject: string; readonly text: string } {
  const t = enquiry.traveller;
  const d = enquiry.dates;
  const lines: string[] = [];

  const add = (line: string = "") => lines.push(line);
  const heading = (title: string) => {
    add(title);
    add("-".repeat(title.length));
  };

  add(`Booking request ${id}`);
  add();

  heading("Traveller details");
  add(`Name: ${t.fullName}`);
  add(`Nationality: ${t.nationality}`);
  add(`Email: ${t.email}`);
  add(`WhatsApp / phone: ${t.phone}`);
  add(`Travellers: ${t.adults} adults, ${t.children} children, ${t.infants} infants`);
  if (t.specialRequirements.trim()) add(`Special requirements: ${t.specialRequirements}`);
  add();

  heading("Trip dates");
  add(`Arrival: ${d.arrivalDate} at ${d.arrivalTime}`);
  add(`Departure: ${d.departureDate} at ${d.departureTime}`);
  add();

  heading("Airport transfers");
  add(legLine("Pickup", enquiry.pickup, `${d.arrivalDate} at ${d.arrivalTime}`));
  add(legLine("Drop", enquiry.drop, `${d.departureDate} at ${d.departureTime}`));
  add();

  if (enquiry.plannedItinerary) {
    heading("Saved itinerary (from the trip planner)");
    add(`Length: ${enquiry.plannedItinerary.days} days`);
    add(`Route: ${enquiry.plannedItinerary.destinationSlugs.map(destinationName).join(" - ")}`);
    if (enquiry.plannedItinerary.interests.length > 0) {
      add(`Interests: ${enquiry.plannedItinerary.interests.map(interestName).join(", ")}`);
    }
    add();
  }

  if (enquiry.planChoice === "package") {
    const trip = enquiry.packageSlug ? getTripBySlug(enquiry.packageSlug) : undefined;
    heading("Pre-planned trip");
    add(trip ? `${trip.name} (${trip.durationDays} days)` : `Unknown package (${enquiry.packageSlug})`);
    add();
  } else if (enquiry.customMode === "choose") {
    heading("Accommodation");
    if (enquiry.stays.length === 0) add("None chosen.");
    enquiry.stays.forEach((stay, index) => {
      const property = stay.accommodationSlug ? getAccommodationBySlug(stay.accommodationSlug) : undefined;
      add(
        `${index + 1}. ${property ? `"${property.name}", ` : ""}${destinationName(stay.destination)}: ` +
          `${tierLabel(stay.tier)} ${kindLabel(stay.kind).toLowerCase()}, ${stay.roomType} room, ` +
          `${stay.guests} guests, ${stay.checkIn} to ${stay.checkOut}`,
      );
    });
    add();

    heading("Activities");
    if (enquiry.activities.length === 0) add("None chosen.");
    enquiry.activities.forEach((activity, index) => {
      const name = activity.activity === "other" ? activity.otherName : experienceName(activity.activity);
      add(`${index + 1}. ${name} on ${activity.date}, ${activity.participants} participants`);
    });
    add();

    heading("Transportation");
    if (enquiry.transport.length === 0) add("None chosen.");
    enquiry.transport.forEach((entry, index) => {
      const vehicle = entry.vehicle ? vehicleLabel(entry.vehicle) : "no vehicle chosen";
      add(`${index + 1}. ${vehicle}, ${entry.mode}, ${entry.pickup} to ${entry.dropoff} on ${entry.date}`);
    });
    add();
  } else {
    const p = enquiry.preferences;
    heading("Preferences");
    add(`Destinations: ${p.destinations.map(destinationName).join(", ") || "None given"}`);
    add(
      `Accommodation: ${[p.tier ? tierLabel(p.tier) : "", p.kind ? kindLabel(p.kind) : ""].filter(Boolean).join(", ") || "No preference"}`,
    );
    add(`Activities: ${p.interests.map(interestName).join(", ") || "No preference"}`);
    add(`Vehicle: ${p.vehicle ? vehicleLabel(p.vehicle) : "No preference"}`);
    add(`Days: ${p.days}`);
    add(`Approximate budget: ${p.budget ? `USD ${p.budget}` : "Not given"}`);
    if (p.requests.trim()) add(`Special requests: ${p.requests}`);
    add();
  }

  heading("Estimated price");
  add(estimatePriceLine(enquiry));
  add();

  add(`Reply to this email to reach the traveller directly at ${t.email}.`);

  const subject = sanitiseSubjectFragment(`Booking request ${id} — ${t.fullName || "new enquiry"}`);
  return { subject, text: lines.join("\n") };
}
