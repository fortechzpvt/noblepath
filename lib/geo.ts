/**
 * Small, dependency-free geography helpers shared by the single-trip map
 * (D-25), its server-side validation and the staff email, and by the travel
 * graph in `lib/content.ts`. Safe to import on the client and the server.
 */

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

/**
 * A generous box around Sri Lanka, including its islands and a margin of sea.
 * Pickups and drop-offs outside it are rejected: the service only drives on
 * the island, and bounding the values keeps them from being arbitrary numbers.
 */
export const SRI_LANKA_BOUNDS = {
  south: 5.7,
  west: 79.4,
  north: 10.1,
  east: 82.1,
} as const;

export const SRI_LANKA_CENTER: GeoPoint = { lat: 7.8731, lng: 80.7718 };

export function isInSriLanka(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= SRI_LANKA_BOUNDS.south &&
    point.lat <= SRI_LANKA_BOUNDS.north &&
    point.lng >= SRI_LANKA_BOUNDS.west &&
    point.lng <= SRI_LANKA_BOUNDS.east
  );
}

/**
 * Five decimal places is about 1 m on the ground: precise enough for a driver
 * to find a pickup, without carrying the device's full, noisier precision.
 */
export function roundPoint(point: GeoPoint): GeoPoint {
  return { lat: Number(point.lat.toFixed(5)), lng: Number(point.lng.toFixed(5)) };
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Average effective road speed in km/h, and the factor that turns straight-line distance into road distance. */
export const ROAD_SPEED_KMH = 40;
export const ROAD_WINDING_FACTOR = 1.3;

/**
 * A rough road distance and drive time from two points: straight-line
 * distance × winding factor at an average speed. Advisory only (requirements
 * §7.5) — no routing service is called — and always shown as an estimate.
 */
export function estimateRoadTrip(a: GeoPoint, b: GeoPoint): { readonly km: number; readonly minutes: number } {
  const km = haversineKm(a, b) * ROAD_WINDING_FACTOR;
  return { km: Math.round(km), minutes: Math.round((km / ROAD_SPEED_KMH) * 60) };
}

/** "About 5 h 30 min" style duration for an estimate. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(5, Math.round(minutes / 5) * 5)} min`;
  const rounded = Math.round(minutes / 15) * 15;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatPoint(point: GeoPoint): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

/**
 * Links for staff. Built only from validated, bounded numbers formatted with
 * `toFixed`, so nothing a traveller typed can reach the URL.
 */
export function mapLinkFor(point: GeoPoint): string {
  const { lat, lng } = point;
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

export function directionsLinkFor(from: GeoPoint, to: GeoPoint): string {
  return (
    "https://www.google.com/maps/dir/?api=1" +
    `&origin=${from.lat.toFixed(5)},${from.lng.toFixed(5)}` +
    `&destination=${to.lat.toFixed(5)},${to.lng.toFixed(5)}&travelmode=driving`
  );
}
