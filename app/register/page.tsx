"use client";

import { useEffect, useState } from "react";
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
  const supabase = createClient();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [dojos, setDojos] = useState<DojoItem[]>([]);

  const [fullName, setFullName] = useState("");
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
    async function loadClasses() {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");

      if (error) {
        setMessage("Could not load classes.");
        return;
      }

      setClasses(data ?? []);
    }

    loadClasses();
  }, [supabase]);

  useEffect(() => {
    async function loadDojos() {
      if (!selectedClassId) {
        setDojos([]);
        return;
      }

      const { data, error } = await supabase
        .from("dojos")
        .select("id, name, class_id")
        .eq("class_id", selectedClassId)
        .eq("active", true)
        .order("name");

      if (error) {
        setMessage("Could not load dojos.");
        return;
      }

      setDojos(data ?? []);
    }

    loadDojos();
  }, [selectedClassId, supabase]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!selectedClassId) {
      setMessage("Please select a class.");
      return;
    }

    if (dojos.length > 0 && !selectedDojoId) {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          date_of_birth: dateOfBirth,
          phone,
          requested_class_id: selectedClassId,
          requested_class_name: selectedClass?.name ?? null,
          requested_dojo_id: selectedDojoId || null,
          requested_dojo_name: selectedDojo?.name ?? null,
        },
emailRedirectTo: `${window.location.origin}/login`,      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Registration successful. Please check your email to verify your account."
    );

    setLoading(false);
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

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Full Name
            </label>

            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Date of Birth
            </label>

            <input
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Phone Number
            </label>

            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Class
            </label>

            <select
              required
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedDojoId("");
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
          </div>

          {selectedClassId && dojos.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Dojo
              </label>

              <select
                required
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
            <label className="mb-1 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Confirm Password
            </label>

            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>

          {message && (
            <p className="text-center text-sm text-neutral-300">
              {message}
            </p>
          )}
        </form>

        <div className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            Log in
          </a>
        </div>
      </div>
    </main>
  );
}