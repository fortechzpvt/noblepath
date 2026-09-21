"use client";

import { useRouter } from "next/navigation";

import {
  AppliedFilterChip,
  ChipGroup,
  ClearFiltersChip,
  FilterChip,
} from "@/components/filters/filter-chip";
import { Container } from "@/components/ui/section";

export interface FilterOption {
  readonly value: string;
  readonly label: string;
  /** How many results this option yields under the other dimension's selection. */
  readonly count: number;
}

const PATH = "/destinations";

function buildHref(regions: readonly string[], interests: readonly string[]): string {
  const params = new URLSearchParams();
  for (const region of regions) params.append("region", region);
  for (const interest of interests) params.append("interest", interest);
  const query = params.toString();
  return query.length > 0 ? `${PATH}?${query}` : PATH;
}

function toggle(values: readonly string[], value: string): readonly string[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

/**
 * Filter bar for the destinations index (page-specs.md §2 S2, FR-1.2 / FR-1.3).
 *
 * This is the only client component on the route. Selection lives in the URL,
 * not in React state: the page stays a server component, the results grid ships
 * no JavaScript, a filtered view is linkable, and Back works. The component
 * therefore receives the current selection as props — it never needs to read
 * `useSearchParams`, which would force the whole route into a Suspense boundary
 * for no benefit.
 */
export function DestinationFilters({
  regionOptions,
  interestOptions,
  selectedRegions,
  selectedInterests,
}: {
  readonly regionOptions: readonly FilterOption[];
  readonly interestOptions: readonly FilterOption[];
  readonly selectedRegions: readonly string[];
  readonly selectedInterests: readonly string[];
}) {
  const router = useRouter();

  // `scroll: false` — the grid is already in view; jumping to the top of the
  // document on every chip toggle would lose the visitor's place.
  const go = (regions: readonly string[], interests: readonly string[]): void => {
    router.push(buildHref(regions, interests), { scroll: false });
  };

  const applied = [
    ...selectedRegions.map((value) => ({
      key: `region:${value}`,
      label: regionOptions.find((option) => option.value === value)?.label ?? value,
      remove: () => go(toggle(selectedRegions, value), selectedInterests),
    })),
    ...selectedInterests.map((value) => ({
      key: `interest:${value}`,
      label: interestOptions.find((option) => option.value === value)?.label ?? value,
      remove: () => go(selectedRegions, toggle(selectedInterests, value)),
    })),
  ];

  return (
    <div className="border-b border-border bg-sand-50 lg:sticky lg:top-20 lg:z-[20]">
      <Container wide className="flex flex-col gap-4 py-4 lg:flex-row lg:gap-10">
        <ChipGroup id="destination-region" label="Region">
          {regionOptions.map((option) => {
            const selected = selectedRegions.includes(option.value);
            return (
              <li key={option.value}>
                <FilterChip
                  selected={selected}
                  count={option.count}
                  disabled={option.count === 0 && !selected}
                  onClick={() => go(toggle(selectedRegions, option.value), selectedInterests)}
                >
                  {option.label}
                </FilterChip>
              </li>
            );
          })}
        </ChipGroup>

        <ChipGroup id="destination-interest" label="Interest">
          {interestOptions.map((option) => {
            const selected = selectedInterests.includes(option.value);
            return (
              <li key={option.value}>
                <FilterChip
                  selected={selected}
                  count={option.count}
                  disabled={option.count === 0 && !selected}
                  onClick={() => go(selectedRegions, toggle(selectedInterests, option.value))}
                >
                  {option.label}
                </FilterChip>
              </li>
            );
          })}
        </ChipGroup>
      </Container>

      {applied.length > 0 ? (
        <div className="border-t border-border">
          <Container wide className="flex flex-wrap items-center gap-2 py-3">
            <p id="destination-applied-label" className="text-small text-text-meta">
              Filtered by
            </p>
            <ul
              aria-labelledby="destination-applied-label"
              className="flex flex-wrap items-center gap-2"
            >
              {applied.map((filter) => (
                <li key={filter.key}>
                  <AppliedFilterChip label={filter.label} onRemove={filter.remove} />
                </li>
              ))}
            </ul>
            <ClearFiltersChip onClick={() => go([], [])} />
          </Container>
        </div>
      ) : null}
    </div>
  );
}
