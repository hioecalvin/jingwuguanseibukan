"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { directoryRows, instagramProfile, type DirectoryMember, type DirectorySort } from "@/lib/member-directory";

export default function MemberDirectoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDojo, setSelectedDojo] = useState("");
  const [sort, setSort] = useState<DirectorySort>("class");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setMembers([]);
    async function loadDirectory() {
      try {
        const { data, error: directoryError } = await supabase.rpc("get_my_member_directory_v2");
        if (!active) return;
        if (directoryError) throw directoryError;
        setMembers((data ?? []) as DirectoryMember[]);
      } catch {
        if (active) setError("The member directory is temporarily unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDirectory();
    return () => { active = false; };
  }, [supabase, attempt]);

  const classNames = useMemo(() => [...new Set(members.flatMap((member) =>
    member.enrollments.map((entry) => entry.class_name)))].sort(), [members]);
  const dojoNames = useMemo(() => [...new Set(members.flatMap((member) =>
    member.enrollments.filter((entry) => !selectedClass || entry.class_name === selectedClass)
      .map((entry) => entry.home_dojo).filter((dojo): dojo is string => Boolean(dojo))))].sort(), [members, selectedClass]);
  const rows = useMemo(() => directoryRows(members, selectedClass, selectedDojo, sort),
    [members, selectedClass, selectedDojo, sort]);
  const selectClass = "mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white";

  return (
    <main className="mx-auto w-full max-w-6xl">
      <header className="border-b border-neutral-800 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Community</p>
        <h1 className="mt-2 text-2xl font-bold">Member Directory</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Members across all classes and dojos. Only public directory details are shown here.
        </p>
      </header>

      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="min-w-0 text-sm text-neutral-300">Class
          <select className={selectClass} value={selectedClass} onChange={(event) => {
            setSelectedClass(event.target.value); setSelectedDojo("");
          }}>
            <option value="">All classes</option>
            {classNames.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm text-neutral-300">Dojo
          <select className={selectClass} value={selectedDojo} onChange={(event) => setSelectedDojo(event.target.value)}>
            <option value="">All dojos</option>
            {dojoNames.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm text-neutral-300">Sort by
          <select className={selectClass} value={sort} onChange={(event) => setSort(event.target.value as DirectorySort)}>
            <option value="class">Class, then dojo</option>
            <option value="dojo">Dojo, then class</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {loading ? <p role="status" className="py-6 text-neutral-400">Loading directory...</p> : error ? (
        <div role="alert" className="rounded-lg border border-red-900 p-4 text-sm text-red-200">
          <p>{error}</p>
          <button type="button" className="mt-3 rounded border border-neutral-600 px-3 py-2 text-white" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
        </div>
      ) : rows.length === 0 ? <p role="status" className="py-6 text-neutral-400">No members match these filters.</p> : (
        <>
          <p role="status" className="mb-2 text-xs text-neutral-400">{rows.length} {rows.length === 1 ? "member" : "members"}</p>
          <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3 px-3 pb-2 text-xs text-neutral-400 md:grid" aria-hidden="true">
            <span>Photo</span><span>Name</span><span>Classes enrolled · Dojo · Rank</span><span>Instagram</span>
          </div>
          <ul aria-label="Member directory" className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
            {rows.map(({ member, index, enrollments }) => {
              const instagram = instagramProfile(member.instagram_username);
              return (
                <li key={index} className="directory-member grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 p-3 md:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="row-span-3 h-10 w-10 overflow-hidden rounded-full bg-neutral-800 md:row-span-1">
                    {member.avatar_url ? (
                      // User-uploaded avatars are served independently of the application build.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : <span aria-hidden="true" className="flex h-full items-center justify-center text-neutral-300">{member.full_name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <h2 className="min-w-0 break-words text-sm font-semibold text-white">{member.full_name}</h2>
                  <ul aria-label={`Classes and dojos for ${member.full_name}`} className="min-w-0 space-y-1 text-xs">
                    {enrollments.map((entry, enrollmentIndex) => <li key={enrollmentIndex} className="break-words">
                      <span className="font-medium text-sky-300">{entry.class_name}</span>
                      <span className="text-neutral-300"> · {entry.home_dojo ?? "Dojo not assigned"}</span>
                      <span className="text-neutral-400"> · {entry.current_rank ?? "Rank not recorded"}</span>
                    </li>)}
                  </ul>
                  <div className="min-w-0 text-xs">
                    {instagram ? <a href={instagram.href} target="_blank" rel="noopener noreferrer" aria-label={`Instagram @${instagram.handle} (opens in a new tab)`} className="inline-block max-w-full break-all py-1 text-sky-300 underline underline-offset-2">@{instagram.handle}</a>
                      : <span className="text-neutral-400">Instagram not shared</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
