"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, X } from "lucide-react";

import { ActivityCard } from "@/components/activities/activity-card";
import { FilterChip } from "@/components/filters/filter-chip";
import { LinkButton } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import type { Activity, ActivityCategory } from "@/content/activities";
import { useTripSelections } from "@/lib/trip-selections";

/**
 * Category chips, a search box, and the activities grouped under their
 * category. "Add to my trip" picks are shared with the booking form: they
 * are kept in `np.selections.v1` (`useTripSelections`), and `/bookings`
 * reads that on load and carries them into the request.
 */
export function ActivitiesExplorer({
  categories,
  activities,
}: {
  readonly categories: readonly ActivityCategory[];
  readonly activities: readonly Activity[];
}) {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const { selections, toggleActivity, removeActivity } = useTripSelections();
  const activityBySlug = useMemo(
    () => new Map(activities.map((activity) => [activity.slug, activity])),
    [activities],
  );

  const handleToggle = (activity: Activity) => {
    const wasSelected = selections.activitySlugs.includes(activity.slug);
    toggleActivity(activity.slug);
    setAnnouncement(
      wasSelected ? `${activity.name} removed from your list.` : `${activity.name} saved to your list.`,
    );
  };

  const handleRemove = (activity: Activity) => {
    removeActivity(activity.slug);
    setAnnouncement(`${activity.name} removed from your list.`);
  };

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

  const chosen = selections.activitySlugs
    .map((slug) => activityBySlug.get(slug))
    .filter((activity): activity is Activity => activity !== undefined);

  return (
    <div className="flex flex-col gap-8">
      <div aria-live="polite" className="np-sr-only">
        {announcement}
      </div>

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
                    <ActivityCard
                      activity={activity}
                      selected={selections.activitySlugs.includes(activity.slug)}
                      onToggle={() => handleToggle(activity)}
                    />
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      {chosen.length > 0 ? (
        <section aria-labelledby="your-activities-heading" className="mt-6">
          <h2 id="your-activities-heading" className="flex items-center gap-2 text-h3 text-ink-900">
            <CalendarCheck size={24} aria-hidden className="text-jungle-600" />
            Your activities
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {chosen.map((activity) => (
              <li
                key={activity.slug}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-small text-text-meta">{activity.location}</p>
                  <p className="text-h5 text-ink-900">{activity.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(activity)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-600 hover:bg-sand-100"
                >
                  <X size={18} aria-hidden />
                  <span className="np-sr-only">Remove {activity.name} from my activities</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-small text-text-meta">
              These will carry into your booking request.
            </p>
            <LinkButton href="/bookings" variant="outline" size="sm">
              Continue to booking
            </LinkButton>
          </div>
        </section>
      ) : null}
    </div>
  );
}
