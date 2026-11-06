"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { NavigationItem } from "@/lib/navigation";

const groups = [
  { label: "Members", paths: ["/admin/members", "/directory", "/admin/applications", "/admin/member-claims", "/admin/enrollment-requests", "/admin/break-request", "/admin/transfers", "/admin/archive", "/admin/member-ids"] },
  { label: "Training", paths: ["/calendar", "/schedules", "/admin/training-sessions", "/admin/schedules", "/admin/assessments", "/assessment-history", "/admin/certificates"] },
  { label: "Library", paths: ["/repository", "/repository/upload", "/admin/repository-uploaders", "/admin/tiers"] },
  { label: "Finance", paths: ["/subscription", "/admin/payments", "/admin/subscriptions", "/admin/settlements", "/admin/reports"] },
  { label: "Organisation", paths: ["/admin/classes", "/admin/dojos", "/admin/ranks", "/admin/dojo-migrations"] },
  { label: "Updates", paths: ["/notifications", "/admin/announcements", "/admin/events"] },
];

export default function CompactNavigation({ items, pathname, onNavigate }: {
  items: NavigationItem[]; pathname: string; onNavigate?: () => void;
}) {
  const id = useId();
  const active = items.filter(item => item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const [expanded, setExpanded] = useState<string | null>(() => groups.find(group => group.paths.includes(active ?? ""))?.label ?? null);
  function link(item: NavigationItem) {
    return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active === item.href ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition ${active === item.href ? "bg-neutral-800 font-medium text-white" : "text-neutral-300 hover:bg-neutral-900 hover:text-white"}`}>
      {item.label}
    </Link>;
  }
  return <div className="space-y-1">
    {items.filter(item => item.href === "/").map(link)}
    {groups.map(group => {
      const children = group.paths.flatMap(path => items.filter(item => item.href === path));
      if (!children.length) return null;
      if (children.length === 1) return link(children[0]);
      const open = expanded === group.label;
      const panelId = id + "-" + group.label;
      return <div key={group.label}>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setExpanded(open ? null : group.label)}
          className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${group.paths.includes(active ?? "") ? "font-medium text-white" : "text-neutral-300"} hover:bg-neutral-900`}>
          {group.label}<span aria-hidden="true" className="text-neutral-400">{open ? "−" : "+"}</span>
        </button>
        <div id={panelId} hidden={!open} className="ml-3 border-l border-neutral-800 pl-2">{children.map(link)}</div>
      </div>;
    })}
    {items.filter(item => item.href !== "/" && !groups.some(group => group.paths.includes(item.href))).map(link)}
  </div>;
}
