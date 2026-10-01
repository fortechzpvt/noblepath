import type { Metadata, Viewport } from "next";
import { Abril_Fatface, Poppins } from "next/font/google";

import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { SiteHeader } from "@/components/site-header";
import { ScrollRevealFallback } from "@/components/scroll-reveal-fallback";
import { SiteFooter } from "@/components/site-footer";
import { ORGANIZATION_ID, PRODUCTION_SITE_URL, SITE_URL, WEBSITE_ID, isIndexable, jsonLdScript, shareImage } from "@/lib/seo";

import "./globals.css";

/**
 * Both faces are self-hosted by next/font at build time. That keeps the CSP free
 * of a third-party font origin and removes a render-blocking round trip on the
 * hero, which is the page that has to meet the LCP budget (NFR-1).
 *
 * `display: "swap"` plus next/font's metric-adjusted fallback keeps the swap from
 * shifting layout (NFR-2).
 *
 * The display face is Abril Fatface (D-30), a retro poster serif that replaced
 * Playfair Display. It ships in one weight only, so headings are set at 400 and
 * weight synthesis is switched off in globals.css; otherwise the browser would
 * fake a bold and smear it.
 */
const abril = Abril_Fatface({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-abril",
  weight: "400",
});

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Sri Lanka Trip Planner & Private Driver Tours | Noble Path",
    template: "%s | Noble Path",
  },
  description:
    "Plan your Sri Lanka trip with a local team: ready-made itineraries, 20+ destinations, stays and activities, and a private driver for the whole route.",
  applicationName: "Noble Path",
  keywords: [
    "Sri Lanka travel",
    "Sri Lanka itinerary",
    "trip planner Sri Lanka",
    "Sigiriya",
    "Ella",
    "Galle",
    "Yala safari",
  ],
  // No root canonical: a page that forgot its own must not canonicalise to home (D-38).
  openGraph: {
    type: "website",
    siteName: "Noble Path",
    title: "Sri Lanka Trip Planner & Private Driver Tours | Noble Path",
    description:
      "Ready-made Sri Lanka itineraries, destinations, stays and activities, with a private driver for the whole route.",
    images: [
      {
        url: shareImage("/images/hero/sigiriya-sunrise-2.jpg"),
        width: 1200,
        height: 900,
        alt: "Sigiriya rock fortress rising from jungle at sunrise, birds circling overhead",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sri Lanka Trip Planner & Private Driver Tours | Noble Path",
    description:
      "Ready-made Sri Lanka itineraries, destinations, stays and activities, with a private driver for the whole route.",
    images: [shareImage("/images/hero/sigiriya-sunrise-2.jpg")],
  },
  // Previews and staging are noindex; only the live origin is indexed (lib/seo.ts).
  robots: isIndexable ? { index: true, follow: true } : { index: false, follow: false },
};

/**
 * Who publishes the site (D-38). Only facts the site can stand behind: no
 * address, phone or social profiles are published yet, so none are claimed.
 * Trip pages point at this node by `@id` as their provider.
 */
const siteJsonLd = {
  "@graph": [
    {
      "@type": "TravelAgency",
      "@id": ORGANIZATION_ID,
      name: "Noble Path",
      url: `${PRODUCTION_SITE_URL}/`,
      image: `${PRODUCTION_SITE_URL}/images/hero/sigiriya-sunrise-2.jpg`,
      description:
        "A Sri Lanka travel planning service: ready-made and custom itineraries with a private driver, stays and activities.",
      areaServed: { "@type": "Country", name: "Sri Lanka" },
      knowsAbout: ["Sri Lanka itineraries", "Private driver tours in Sri Lanka", "Sri Lanka travel planning"],
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: "Noble Path",
      url: `${PRODUCTION_SITE_URL}/`,
      inLanguage: "en",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0F0D",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${abril.variable} ${poppins.variable}`}>
      <body>
        <a
          href="#main"
          className="np-sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[120] focus-visible:h-auto focus-visible:w-auto focus-visible:rounded-pill focus-visible:bg-ink-900 focus-visible:px-5 focus-visible:py-3 focus-visible:text-button focus-visible:text-white focus-visible:[clip-path:none]"
        >
          Skip to main content
        </a>
        {/* Escaped JSON (lib/seo.ts). Previews carry it too, but they are noindex. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(siteJsonLd)} />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <ScrollRevealFallback />
        <AnalyticsBeacon />
      </body>
    </html>
  );
}
