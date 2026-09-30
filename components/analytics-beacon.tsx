"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Counts one page view per navigation for the admin statistics (D-36).
 *
 * Sends only the path (no query string, stripped again on the server) and the
 * referrer, with `sendBeacon` so it never delays navigation. No cookies, no
 * storage, no identifiers: see `app/api/track/route.ts`. Honours Do Not Track
 * and Global Privacy Control by sending nothing at all.
 */
export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return;
    const body = JSON.stringify({ p: pathname, r: document.referrer });
    if (typeof nav.sendBeacon === "function") {
      nav.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    }
  }, [pathname]);

  return null;
}
