import type { NextRequest, NextResponse } from "next/server";

import { buildBookingEmail } from "@/lib/booking-email";
import { handleEnquiryPost, methodNotAllowed } from "@/lib/enquiry-endpoint";
import { bookingDraftRequestSchema, toBookingDraftEnquiry } from "@/lib/validation";

/**
 * `POST /api/bookings` — full-trip booking requests (D-19, D-23).
 *
 * Runs on the Node.js runtime (the default for a route handler, made explicit
 * here): it needs the global Web Crypto `crypto.getRandomValues`
 * (`generateBookingRequestId`) and the Resend SDK, both of which work on
 * Node.js. The request pipeline (size guard, rate limit, honeypot, delivery)
 * lives in `lib/enquiry-endpoint.ts`, shared with `POST /api/rides` (D-24).
 * See `docs/api/endpoints.md` for the full contract.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleEnquiryPost(request, {
    logTag: "bookings",
    schema: bookingDraftRequestSchema,
    buildEmail: (validated, id) => {
      // The honeypot is dropped so it can never reach the notification email.
      const enquiry = toBookingDraftEnquiry(validated);
      return { ...buildBookingEmail(enquiry, id), replyTo: enquiry.traveller.email };
    },
  });
}

// Every other method gets the same structured error envelope every route on
// this API uses, rather than Next's bare default 405.
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
