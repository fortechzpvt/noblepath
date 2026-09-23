"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import { MapPinOff } from "lucide-react";

import { cn } from "@/lib/cn";
import type { Coordinates } from "@/lib/types";

import "leaflet/dist/leaflet.css";

const MARKER_COLOR = "#1f6b4f";

/**
 * A single-pin location map for a destination detail page (page-specs.md §3
 * "where it is"). Built on Leaflet with OpenStreetMap tiles (free, no API
 * key) — the same approach as `StayMap`, simplified: one marker, no picking,
 * a permanent label since there is nothing else on the map to compete with it.
 *
 * Leaflet touches `window`, so it is imported inside the effect and never
 * runs during server rendering.
 */
export function DestinationMap({
  name,
  coordinates,
  className,
}: {
  readonly name: string;
  readonly coordinates: Coordinates;
  readonly className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        const point: [number, number] = [coordinates.lat, coordinates.lng];

        const map = L.map(containerRef.current, {
          center: point,
          zoom: 10,
          scrollWheelZoom: false, // page scroll must not get trapped by the map
        });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);

        const marker = L.circleMarker(point, {
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: MARKER_COLOR,
          fillOpacity: 1,
        }).addTo(map);
        // Tooltip text is set as a DOM node: the name is content, never markup.
        const label = document.createElement("span");
        label.textContent = name;
        marker.bindTooltip(label, { direction: "top", permanent: true, offset: [0, -8] });

        mapRef.current = map;
        markerRef.current = marker;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // `name`/`coordinates` come from static content keyed by the page's slug —
    // this map is mounted once per destination page, not updated in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "unavailable") {
    return (
      <div
        role="status"
        className={cn(
          "flex h-full min-h-72 flex-col items-center justify-center gap-2 rounded-xl",
          "border border-dashed border-sand-300 bg-sand-50 px-6 text-center",
          className,
        )}
      >
        <MapPinOff size={24} aria-hidden className="text-ink-400" />
        <p className="text-body-sm text-ink-700">The map is not available right now.</p>
        <p className="text-small text-text-meta">Try reloading the page.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-0 h-full min-h-72 overflow-hidden rounded-xl border border-border bg-sand-100",
        className,
      )}
    >
      <div
        ref={containerRef}
        role="application"
        aria-label={`Map showing where ${name} is in Sri Lanka`}
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
