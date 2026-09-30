"use client";

import {
  Activity,
  BarChart3,
  Bike,
  Car,
  Compass,
  FileText,
  Hotel,
  Image as ImageIcon,
  Inbox,
  Map,
  MapPinned,
  Rocket,
  ScrollText,
  Tags,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

const SECTIONS = [
  {
    title: "Overview",
    links: [
      { href: "/", label: "Dashboard", icon: BarChart3 },
      { href: "/enquiries", label: "Enquiries", icon: Inbox },
    ],
  },
  {
    title: "Content",
    links: [
      { href: "/content/trip", label: "Trips", icon: Compass },
      { href: "/content/destination", label: "Destinations", icon: MapPinned },
      { href: "/content/experience", label: "Experiences", icon: Activity },
      { href: "/content/accommodation", label: "Stays", icon: Hotel },
      { href: "/content/activity", label: "Activities", icon: Bike },
      { href: "/content/activity-category", label: "Activity categories", icon: Tags },
      { href: "/content/vehicle", label: "Vehicles & prices", icon: Car },
      { href: "/content/region", label: "Regions", icon: Map },
      { href: "/content/site/settings", label: "Site text", icon: FileText },
      { href: "/media", label: "Media library", icon: ImageIcon },
    ],
  },
  {
    title: "Site",
    links: [
      { href: "/publish", label: "Publish", icon: Rocket },
      { href: "/activity", label: "Activity log", icon: ScrollText },
      { href: "/account", label: "Account & security", icon: UserCog },
    ],
  },
] as const;

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Admin" className="space-y-6">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-xs font-semibold tracking-wider text-ink-500 uppercase">{section.title}</p>
          <ul className="mt-2 space-y-0.5">
            {section.links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                    isActive(href) ? "bg-jungle-50 text-jungle-800" : "text-ink-700 hover:bg-ink-100",
                  )}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
