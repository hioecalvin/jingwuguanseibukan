"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
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
<h1 className="text-3xl font-bold text-center">
          Jingwuguan Seibukan
        </h1>

        <p className="mt-2 text-center text-neutral-400">
          Member Login
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"              placeholder="member@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
className="w-full rounded-lg bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          {message && (
            <p className="text-center text-sm text-red-600">
              {message}
            </p>
          )}
        </form>

        <div className="mt-6 text-center text-sm">
            <a href="/register" className="font-medium text-sky-400 hover:text-sky-300">
             Create account
            </a>
        </div>
      </div>
    </main>
  );
}