import type { NextConfig } from "next";

/**
 * Admin security headers (D-36). Stricter than the public site's: nothing here
 * is ever framed, indexed, cached or sent a referrer.
 *
 * Images: uploaded media is served by this app (/media/…); site images
 * (/images/…) are previewed from the public site, and Unsplash is the one
 * remote source content may use (ADR-006).
 */
const isDev = process.env.NODE_ENV === "development";
const siteOrigin = new URL(process.env.PUBLIC_SITE_URL || "https://noblepath.lk").origin;

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${siteOrigin} https://images.unsplash.com`,
  "font-src 'self'",
  "connect-src 'self'" + (isDev ? " ws: wss:" : ""),
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  // admin/ is its own app inside the site's repository: pin the root so the
  // parent folder's lockfile is not mistaken for this app's workspace.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  experimental: {
    // Image uploads go through a Server Action. Vercel caps request bodies at
    // 4.5 MB, so the browser shrinks photos to under 4 MB first (upload-form.tsx).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
