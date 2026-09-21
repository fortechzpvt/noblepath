"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import { MapPinOff } from "lucide-react";

import type { Accommodation } from "@/lib/types";

import "leaflet/dist/leaflet.css";

const SELECTED_COLOR = "#1f6b4f";
const DEFAULT_COLOR = "#5b6b63";
const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

/**
 * Map of one tab's stays, built on Leaflet with OpenStreetMap tiles (free, no
 * API key). Leaflet touches `window`, so it is imported inside the effect and
 * never runs during server rendering.
 *
 * Pins are circle markers rather than image icons: Leaflet's default marker
 * images break under bundlers, and vector circles need no extra assets or CSP
 * image origins. The map is built once; markers are diffed on prop change so
 * hovering a card does not rebuild it.
 */
export function StayMap({
  stays,
  chosenSlugs,
  activeSlug,
  onPick,
}: {
  readonly stays: readonly Accommodation[];
  /** Stays the visitor already saved, drawn larger and in the brand colour. */
  readonly chosenSlugs: readonly string[];
  /** The stay being hovered or focused in the list. */
  readonly activeSlug: string | null;
  readonly onPick: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Map<string, CircleMarker>>(new Map());
  const onPickRef = useRef(onPick);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;
    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;
        const map = L.map(containerRef.current, {
          center: SRI_LANKA_CENTER,
          zoom: 7,
          scrollWheelZoom: false, // page scroll must not get trapped by the map
        });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);
        mapRef.current = map;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Rebuild markers whenever the set of stays changes (new tab or tier).
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (status !== "ready" || !L || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const points: [number, number][] = [];
    for (const stay of stays) {
      const point: [number, number] = [stay.coordinates.lat, stay.coordinates.lng];
      const marker = L.circleMarker(point, {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: DEFAULT_COLOR,
        fillOpacity: 1,
      }).addTo(map);
      // Tooltip text is set as a DOM node: names are content, never markup.
      const label = document.createElement("span");
      label.textContent = stay.name;
      marker.bindTooltip(label, { direction: "top" });
      marker.on("click", () => onPickRef.current(stay.slug));
      markersRef.current.set(stay.slug, marker);
      points.push(point);
    }

    if (points.length === 1 && points[0]) {
      map.setView(points[0], 13);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    } else {
      map.setView(SRI_LANKA_CENTER, 7);
    }
  }, [stays, status]);

  // Restyle pins for the chosen and hovered stays.
  useEffect(() => {
    if (status !== "ready") return;
    markersRef.current.forEach((marker, slug) => {
      const chosen = chosenSlugs.includes(slug);
      const active = slug === activeSlug;
      marker.setStyle({
        fillColor: chosen || active ? SELECTED_COLOR : DEFAULT_COLOR,
        radius: chosen ? 12 : active ? 11 : 8,
      });
      if (chosen || active) marker.bringToFront();
    });
  }, [chosenSlugs, activeSlug, status, stays]);

  if (status === "unavailable") {
    return (
      <div
        role="status"
        className="flex h-full min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sand-300 bg-sand-50 px-6 text-center"
      >
        <MapPinOff size={24} aria-hidden className="text-ink-400" />
        <p className="text-body-sm text-ink-700">The map is not available right now.</p>
        <p className="text-small text-text-meta">Try reloading the page.</p>
      </div>
    );
  }

  return (
    <div className="relative z-0 h-full min-h-72 overflow-hidden rounded-xl border border-border bg-sand-100">
      <div
        ref={containerRef}
        role="application"
        aria-label={`Map of ${stays.length} places to stay`}
        className="absolute inset-0"
      />
      {status === "loading" ? (
        <p className="absolute inset-0 flex items-center justify-center text-small text-text-meta">
          Loading map…
        </p>
      ) : null}
    </div>
  );
}
