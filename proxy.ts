import { NextResponse, type NextRequest } from "next/server";

/**
 * Lower-cases page URLs (D-39). Every route and slug on the site is lower
 * case, so `/Trips` or `/destinations/Kandy` (typed, or linked by someone
 * else) used to 404. A permanent redirect sends visitors and search engines to
 * the one real address.
 *
 * Only page paths: the matcher skips the API, Next's own assets, and files
 * under /images and /media, whose names are matched exactly.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const lower = pathname.toLowerCase();
  if (lower === pathname) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = lower;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!api/|_next/|images/|media/|favicon|robots\\.txt|sitemap\\.xml).*)"],
};
