"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type ClassItem = {
  id: string;
  name: string;
};

type DojoItem = {
  id: string;
  name: string;
  class_id: string;
};

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), []);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [dojos, setDojos] = useState<DojoItem[]>([]);
  const [classStatus, setClassStatus] = useState<"loading" | "ready" | "error">("loading");
  const [dojoStatus, setDojoStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [loadedDojoClassId, setLoadedDojoClassId] = useState("");
  const [classRetry, setClassRetry] = useState(0);
  const [dojoRetry, setDojoRetry] = useState(0);

  const [fullName, setFullName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDojoId, setSelectedDojoId] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name")
          .order("name");
        if (cancelled) return;
        if (error) throw error;
        setClasses(data ?? []);
        setClassStatus("ready");
      } catch {
        if (!cancelled) setClassStatus("error");
      }
    }
    void loadClasses();
    return () => { cancelled = true; };
  }, [supabase, classRetry]);

  useEffect(() => {
    let cancelled = false;
    async function loadDojos() {
      if (!selectedClassId) return;
      try {
        const { data, error } = await supabase
          .from("dojos")
          .select("id, name, class_id")
          .eq("class_id", selectedClassId)
          .eq("active", true)
          .order("name");
        if (cancelled) return;
        if (error) throw error;
        setDojos((data ?? []).filter((dojo) => dojo.class_id === selectedClassId));
        setLoadedDojoClassId(selectedClassId);
        setDojoStatus("ready");
      } catch {
        if (!cancelled) setDojoStatus("error");
      }
    }
    void loadDojos();
    return () => { cancelled = true; };
  }, [selectedClassId, supabase, dojoRetry]);

  const catalogReady = classStatus === "ready" &&
    classes.some((item) => item.id === selectedClassId) &&
    dojoStatus === "ready" && loadedDojoClassId === selectedClassId;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const normalizedMemberId = memberId.trim();
    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim().replace(/\s+/g, " ");

    if (!normalizedMemberId || !normalizedName) {
      setMessage("Member ID and full name are required.");
      return;
    }

    if (
      password.length < 10 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setMessage(
        "Password must be at least 10 characters and include uppercase, lowercase and a number."
      );
      return;
    }

    if (!catalogReady) {
      setMessage("Please select a class and wait for its dojos to load before registering.");
      return;
    }

    if (dojos.length > 0 && !dojos.some((item) => item.id === selectedDojoId && item.class_id === selectedClassId)) {
      setMessage("Please select a dojo.");
      return;
    }

    setLoading(true);

    const selectedClass = classes.find(
      (item) => item.id === selectedClassId
    );

    const selectedDojo = dojos.find(
      (item) => item.id === selectedDojoId
    );

    try {
      const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedName,
          registration_number: normalizedMemberId,
          username: normalizedMemberId,
          date_of_birth: dateOfBirth,
          phone: normalizedPhone,
          requested_class_id: selectedClassId,
          requested_class_name: selectedClass?.name ?? null,
          requested_dojo_id: selectedDojoId || null,
          requested_dojo_name: selectedDojo?.name ?? null,
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Registration successful. Please check your email to verify your account."
      );
    } catch {
      setMessage("Unable to register. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <div className="mb-5 flex justify-center">
          <Image
            src="/js-logo.jpeg"
            alt="Jingwuguan Seibukan"
            width={120}
            height={120}
            className="rounded-2xl"
            priority
          />
        </div>

        <h1 className="text-center text-3xl font-bold">
          Jingwuguan Seibukan
        </h1>

        <p className="mt-2 text-center text-neutral-400">
          Member Registration
        </p>

        <form onSubmit={handleRegister} aria-busy={loading} className="mt-8 space-y-5">
          <div>
            <label htmlFor="register-member-id" className="mb-1 block text-sm font-medium">
              Member ID / Registration Number
            </label>

            <input
              id="register-member-id"
              required
              autoComplete="username"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label htmlFor="register-name" className="mb-1 block text-sm font-medium">
              Full Name
            </label>

            <input
              id="register-name"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label htmlFor="register-birth-date" className="mb-1 block text-sm font-medium">
              Date of Birth
            </label>

            <input
              id="register-birth-date"
              autoComplete="bday"
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              id="register-email"
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label htmlFor="register-phone" className="mb-1 block text-sm font-medium">
              Phone Number
            </label>

            <input
              id="register-phone"
              autoComplete="tel"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label htmlFor="register-class" className="mb-1 block text-sm font-medium">
              Class
            </label>

            <select
              id="register-class"
              required
              disabled={classStatus !== "ready" || classes.length === 0 || loading}
              aria-describedby="register-class-status"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedDojoId("");
                setDojos([]);
                setLoadedDojoClassId("");
                setDojoStatus(e.target.value ? "loading" : "idle");
                setMessage("");
              }}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            >
              <option value="" disabled>
                Select Class
              </option>

              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
            <p id="register-class-status" role="status" className="mt-2 text-sm text-neutral-300">
              {classStatus === "loading" && "Loading classes..."}
              {classStatus === "error" && "Could not load classes. Registration is temporarily unavailable."}
              {classStatus === "ready" && classes.length === 0 && "No classes are available. Please contact your administrator."}
            </p>
            {classStatus === "error" && (
              <button type="button" className="mt-2 rounded-lg border border-neutral-600 px-3 py-2 text-sm" onClick={() => {
                setClassStatus("loading");
                setClassRetry((value) => value + 1);
              }}>Retry classes</button>
            )}
          </div>

          {selectedClassId && (
            <div>
              <p role="status" className="text-sm text-neutral-300">
                {dojoStatus === "loading" && "Loading dojos..."}
                {dojoStatus === "error" && "Could not load dojos. Please retry before registering."}
                {dojoStatus === "ready" && dojos.length === 0 && "No dojo is listed for this class. Your administrator will review your registration."}
              </p>
              {dojoStatus === "error" && (
                <button type="button" className="mt-2 rounded-lg border border-neutral-600 px-3 py-2 text-sm" onClick={() => {
                  setDojoStatus("loading");
                  setDojoRetry((value) => value + 1);
                }}>Retry dojos</button>
              )}
            </div>
          )}

          {catalogReady && dojos.length > 0 && (
            <div>
              <label htmlFor="register-dojo" className="mb-1 block text-sm font-medium">
                Dojo
              </label>

              <select
                id="register-dojo"
                required
                disabled={loading}
                value={selectedDojoId}
                onChange={(e) => setSelectedDojoId(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
              >
                <option value="" disabled>
                  Select Dojo
                </option>

                {dojos.map((dojoItem) => (
                  <option key={dojoItem.id} value={dojoItem.id}>
                    {dojoItem.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="register-password" className="mb-1 block text-sm font-medium">
              Password
            </label>

            <input
              id="register-password"
              aria-describedby="register-password-help"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
            <p id="register-password-help" className="mt-2 text-sm text-neutral-400">
              Use at least 10 characters, including uppercase, lowercase, and a number.
            </p>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1 block text-sm font-medium">
              Confirm Password
            </label>

            <input
              id="register-confirm-password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !catalogReady}
            className="w-full rounded-lg bg-sky-700 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-950 disabled:text-neutral-300 disabled:opacity-100"
          >
            {loading ? "Registering..." : "Register"}
          </button>

            <p role="status" aria-live="polite" className="text-center text-sm text-neutral-300">
              {message}
            </p>
        </form>

        <div className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <a
            href="/login"
            tabIndex={0}
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            Log in
          </a>
        </div>
      </div>
    </main>
  );
}
