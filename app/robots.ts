import type { MetadataRoute } from "next";

import { SITE_URL, isIndexable } from "@/lib/seo";

/**
 * robots.txt (D-38). Production allows everything except the API; previews and
 * staging disallow everything so they never compete with the live site.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
