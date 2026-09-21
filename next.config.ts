import type { NextConfig } from "next";

/**
 * Security headers are applied to every route.
 *
 * The CSP is deliberately strict. `'unsafe-inline'` is required on style-src
 * because Next.js injects critical CSS as inline <style> tags during streaming,
 * and React inline `style` props are used for the hero's parallax transforms.
 * Script-src stays free of 'unsafe-inline' in production; in development Next's
 * HMR runtime requires 'unsafe-eval', so the directive is relaxed there only.
 */
const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // next/font self-hosts Playfair Display and Poppins at build time, so no
  // third-party font origin is needed at runtime.
  "font-src 'self' data:",
  // tile.openstreetmap.org serves the accommodation map tiles (Leaflet).
  "img-src 'self' data: blob: https://images.unsplash.com https://tile.openstreetmap.org",
  "connect-src 'self'" + (isDev ? " ws: wss:" : ""),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Required by the production Dockerfile — see docs/deployment/deployment.md.
  output: "standalone",
  images: {
    // Editorial photography we do not yet own is sourced from Unsplash.
    // See docs/decisions/architecture-decisions.md (ADR-006).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
    // Next's default only allows quality=75. The home hero requests 72
    // (components/home/hero.tsx) — without this, every request for it 400s.
    qualities: [72, 75],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
