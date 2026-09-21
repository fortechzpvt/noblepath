"use client";

import { useMemo, useState } from "react";

import { ActivityCard } from "@/components/activities/activity-card";
import { FilterChip } from "@/components/filters/filter-chip";
import { TextField } from "@/components/ui/field";
import type { Activity, ActivityCategory } from "@/content/activities";

/** Category chips, a search box, and the activities grouped under their category. */
export function ActivitiesExplorer({
  categories,
  activities,
}: {
  readonly categories: readonly ActivityCategory[];
  readonly activities: readonly Activity[];
}) {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activities.filter((activity) => {
      if (categoryId !== "all" && activity.categoryId !== categoryId) return false;
      if (needle === "") return true;
      return (
        activity.name.toLowerCase().includes(needle) ||
        activity.location.toLowerCase().includes(needle)
      );
    });
  }, [activities, categoryId, query]);

  const countFor = (id: string) => activities.filter((a) => a.categoryId === id).length;

  const visibleCategories = categories.filter((category) =>
    matches.some((activity) => activity.categoryId === category.id),
  );

  return (
    <div className="flex flex-col gap-8">
      <TextField
        id="activity-search"
        label="Search activities"
        type="search"
        placeholder="For example surfing, Ella or train"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
        className="max-w-md"
      />

      <div role="group" aria-label="Activity categories" className="flex flex-wrap gap-2">
        <FilterChip
          selected={categoryId === "all"}
          count={activities.length}
          onClick={() => setCategoryId("all")}
        >
          All activities
        </FilterChip>
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            selected={categoryId === category.id}
            count={countFor(category.id)}
            onClick={() => setCategoryId(category.id)}
          >
            {category.label}
          </FilterChip>
        ))}
      </div>

      <p aria-live="polite" className="text-small text-text-meta">
        Showing {matches.length} {matches.length === 1 ? "activity" : "activities"}.
      </p>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sand-300 px-6 py-12 text-center">
          <h2 className="text-h4 text-ink-900">Nothing matches that</h2>
          <p className="mx-auto mt-2 max-w-md text-body text-ink-600">
            Try a different word, or clear the search to see every activity.
          </p>
        </div>
      ) : (
        visibleCategories.map((category) => (
          <section key={category.id} aria-labelledby={`cat-${category.id}`}>
            <h2 id={`cat-${category.id}`} className="font-display text-h3 text-ink-900">
              {category.label}
            </h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matches
                .filter((activity) => activity.categoryId === category.id)
                .map((activity) => (
                  <li key={activity.slug}>
                    <ActivityCard activity={activity} />
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
