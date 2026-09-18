"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  registration_number: string | null;
  full_name: string;
  email: string;
  phone: string;
  is_super_admin: boolean;
};

export default function MemberIdManagementPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: currentProfile, error: currentProfileError } =
        await supabase
          .from("profiles")
          .select("is_super_admin")
          .eq("id", user.id)
          .single();

      if (
        currentProfileError ||
        !currentProfile ||
        currentProfile.is_super_admin !== true
      ) {
        router.replace("/admin");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          registration_number,
          full_name,
          email,
          phone,
          is_super_admin
        `)
        .order("full_name");

      if (error) {
        setMessage(error.message);
        setMessageType("error");
        setLoading(false);
        return;
      }

      setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    }

    loadPage();
  }, [router, supabase]);

  const filteredProfiles = profiles.filter((profile) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      profile.full_name.toLowerCase().includes(query) ||
      profile.email.toLowerCase().includes(query) ||
      profile.phone.toLowerCase().includes(query) ||
      (profile.registration_number ?? "")
        .toLowerCase()
        .includes(query)
    );
  });

  async function setMemberId(profile: Profile) {
    const newId = window.prompt(
      `Set Member ID for ${profile.full_name}:`,
      profile.registration_number ?? ""
    );

    if (newId === null) {
      return;
    }

    const cleanedId = newId.trim();

    if (!cleanedId) {
      setMessage("Member ID cannot be empty.");
      setMessageType("error");
      return;
    }

    if (cleanedId === profile.registration_number) {
      return;
    }

    setProcessingId(profile.id);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.rpc("set_member_id", {
      target_user: profile.id,
      new_member_id: cleanedId,
    });

    if (error) {
      setMessage(error.message);
      setMessageType("error");
      setProcessingId(null);
      return;
    }

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? {
              ...item,
              registration_number: cleanedId,
            }
          : item
      )
    );

    setMessage(
      `Member ID for ${profile.full_name} updated to ${cleanedId}.`
    );
    setMessageType("success");
    setProcessingId(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <p className="text-neutral-400">
          Loading Member IDs...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-neutral-800 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/js-logo.jpeg"
              alt="Jingwuguan Seibukan"
              width={65}
              height={65}
              className="rounded-xl"
            />

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-400">
                Super Admin
              </p>

              <h1 className="text-3xl font-bold">
                Member IDs
              </h1>

              <p className="mt-1 text-sm text-neutral-400">
                Assign and manage Member identification numbers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="self-start rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            ← Admin
          </button>
        </header>

        {message && (
          <div
            className={`mt-6 rounded-xl border p-4 ${
              messageType === "success"
                ? "border-green-900 bg-green-950/30 text-green-300"
                : "border-red-900 bg-red-950/30 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <label className="mb-2 block text-sm font-medium">
            Search Member
          </label>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name / Member ID / Email / Phone"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder:text-neutral-500"
          />

          <p className="mt-3 text-sm text-neutral-500">
            Showing {filteredProfiles.length} of {profiles.length} Members
          </p>
        </section>

        <section className="mt-6 space-y-4">
          {filteredProfiles.map((profile) => {
            const processing = processingId === profile.id;

            return (
              <article
                key={profile.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">
                        {profile.full_name}
                      </h2>

                      {profile.is_super_admin && (
                        <span className="rounded-full border border-red-800 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-300">
                          Super Admin
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-neutral-500">
                          Member ID:
                        </span>{" "}
                        <span className="font-medium text-white">
                          {profile.registration_number ||
                            "Not assigned"}
                        </span>
                      </p>

                      <p>
                        <span className="text-neutral-500">
                          Email:
                        </span>{" "}
                        {profile.email}
                      </p>

                      <p>
                        <span className="text-neutral-500">
                          Phone:
                        </span>{" "}
                        {profile.phone}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setMemberId(profile)}
                    className="self-start rounded-lg bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 md:self-auto"
                  >
                    {processing
                      ? "Saving..."
                      : profile.registration_number
                      ? "Change Member ID"
                      : "Assign Member ID"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
