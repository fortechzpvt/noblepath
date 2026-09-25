import type { GeoPoint } from "@/lib/geo";

/**
 * Common single-trip pickup and drop-off points, shown instantly as the
 * traveller types (D-25) and used as the fallback when the place-search
 * provider is unavailable.
 *
 * Coordinates are OpenStreetMap place nodes (and the two airports' aerodrome
 * features), looked up once through Photon on 2026-09-25 and rounded to five
 * decimals. Data © OpenStreetMap contributors, ODbL. `detail` is the district
 * OSM files the place under.
 */
export interface KnownPlace extends GeoPoint {
  readonly name: string;
  readonly detail: string;
}

export const KNOWN_PLACES: readonly KnownPlace[] = [
  { name: "Bandaranaike International Airport (CMB)", detail: "Katunayake, Gampaha District", lat: 7.17893, lng: 79.88573 },
  { name: "Mattala Rajapaksa International Airport (HRI)", detail: "Hambantota District", lat: 6.28538, lng: 81.12177 },
  { name: "Colombo", detail: "Colombo District", lat: 6.93886, lng: 79.8542 },
  { name: "Negombo", detail: "Gampaha District", lat: 7.20943, lng: 79.83312 },
  { name: "Kandy", detail: "Kandy District", lat: 7.29312, lng: 80.63504 },
  { name: "Nuwara Eliya", detail: "Nuwara Eliya District", lat: 6.97397, lng: 80.76699 },
  { name: "Ella", detail: "Badulla District", lat: 6.87361, lng: 81.04899 },
  { name: "Haputale", detail: "Badulla District", lat: 6.76815, lng: 80.96023 },
  { name: "Badulla", detail: "Badulla District", lat: 6.99004, lng: 81.05703 },
  { name: "Sigiriya", detail: "Matale District", lat: 7.94981, lng: 80.74635 },
  { name: "Dambulla", detail: "Matale District", lat: 7.8742, lng: 80.65109 },
  { name: "Habarana", detail: "Anuradhapura District", lat: 8.04232, lng: 80.75646 },
  { name: "Polonnaruwa", detail: "Polonnaruwa District", lat: 7.93954, lng: 81.00034 },
  { name: "Anuradhapura", detail: "Anuradhapura District", lat: 8.33498, lng: 80.41061 },
  { name: "Trincomalee", detail: "Trincomalee District", lat: 8.57643, lng: 81.2345 },
  { name: "Nilaveli", detail: "Trincomalee District", lat: 8.68154, lng: 81.19161 },
  { name: "Jaffna", detail: "Jaffna District", lat: 9.66509, lng: 80.0093 },
  { name: "Point Pedro", detail: "Jaffna District", lat: 9.8241, lng: 80.23618 },
  { name: "Kilinochchi", detail: "Kilinochchi District", lat: 9.38401, lng: 80.40872 },
  { name: "Mannar", detail: "Mannar District", lat: 8.98129, lng: 79.90439 },
  { name: "Vavuniya", detail: "Vavuniya District", lat: 8.75935, lng: 80.50008 },
  { name: "Batticaloa", detail: "Batticaloa District", lat: 7.7356, lng: 81.6942 },
  { name: "Pasikudah", detail: "Batticaloa District", lat: 7.92245, lng: 81.56508 },
  { name: "Arugam Bay", detail: "Ampara District", lat: 6.84685, lng: 81.8307 },
  { name: "Ampara", detail: "Ampara District", lat: 7.29781, lng: 81.67902 },
  { name: "Galle", detail: "Galle District", lat: 6.03281, lng: 80.21496 },
  { name: "Unawatuna", detail: "Galle District", lat: 6.02018, lng: 80.24748 },
  { name: "Hikkaduwa", detail: "Galle District", lat: 6.14075, lng: 80.10282 },
  { name: "Bentota", detail: "Galle District", lat: 6.42153, lng: 79.99785 },
  { name: "Mirissa", detail: "Matara District", lat: 5.94936, lng: 80.45581 },
  { name: "Weligama", detail: "Matara District", lat: 5.97543, lng: 80.42956 },
  { name: "Matara", detail: "Matara District", lat: 5.94782, lng: 80.54829 },
  { name: "Tangalle", detail: "Hambantota District", lat: 6.02508, lng: 80.79493 },
  { name: "Hambantota", detail: "Hambantota District", lat: 6.12491, lng: 81.12426 },
  { name: "Tissamaharama (Yala)", detail: "Hambantota District", lat: 6.27707, lng: 81.28928 },
  { name: "Udawalawe", detail: "Ratnapura District", lat: 6.42414, lng: 80.81721 },
  { name: "Ratnapura", detail: "Ratnapura District", lat: 6.68037, lng: 80.4023 },
  { name: "Kitulgala", detail: "Kegalle District", lat: 6.99787, lng: 80.40849 },
  { name: "Kurunegala", detail: "Kurunegala District", lat: 7.48705, lng: 80.36491 },
  { name: "Puttalam", detail: "Puttalam District", lat: 8.0316, lng: 79.83003 },
  { name: "Kalpitiya", detail: "Puttalam District", lat: 8.23681, lng: 79.76615 },
  { name: "Chilaw", detail: "Puttalam District", lat: 7.57626, lng: 79.79536 },
];

/** Case-insensitive prefix-of-any-word match, best (whole-name prefix) first. */
export function matchKnownPlaces(query: string, limit = 5): KnownPlace[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const starts: KnownPlace[] = [];
  const words: KnownPlace[] = [];
  for (const place of KNOWN_PLACES) {
    const name = place.name.toLowerCase();
    if (name.startsWith(q)) starts.push(place);
    else if (name.split(/[\s(]+/).some((word) => word.startsWith(q))) words.push(place);
  }
  return [...starts, ...words].slice(0, limit);
}
