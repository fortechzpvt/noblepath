import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, methodNotAllowed } from "@/lib/enquiry-endpoint";
import { searchPlaces, type PlaceResult } from "@/lib/places";
import { crossSiteRejected, lookupFailed, placesRateLimited } from "@/lib/places-endpoint";
import { isSingleLineText } from "@/lib/safe-text";

/**
 * `GET /api/places/search?q=<text>` — Sri Lankan places matching a query, for
 * the single-trip pickup and drop-off fields (D-25). Read-only; proxies to
 * Photon via `lib/places.ts`. See `docs/api/endpoints.md`.
 */
export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 80; // matches MAX_SEARCH_LENGTH in lib/place-lookup.ts

const querySchema = z
  .string()
  .trim()
  .min(2, { message: "Type at least 2 characters to search." })
  .max(MAX_QUERY_LENGTH, { message: `Keep your search under ${MAX_QUERY_LENGTH} characters.` })
  .refine(isSingleLineText, { message: "Use letters, numbers and ordinary punctuation to search." });

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = crypto.randomUUID();
  const rejected = crossSiteRejected(request, correlationId);
  if (rejected) return rejected;
  const limited = placesRateLimited(request, correlationId);
  if (limited) return limited;

  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Type at least 2 characters to search.";
    return errorResponse(400, "validation_failed", message, correlationId);
  }

  try {
    const places = await searchPlaces(parsed.data);
    return NextResponse.json<{ places: PlaceResult[] }>({ places });
  } catch (error) {
    return lookupFailed("places.search", error, correlationId);
  }
}

export async function POST(): Promise<NextResponse> {
  return methodNotAllowed("GET");
}
