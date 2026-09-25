import type { NextRequest, NextResponse } from "next/server";

import { handleEnquiryPost, methodNotAllowed } from "@/lib/enquiry-endpoint";
import { buildRideEmail } from "@/lib/ride-email";
import { rideRequestSchema, toRideEnquiry } from "@/lib/ride-validation";

/**
 * `POST /api/rides` — single point-to-point ride requests (D-24), e.g.
 * Matara to Kandy with a driver, booked without a full trip.
 *
 * Same pipeline as `POST /api/bookings` (`lib/enquiry-endpoint.ts`): size
 * guard, the shared per-client rate limit, strict schema, honeypot, Resend.
 * See `docs/api/endpoints.md` for the contract.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleEnquiryPost(request, {
    logTag: "rides",
    schema: rideRequestSchema,
    buildEmail: (validated, id) => {
      const enquiry = toRideEnquiry(validated);
      return { ...buildRideEmail(enquiry, id), replyTo: enquiry.contact.email };
    },
  });
}

export async function GET(): Promise<NextResponse> {
  return methodNotAllowed();
}
export async function PUT(): Promise<NextResponse> {
  return methodNotAllowed();
}
export async function PATCH(): Promise<NextResponse> {
  return methodNotAllowed();
}
export async function DELETE(): Promise<NextResponse> {
  return methodNotAllowed();
}
