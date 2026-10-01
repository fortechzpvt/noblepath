"use client";

import { useSyncExternalStore } from "react";

import { todayIso } from "@/lib/booking-request";

const noSubscription = () => () => {};

/**
 * Today's date in the visitor's own time zone, for date inputs' `min` (D-39).
 *
 * Calling `todayIso()` during render gave the server's date (UTC) in the HTML
 * and the visitor's date in the browser, a hydration mismatch that left
 * yesterday as the minimum for Sri Lanka visitors between midnight and 05:30.
 * The server snapshot is "" (no minimum); the browser uses its own date.
 */
export function useToday(): string {
  return useSyncExternalStore(noSubscription, todayIso, () => "");
}
