import type { MetadataRoute } from "next";

import { getAllDestinations, getAllTrips } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";

/**
 * sitemap.xml (D-38): every indexable page. Built at build time from the same
 * content snapshot as the pages, so a destination or trip published in the
 * admin appears here on the next Publish.
 *
 * /bookings and /credits are left out on purpose: a form and a credits list
 * are not pages anyone should land on from search.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "weekly") => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("/", 1),
    page("/plan", 0.9),
    page("/trips", 0.9),
    page("/destinations", 0.8),
    page("/activities", 0.7),
    page("/accommodation", 0.7),
    page("/about", 0.4, "monthly"),
    ...getAllTrips().map((trip) => page(`/trips/${trip.slug}`, 0.8)),
    ...getAllDestinations().map((destination) => page(`/destinations/${destination.slug}`, 0.7)),
  ];
}
