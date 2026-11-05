"use client";

import MemberIdLink from "@/components/member-id-link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sortMemberGroups, type MemberSort } from "@/lib/group-visible-members";
import MemberPersonalDetailsEditor from "@/components/member-personal-details-editor";
import MemberExamHistory from "@/components/member-exam-history";

type Profile = { id: string; registration_number: string | null; full_name: string; account_status: string };

/** Mounted for Super Admin only. Both queries still enforce database RLS. */
export default function MembersWithoutEnrollment({ search, sort }: { search: string; sort: MemberSort }) {
  const supabase = useMemo(() => createClient(), []);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ loading: boolean; error: boolean; rows: Profile[] }>({ loading: true, error: false, rows: [] });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ loading: true, error: false, rows: [] });
      try {
        async function profiles() {
          const rows: Profile[] = [];
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from("profiles").select("id,registration_number,full_name,account_status").order("id").range(offset, offset + 499);
            if (error || !Array.isArray(data)) throw new Error("Profiles unavailable");
            rows.push(...data as Profile[]);
            if (data.length < 500) return rows;
          }
        }
        async function enrollments() {
          const enrolled = new Set<string>();
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from("class_memberships").select("id,user_id").order("id").range(offset, offset + 499);
            if (error || !Array.isArray(data)) throw new Error("Enrollments unavailable");
            for (const row of data) enrolled.add(row.user_id);
            if (data.length < 500) return enrolled;
          }
        }
        const [people, enrolled] = await Promise.all([profiles(), enrollments()]);
        if (!cancelled) setState({ loading: false, error: false, rows: people.filter(person => !enrolled.has(person.id)) });
      } catch {
        if (!cancelled) setState({ loading: false, error: true, rows: [] });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase, retry]);
  const query = search.trim().toLowerCase();
  const compactQuery = query.replace(/[\s-]/g, "");
  const rows = sortMemberGroups(state.rows.filter(row => !query || row.full_name.toLowerCase().includes(query) || (row.registration_number ?? "").toLowerCase().replace(/[\s-]/g, "").includes(compactQuery)).map(row => ({ userId: row.id, preferredMembership: row })), sort).map(row => row.preferredMembership);
  return <section aria-labelledby="unenrolled-members-heading" className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
    <h2 id="unenrolled-members-heading" className="text-lg font-semibold">Members awaiting enrollment review</h2>
    <p className="mt-2 text-sm text-neutral-400">These member profiles have no class enrollment yet. Their exam history remains available. Class, dojo, rank and status filters apply to the enrolled list above.</p>
    {state.loading ? <p role="status" className="mt-3">Loading member profiles…</p> : state.error ? <div className="mt-3"><p role="alert">Member profiles could not be loaded.</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded border border-neutral-600 px-3 py-2">Retry member profiles</button></div> : <>
      <p className="mt-3 text-sm text-neutral-400">Showing {rows.length} of {state.rows.length} profiles without enrollment</p>
      <div className="mt-3 space-y-2">{rows.map(person => <details key={person.id} className="rounded-lg border border-neutral-700 p-3">
        <summary className="cursor-pointer break-words text-sm"><strong><MemberIdLink memberId={person.registration_number} fallback={"ID unavailable"} /></strong> · {person.full_name}{person.account_status === "disabled" ? " · Account disabled" : ""}</summary>
        <MemberPersonalDetailsEditor memberId={person.id} />
        <MemberExamHistory memberId={person.id} />
      </details>)}</div>
    </>}
  </section>;
}
