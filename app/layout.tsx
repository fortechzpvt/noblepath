import type { Metadata, Viewport } from "next";
import { Playfair_Display, Poppins } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

import "./globals.css";

/**
 * Both faces are self-hosted by next/font at build time. That keeps the CSP free
 * of a third-party font origin and removes a render-blocking round trip on the
 * hero, which is the page that has to meet the LCP budget (NFR-1).
 *
 * `display: "swap"` plus next/font's metric-adjusted fallback is what the design
 * system refers to as "Playfair Display Fallback" / "Poppins Fallback" — the
 * fallback is size-matched, so swapping it in does not shift layout (NFR-2).
 */
const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
});

// `||`, not `??`: a host that declares this variable but leaves it blank
// (Vercel's project-creation prompt does exactly that when a value isn't
// entered) sets it to an empty string, not undefined, which `??` would not
// catch — and `new URL("")` throws, taking the whole production build down.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Noble Path — Explore Sri Lanka with us",
    template: "%s · Noble Path",
  },
  description:
    "Plan your journey across Sri Lanka. Curated destinations, unforgettable experiences and ready-made trips, arranged into a route that actually fits the days you have.",
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
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Noble Path",
    title: "Noble Path — Explore Sri Lanka with us",
    description:
      "Curated destinations, unforgettable experiences and ready-made trips across Sri Lanka.",
    url: siteUrl,
    images: [
      {
        url: "/images/hero/sigiriya-sunrise-2.jpg",
        width: 1600,
        height: 1200,
        alt: "Sigiriya rock fortress rising from jungle at sunrise, birds circling overhead",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Noble Path — Explore Sri Lanka with us",
    description:
      "Curated destinations, unforgettable experiences and ready-made trips across Sri Lanka.",
    images: ["/images/hero/sigiriya-sunrise-2.jpg"],
  },
  robots: { index: true, follow: true },
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
    <html lang="en" className={`${playfair.variable} ${poppins.variable}`}>
      <body>
        <a
          href="#main"
          className="np-sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[120] focus-visible:h-auto focus-visible:w-auto focus-visible:rounded-pill focus-visible:bg-ink-900 focus-visible:px-5 focus-visible:py-3 focus-visible:text-button focus-visible:text-white focus-visible:[clip-path:none]"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
