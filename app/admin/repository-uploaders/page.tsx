"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Candidate = { user_id: string; member_id: string | null; full_name: string };
type ClassOption = { class_id: string; class_name: string; is_uploader: boolean };

export default function RepositoryUploadersPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [options, setOptions] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingClassId, setProcessingClassId] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    let active = true;
    async function loadCandidates() {
      const { data, error } = await supabase.rpc("get_repository_uploader_candidates");
      if (!active) return;
      if (error) {
        router.replace("/admin");
        return;
      }
      const rows = (data ?? []) as Candidate[];
      setCandidates(rows);
      setSelectedUserId(rows[0]?.user_id ?? "");
      setLoading(false);
    }
    void loadCandidates();
    return () => { active = false; };
  }, [router, supabase]);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      if (!selectedUserId) {
        setOptions([]);
        setOptionsLoading(false);
        return;
      }
      setOptions([]);
      setOptionsLoading(true);
      const { data, error } = await supabase.rpc(
        "get_repository_uploader_options",
        { target_user_id: selectedUserId },
      );
      if (!active) return;
      setOptionsLoading(false);
      if (error) {
        setMessage("Unable to load Repository Uploader appointments.");
        setMessageType("error");
        return;
      }
      setOptions((data ?? []) as ClassOption[]);
    }
    void loadOptions();
    return () => { active = false; };
  }, [selectedUserId, supabase]);

  async function setAppointment(option: ClassOption) {
    const targetUserId = selectedUserId;
    setProcessingClassId(option.class_id);
    setMessage("");
    setMessageType("");
    const rpcName = option.is_uploader
      ? "revoke_repository_uploader"
      : "assign_repository_uploader";
    const { error } = await supabase.rpc(rpcName, {
      target_user_id: targetUserId,
      target_class_id: option.class_id,
    });
    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProcessingClassId(null);
      return;
    }
    if (selectedUserId === targetUserId) {
      setOptions((current) => current.map((item) =>
        item.class_id === option.class_id
          ? { ...item, is_uploader: !item.is_uploader }
          : item
      ));
    }
    setMessage(option.is_uploader
      ? "Repository Uploader appointment revoked."
      : "Repository Uploader appointed.");
    setMessageType("success");
    setProcessingClassId(null);
  }

  if (loading) {
    return <div className="p-8 text-neutral-400">Loading Repository Uploaders...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl">
      <header className="border-b border-neutral-800 pb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Super Admin</p>
        <h1 className="mt-2 text-3xl font-bold">Repository Uploaders</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Appoint upload authority separately for each class. Dojo or Class Admin access does not grant this permission.
        </p>
      </header>

      {message && (
        <div className={`mt-6 rounded-xl border p-4 text-sm ${messageType === "success" ? "border-green-900 bg-green-950/30 text-green-300" : "border-red-900 bg-red-950/30 text-red-300"}`}>
          {message}
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <label htmlFor="uploader-member" className="block text-sm font-medium">Member</label>
        <select
          id="uploader-member"
          value={selectedUserId}
          onChange={(event) => {
            setOptions([]);
            setOptionsLoading(true);
            setSelectedUserId(event.target.value);
          }}
          disabled={processingClassId !== null || optionsLoading}
          className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white"
        >
          {candidates.map((candidate) => (
            <option key={candidate.user_id} value={candidate.user_id}>
              {candidate.full_name}{candidate.member_id ? ` · ${candidate.member_id}` : ""}
            </option>
          ))}
        </select>

        <div className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800">
          {optionsLoading && (
            <p className="p-4 text-sm text-neutral-400">Loading class appointments...</p>
          )}
          {!optionsLoading && options.map((option) => (
            <div key={option.class_id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold">{option.class_name}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {option.is_uploader ? "Active Repository Uploader" : "No upload permission"}
                </p>
              </div>
              <button
                type="button"
                disabled={processingClassId !== null || optionsLoading}
                onClick={() => void setAppointment(option)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${option.is_uploader ? "border border-red-900 text-red-300 hover:bg-red-950/30" : "bg-sky-600 text-white hover:bg-sky-500"}`}
              >
                {processingClassId === option.class_id
                  ? "Saving..."
                  : option.is_uploader ? "Revoke" : "Appoint"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
