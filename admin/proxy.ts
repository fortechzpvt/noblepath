import { NextResponse, type NextRequest } from "next/server";

/**
 * First filter only (D-36): a request with no session cookie is sent to the
 * sign-in page before any page code runs. The real check, against the
 * database, is `requireAdmin()` in every page, action and route; a forged or
 * expired cookie gets through here and is refused there.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("__Host-np_admin")) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
