import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, methodNotAllowed } from "@/lib/enquiry-endpoint";
import { isInSriLanka } from "@/lib/geo";
import { reversePlace, type PlaceResult } from "@/lib/places";
import { crossSiteRejected, lookupFailed, placesRateLimited } from "@/lib/places-endpoint";

/**
 * `GET /api/places/reverse?lat=<n>&lng=<n>` — the nearest named place to a
 * point in Sri Lanka, used to name a map pin or the traveller's current
 * location (D-25). `place` is `null` when nothing named is nearby. The point
 * is coarsened to ~11 m before it is sent upstream (`lib/places.ts`).
 */
export const runtime = "nodejs";

const coordinate = z
  .string()
  .trim()
  .max(20)
  .regex(/^-?\d{1,3}(\.\d{1,10})?$/)
  .transform(Number);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = crypto.randomUUID();
  const rejected = crossSiteRejected(request, correlationId);
  if (rejected) return rejected;
  const limited = placesRateLimited(request, correlationId);
  if (limited) return limited;

  const lat = coordinate.safeParse(request.nextUrl.searchParams.get("lat") ?? "");
  const lng = coordinate.safeParse(request.nextUrl.searchParams.get("lng") ?? "");
  if (!lat.success || !lng.success || !isInSriLanka({ lat: lat.data, lng: lng.data })) {
    return errorResponse(400, "validation_failed", "Choose a point in Sri Lanka.", correlationId);
  }

  try {
    const place = await reversePlace({ lat: lat.data, lng: lng.data });
    return NextResponse.json<{ place: PlaceResult | null }>({ place });
  } catch (error) {
    return lookupFailed("places.reverse", error, correlationId);
  }
}

export async function POST(): Promise<NextResponse> {
  return methodNotAllowed("GET");
}
