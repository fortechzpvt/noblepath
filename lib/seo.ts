import type { Metadata } from "next";

/**
 * Search-engine helpers (D-38): one place for the site's absolute URL, the
 * "may this deployment be indexed?" rule, per-page metadata and JSON-LD.
 *
 * Deliberately free of `lib/env.ts`: that module validates booking/email
 * secrets at load time, and robots/sitemap/metadata must not depend on them.
 */

/** The live site. Only a deployment serving exactly this origin is indexed. */
export const PRODUCTION_SITE_URL = "https://www.noblepathsrilanka.com";

// `||`, not `??`: a blank variable on the host must fall back, not become "".
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * Previews and staging are production *builds*, so NODE_ENV cannot tell them
 * apart. A deployment is indexable only when it is Vercel's production
 * environment (or not on Vercel at all, e.g. the Docker image) AND it is
 * configured with the production origin. Everything else sends noindex and a
 * disallow-all robots.txt, so a preview can never compete with the live site.
 */
export function indexableFor(siteUrl: string, vercelEnv: string | undefined): boolean {
  return (
    siteUrl.replace(/\/$/, "") === PRODUCTION_SITE_URL && (vercelEnv === undefined || vercelEnv === "production")
  );
}

export const isIndexable: boolean = indexableFor(SITE_URL, process.env.VERCEL_ENV);

export const ORGANIZATION_ID = `${PRODUCTION_SITE_URL}/#organization`;
export const WEBSITE_ID = `${PRODUCTION_SITE_URL}/#website`;

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).href;
}

/** Shortens to at most `max` characters on a word boundary, for meta descriptions. */
export function clip(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}

interface PageSeo {
  /** Without the " | Noble Path" suffix; the root title template adds it. */
  readonly title: string;
  readonly description: string;
  /** Site-relative path, e.g. "/trips". Becomes the canonical and og:url. */
  readonly path: string;
  readonly image?: { readonly src: string; readonly alt: string };
  readonly type?: "website" | "article";
}

/**
 * Title, description, canonical, Open Graph and Twitter for one page, so no
 * page silently inherits the home page's og:title/og:url (the pre-D-38 bug).
 */
export function pageMetadata({ title, description, path, image, type = "website" }: PageSeo): Metadata {
  const fullTitle = `${title} | Noble Path`;
  const images = image ? [{ url: image.src, alt: image.alt }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: "Noble Path", title: fullTitle, description, url: path, images },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: image ? [image.src] : undefined },
  };
}

/** A schema.org BreadcrumbList from (name, path) pairs, home first. */
export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** A schema.org FAQPage from question/answer pairs that are also shown on the page. */
export function faqJsonLd(faqs: readonly { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Serialises JSON-LD for a <script type="application/ld+json">. Escaping `<`
 * stops any content string from closing the script element.
 */
export function jsonLdScript(data: object): { __html: string } {
  return { __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") };
}
