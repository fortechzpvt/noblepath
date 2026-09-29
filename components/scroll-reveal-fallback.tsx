"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll reveals for browsers without CSS scroll timelines (D-31).
 *
 * Chrome, Edge and current Safari run `.np-reveal` as a CSS scroll-driven
 * animation and this component does nothing there. Elsewhere (Firefox, older
 * Safari) it marks <html> with `np-sdt-fallback`, which hides reveal targets
 * until an IntersectionObserver adds `.np-in` as each one enters the viewport.
 *
 * It re-scans on every route change, because client-side navigation mounts new
 * `.np-reveal` elements without reloading the page. Nothing runs under
 * prefers-reduced-motion: the CSS for both engines is gated on it too.
 */
export function ScrollRevealFallback() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.documentElement.classList.add("np-sdt-fallback");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("np-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    for (const el of document.querySelectorAll(".np-reveal:not(.np-in)")) observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
