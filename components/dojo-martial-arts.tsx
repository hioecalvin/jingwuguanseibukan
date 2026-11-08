import Link from "next/link";

type ClassAtDojo = { dojoId: string; classId: string; name: string; active: boolean };

export default function DojoMartialArts({ classes }: { classes: ClassAtDojo[] }) {
  return <div className="mt-3">
    <h3 className="text-sm font-semibold">Martial arts</h3>
    <ul className="flex flex-wrap gap-x-4">
      {classes.map(row => <li key={row.dojoId}>
        {row.active ? <Link href={"/schedules?" + new URLSearchParams({ dojo: row.dojoId, class: row.classId })}
          className="inline-flex min-h-11 items-center text-sm text-sky-300 underline">{row.name}</Link>
          : <span className="inline-flex min-h-11 items-center text-sm text-neutral-400">{row.name} · Inactive</span>}
      </li>)}
    </ul>
  </div>;
}
