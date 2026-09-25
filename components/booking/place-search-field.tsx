"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MapPin, X } from "lucide-react";

import { TextField } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatPoint, type GeoPoint } from "@/lib/geo";
import { matchKnownPlaces } from "@/lib/known-places";
import { MAX_SEARCH_LENGTH, PlaceLookupUnavailable, fetchPlaces, placeLabel } from "@/lib/place-lookup";
import { MAX_PLACE_LENGTH } from "@/lib/ride-request";

interface Suggestion extends GeoPoint {
  readonly name: string;
  readonly detail: string;
}

type SearchState = "idle" | "searching" | "done" | "unavailable";

const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 8;

/**
 * A place field for a single trip (D-25): type to search, pick a suggestion to
 * pin the exact spot. Follows the WAI-ARIA combobox pattern (list autocomplete)
 * so it works by keyboard and screen reader: ↓/↑ move through suggestions,
 * Enter picks one, Escape closes the list.
 *
 * Known towns (`lib/known-places.ts`) appear instantly; results from
 * `/api/places/search` are added after a short pause in typing. If the search
 * service is down the field still accepts free text, so the form never
 * depends on it.
 */
export function PlaceSearchField({
  id,
  label,
  description,
  value,
  point,
  onTextChange,
  onSelect,
  onClearPin,
  onFocus,
  error,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly value: string;
  readonly point: GeoPoint | null;
  /** Called as the traveller types. The caller clears the pin (see `RideDetails`). */
  readonly onTextChange: (text: string) => void;
  readonly onSelect: (label: string, point: GeoPoint) => void;
  readonly onClearPin: () => void;
  readonly onFocus?: () => void;
  readonly error?: string;
  /** Extra controls under the field, e.g. "Use my current location". */
  readonly children?: ReactNode;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<readonly Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  function search(text: string): void {
    abortRef.current?.abort();
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);

    const local = matchKnownPlaces(text, 5);
    setSuggestions(local);
    setActiveIndex(-1);
    setOpen(text.trim().length > 0);

    // Beyond the search limit it is an address, not a search: keep the
    // instant suggestions, skip the server (F-13).
    if (text.trim().length < 2 || text.trim().length > MAX_SEARCH_LENGTH) {
      setSearchState("idle");
      return;
    }
    setSearchState("searching");
    timerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetchPlaces(text, controller.signal)
        .then((remote) => {
          const seen = new Set(local.map((place) => place.name.toLowerCase()));
          const merged = [
            ...local,
            ...remote.filter((place) => !seen.has(place.name.toLowerCase())),
          ].slice(0, MAX_SUGGESTIONS);
          setSuggestions(merged);
          setSearchState("done");
        })
        .catch((error: unknown) => {
          if (error instanceof PlaceLookupUnavailable) setSearchState("unavailable");
          // An AbortError means a newer query superseded this one: ignore it.
        });
    }, DEBOUNCE_MS);
  }

  function choose(suggestion: Suggestion): void {
    abortRef.current?.abort();
    onSelect(placeLabel(suggestion), { lat: suggestion.lat, lng: suggestion.lng });
    setOpen(false);
    setActiveIndex(-1);
    setSearchState("idle");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && suggestions.length > 0) setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && suggestions.length > 0) {
      // While the list is open Enter never submits the form: it picks the
      // highlighted suggestion, or just closes the list.
      event.preventDefault();
      const highlighted = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
      if (highlighted) choose(highlighted);
      else setOpen(false);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  const showList = open && suggestions.length > 0;
  const status =
    searchState === "searching"
      ? "Searching…"
      : searchState === "unavailable"
        ? "Search is unavailable right now. Type the place, or tap the map to pin it."
        : open && searchState === "done"
          ? suggestions.length === 0
            ? "No places found. Try another spelling, or tap the map."
            : `${suggestions.length} ${suggestions.length === 1 ? "place" : "places"} found. Use the arrow keys to choose.`
          : "";

  return (
    <div className="flex flex-col gap-2">
      {/* Only the input and its list share the positioning context, so the
          list opens directly under the input, not under the notes below it. */}
      <div className="relative">
      <TextField
        id={id}
        label={label}
        description={description}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onTextChange(event.target.value);
          search(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        // Delay so a pointer press on a suggestion lands before the list closes.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        error={error}
        maxLength={MAX_PLACE_LENGTH}
      />

      <ul
        id={listId}
        role="listbox"
        aria-label={`${label} suggestions`}
        hidden={!showList}
        className="absolute left-0 right-0 top-full z-[1000] mt-1 max-h-80 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion.name}-${suggestion.lat}-${suggestion.lng}`}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            // mousedown, not click: fires before the input's blur closes the list.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(suggestion);
            }}
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-2 px-4 py-2.5",
              index === activeIndex ? "bg-jungle-50" : "hover:bg-sand-100",
            )}
          >
            <MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-jungle-700" />
            <span className="flex flex-col">
              <span className="text-body-sm font-semibold text-ink-900">{suggestion.name}</span>
              {suggestion.detail ? (
                <span className="text-small text-text-meta">{suggestion.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      </div>

      <p aria-live="polite" className="text-small text-text-meta empty:hidden">
        {status}
      </p>

      {point ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-jungle-700">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden />
            Pinned on the map ({formatPoint(point)})
          </span>
          <button
            type="button"
            onClick={onClearPin}
            className="inline-flex min-h-11 items-center gap-1 rounded-xs text-jungle-600 underline underline-offset-4"
          >
            <X size={14} aria-hidden />
            Remove pin
          </button>
        </p>
      ) : null}

      {children}
    </div>
  );
}
