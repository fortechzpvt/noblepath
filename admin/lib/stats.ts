import "server-only";

import { db } from "@/lib/db";

/**
 * Dashboard statistics (D-36). Enquiries come from `booking_requests`; visits
 * from the cookie-free daily counters the public site writes. Days are Sri
 * Lanka dates throughout.
 */

const TODAY = "(now() at time zone 'Asia/Colombo')::date";

export interface Kpis {
  readonly enquiries30: number;
  readonly enquiriesPrev30: number;
  readonly newEnquiries: number;
  readonly emailFailures: number;
  readonly views30: number;
  readonly viewsPrev30: number;
  readonly visitors30: number;
}

export async function kpis(): Promise<Kpis> {
  const { rows } = await db().query<Record<keyof Kpis, string>>(`
    select
      (select count(*) from booking_requests where created_at >= now() - interval '30 days') as "enquiries30",
      (select count(*) from booking_requests where created_at >= now() - interval '60 days' and created_at < now() - interval '30 days') as "enquiriesPrev30",
      (select count(*) from booking_requests where status = 'new') as "newEnquiries",
      (select count(*) from booking_requests where email_status <> 'sent' and status = 'new') as "emailFailures",
      (select coalesce(sum(views), 0) from page_views_daily where day > ${TODAY} - 30) as "views30",
      (select coalesce(sum(views), 0) from page_views_daily where day > ${TODAY} - 60 and day <= ${TODAY} - 30) as "viewsPrev30",
      (select count(*) from visitors_daily where day > ${TODAY} - 30) as "visitors30"
  `);
  const row = rows[0]!;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as unknown as Kpis;
}

export interface DayPoint {
  readonly day: string;
  readonly views: number;
  readonly visitors: number;
}

/** Views and unique visitors per day for the last 30 days, gaps filled with zero. */
export async function dailyTraffic(): Promise<DayPoint[]> {
  const { rows } = await db().query<{ day: string; views: string; visitors: string }>(`
    select to_char(d, 'YYYY-MM-DD') as day,
           coalesce((select sum(views) from page_views_daily p where p.day = d), 0) as views,
           (select count(*) from visitors_daily v where v.day = d) as visitors
      from generate_series(${TODAY} - 29, ${TODAY}, interval '1 day') as g(d)
  `);
  return rows.map((row) => ({ day: row.day, views: Number(row.views), visitors: Number(row.visitors) }));
}

export interface MonthPoint {
  readonly month: string;
  readonly bookings: number;
  readonly rides: number;
}

/** Enquiries per month for the last 12 months. */
export async function monthlyEnquiries(): Promise<MonthPoint[]> {
  const { rows } = await db().query<{ month: string; bookings: string; rides: string }>(`
    select to_char(m, 'YYYY-MM') as month,
           count(b.*) filter (where b.kind = 'booking') as bookings,
           count(b.*) filter (where b.kind = 'ride') as rides
      from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') as g(m)
      left join booking_requests b on date_trunc('month', b.created_at) = m
     group by m order by m
  `);
  return rows.map((row) => ({ month: row.month, bookings: Number(row.bookings), rides: Number(row.rides) }));
}

export interface Ranked {
  readonly label: string;
  readonly value: number;
}

async function ranked(sql: string): Promise<Ranked[]> {
  const { rows } = await db().query<{ label: string; value: string }>(sql);
  return rows.map((row) => ({ label: row.label, value: Number(row.value) }));
}

export const topPages = () =>
  ranked(`select path as label, sum(views) as value from page_views_daily where day > ${TODAY} - 30 group by path order by value desc limit 10`);
export const topCountries = () =>
  ranked(`select country as label, sum(views) as value from page_views_daily where day > ${TODAY} - 30 group by country order by value desc limit 8`);
export const devices = () =>
  ranked(`select device as label, sum(views) as value from page_views_daily where day > ${TODAY} - 30 group by device order by value desc`);
export const topReferrers = () =>
  ranked(`select referrer_host as label, sum(views) as value from page_views_daily where day > ${TODAY} - 30 and referrer_host <> '' group by referrer_host order by value desc limit 8`);
export const topRequestedTrips = () =>
  ranked(`select package_slug as label, count(*) as value from booking_requests where package_slug is not null and created_at > now() - interval '12 months' group by package_slug order by value desc limit 8`);
