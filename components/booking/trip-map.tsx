"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import { MapPinOff } from "lucide-react";

import { cn } from "@/lib/cn";
import { SRI_LANKA_BOUNDS, SRI_LANKA_CENTER, isInSriLanka, roundPoint, type GeoPoint } from "@/lib/geo";

import "leaflet/dist/leaflet.css";

export type TripEnd = "pickup" | "dropoff";

const PIN_TEXT: Record<TripEnd, string> = { pickup: "A", dropoff: "B" };
const PIN_NAME: Record<TripEnd, string> = { pickup: "Pickup", dropoff: "Drop-off" };

/**
 * Pickup (A) and drop-off (B) pins for a single trip (D-25), on Leaflet with
 * OpenStreetMap tiles like the other maps on the site.
 *
 * Tapping the map places whichever end is active (`activeEnd`); either pin can
 * be dragged. The map is an enhancement, never the only way in: every pin can
 * also be set from the search fields, which work with a keyboard and screen
 * reader, so dragging (which Leaflet cannot do by keyboard) is never required.
 *
 * The view refits when a pin arrives from outside the map (a search result or
 * the traveller's location), but not when the traveller moves a pin on the map
 * themselves — refitting under their finger would fight the drag.
 */
export function TripMap({
  pickup,
  dropoff,
  activeEnd,
  onPlace,
  className,
}: {
  readonly pickup: GeoPoint | null;
  readonly dropoff: GeoPoint | null;
  readonly activeEnd: TripEnd;
  readonly onPlace: (end: TripEnd, point: GeoPoint) => void;
  readonly className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Partial<Record<TripEnd, Marker>>>({});
  const lineRef = useRef<Polyline | null>(null);
  const fromMapRef = useRef(false);
  const activeEndRef = useRef(activeEnd);
  const onPlaceRef = useRef(onPlace);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    activeEndRef.current = activeEnd;
    onPlaceRef.current = onPlace;
  });

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;
    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;
        const bounds = L.latLngBounds(
          [SRI_LANKA_BOUNDS.south, SRI_LANKA_BOUNDS.west],
          [SRI_LANKA_BOUNDS.north, SRI_LANKA_BOUNDS.east],
        );
        const map = L.map(containerRef.current, {
          center: [SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng],
          zoom: 7,
          minZoom: 6,
          maxBounds: bounds.pad(0.2),
          scrollWheelZoom: false, // page scroll must not get trapped by the map
          // On touch screens a one-finger drag must scroll the page, not pan the
          // map. Pins stay draggable, pinch and the +/- buttons still zoom, and
          // a search result or new pin re-centres the view.
          dragging: !L.Browser.mobile,
          // Not a keyboard stop: everything the map does, search does too.
          keyboard: false,
        });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);

        map.on("click", (event) => {
          const point = roundPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
          if (!isInSriLanka(point)) return;
          fromMapRef.current = true;
          onPlaceRef.current(activeEndRef.current, point);
        });

        mapRef.current = map;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
      Object.values(markers).forEach((marker) => marker?.remove());
      markersRef.current = {};
      lineRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync pins and the line with the points.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (status !== "ready" || !L || !map) return;

    for (const [end, point] of [
      ["pickup", pickup],
      ["dropoff", dropoff],
    ] as const) {
      const existing = markersRef.current[end];
      if (point === null) {
        existing?.remove();
        delete markersRef.current[end];
        continue;
      }
      if (existing) {
        existing.setLatLng([point.lat, point.lng]);
        continue;
      }
      const marker = L.marker([point.lat, point.lng], {
        draggable: true,
        autoPan: true,
        keyboard: false,
        title: `${PIN_NAME[end]} pin`,
        alt: `${PIN_NAME[end]} pin`,
        icon: L.divIcon({
          className: "",
          // Static markup: only our own letter, never traveller input.
          html: `<span class="np-trip-pin np-trip-pin--${end === "pickup" ? "a" : "b"}" aria-hidden="true">${PIN_TEXT[end]}</span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        const next = roundPoint({ lat, lng });
        fromMapRef.current = true;
        if (isInSriLanka(next)) onPlaceRef.current(end, next);
      });
      markersRef.current[end] = marker;
    }

    lineRef.current?.remove();
    lineRef.current = null;
    if (pickup && dropoff) {
      lineRef.current = L.polyline(
        [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ],
        { color: "#15544A", weight: 3, opacity: 0.8, dashArray: "6 8", interactive: false },
      ).addTo(map);
    }

    if (fromMapRef.current) {
      fromMapRef.current = false;
      return;
    }
    if (pickup && dropoff) {
      map.fitBounds(
        [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ],
        { padding: [48, 48], maxZoom: 14 },
      );
    } else if (pickup || dropoff) {
      const only = (pickup ?? dropoff)!;
      map.setView([only.lat, only.lng], Math.max(map.getZoom(), 12));
    }
  }, [pickup, dropoff, status]);

  if (status === "unavailable") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-sand-50 p-4 text-body-sm text-ink-700",
          className,
        )}
      >
        <MapPinOff size={20} aria-hidden className="shrink-0" />
        The map could not load. Search for your pickup and drop-off above instead.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Map, optional. Tap to place the selected pin; the search fields above do the same."
      // `isolate`: Leaflet's own z-indexes (up to 1000) stay inside the map, so
      // its controls can never paint over the search suggestions above it.
      className={cn("isolate h-64 w-full overflow-hidden rounded-lg border border-border md:h-96", className)}
    />
  );
}
