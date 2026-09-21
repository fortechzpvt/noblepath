"use client";

import { useRouter } from "next/navigation";

import type { FilterOption } from "@/components/filters/destination-filters";
import {
  AppliedFilterChip,
  ChipGroup,
  ClearFiltersChip,
  FilterChip,
} from "@/components/filters/filter-chip";
import { Container } from "@/components/ui/section";

const PATH = "/experiences";

function buildHref(categories: readonly string[], destinations: readonly string[]): string {
  const params = new URLSearchParams();
  for (const category of categories) params.append("category", category);
  for (const destination of destinations) params.append("destination", destination);
  const query = params.toString();
  return query.length > 0 ? `${PATH}?${query}` : PATH;
}

function toggle(values: readonly string[], value: string): readonly string[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

/**
 * Filter bar for the experiences index (page-specs.md §4, FR-2.3).
 *
 * Same URL-as-state contract as `DestinationFilters`: the page stays a server
 * component and this bar is the only JavaScript the route ships. Kept as a
 * separate component rather than generalised because the two bars filter
 * different dimensions and share nothing beyond the chip primitives.
 */
export function ExperienceFilters({
  categoryOptions,
  destinationOptions,
  selectedCategories,
  selectedDestinations,
}: {
  readonly categoryOptions: readonly FilterOption[];
  readonly destinationOptions: readonly FilterOption[];
  readonly selectedCategories: readonly string[];
  readonly selectedDestinations: readonly string[];
}) {
  const router = useRouter();

  const go = (categories: readonly string[], destinations: readonly string[]): void => {
    router.push(buildHref(categories, destinations), { scroll: false });
  };

  const applied = [
    ...selectedCategories.map((value) => ({
      key: `category:${value}`,
      label: categoryOptions.find((option) => option.value === value)?.label ?? value,
      remove: () => go(toggle(selectedCategories, value), selectedDestinations),
    })),
    ...selectedDestinations.map((value) => ({
      key: `destination:${value}`,
      label: destinationOptions.find((option) => option.value === value)?.label ?? value,
      remove: () => go(selectedCategories, toggle(selectedDestinations, value)),
    })),
  ];

  return (
    <div className="border-b border-border bg-sand-50 lg:sticky lg:top-20 lg:z-[20]">
      <Container wide className="flex flex-col gap-4 py-4 lg:flex-row lg:gap-10">
        <ChipGroup id="experience-category" label="Category">
          {categoryOptions.map((option) => {
            const selected = selectedCategories.includes(option.value);
            return (
              <li key={option.value}>
                <FilterChip
                  selected={selected}
                  count={option.count}
                  disabled={option.count === 0 && !selected}
                  onClick={() =>
                    go(toggle(selectedCategories, option.value), selectedDestinations)
                  }
                >
                  {option.label}
                </FilterChip>
              </li>
            );
          })}
        </ChipGroup>

        <ChipGroup id="experience-destination" label="Destination">
          {destinationOptions.map((option) => {
            const selected = selectedDestinations.includes(option.value);
            return (
              <li key={option.value}>
                <FilterChip
                  selected={selected}
                  count={option.count}
                  disabled={option.count === 0 && !selected}
                  onClick={() =>
                    go(selectedCategories, toggle(selectedDestinations, option.value))
                  }
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
            <p id="experience-applied-label" className="text-small text-text-meta">
              Filtered by
            </p>
            <ul
              aria-labelledby="experience-applied-label"
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
