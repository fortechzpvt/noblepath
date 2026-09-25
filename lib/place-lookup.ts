import type { GeoPoint } from "@/lib/geo";
import { MAX_PLACE_LENGTH } from "@/lib/ride-request";
import type { PlaceResult } from "@/lib/places";

/**
 * Browser-side calls to our own place endpoints (D-25). Never calls the
 * provider directly — see `lib/places.ts` for why.
 */

export type { PlaceResult };

export class PlaceLookupUnavailable extends Error {
  constructor() {
    super("Place search is unavailable.");
    this.name = "PlaceLookupUnavailable";
  }
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  } catch (error) {
    // Re-throw aborts so callers can tell "superseded" from "failed".
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new PlaceLookupUnavailable();
  }
  if (!response.ok) throw new PlaceLookupUnavailable();
  return response.json().catch(() => {
    throw new PlaceLookupUnavailable();
  });
}

const isPlace = (value: unknown): value is PlaceResult => {
  const p = value as Partial<PlaceResult> | null;
  return (
    typeof p?.name === "string" &&
    typeof p.detail === "string" &&
    typeof p.lat === "number" &&
    typeof p.lng === "number"
  );
};

export async function fetchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const body = (await getJson(`/api/places/search?${new URLSearchParams({ q: query })}`, signal)) as {
    places?: unknown;
  };
  return Array.isArray(body.places) ? body.places.filter(isPlace) : [];
}

/** Longest query sent to `/api/places/search`; the server rejects longer ones. */
export const MAX_SEARCH_LENGTH = 80;

/**
 * Only 4 decimals (~11 m) are sent — enough to name the nearest place, and
 * a query string ends up in platform access logs, so a traveller's precise
 * location should not (F-11). The pin itself keeps full precision.
 */
export async function fetchPlaceAt(point: GeoPoint, signal?: AbortSignal): Promise<PlaceResult | null> {
  const params = new URLSearchParams({ lat: point.lat.toFixed(4), lng: point.lng.toFixed(4) });
  const body = (await getJson(`/api/places/reverse?${params}`, signal)) as { place?: unknown };
  return isPlace(body.place) ? body.place : null;
}

/** The text a chosen place puts in the pickup or drop-off field. */
export function placeLabel(place: { readonly name: string; readonly detail: string }): string {
  const label = place.detail ? `${place.name}, ${place.detail}` : place.name;
  return label.slice(0, MAX_PLACE_LENGTH);
}
