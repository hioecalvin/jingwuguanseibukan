"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);

    if (search.get("verified") === "true") {
      setMessage("Email verified. Log in to check your membership approval status.");
      setMessageType("success");
    } else if (search.get("error") === "disabled") {
      setMessage("This account is disabled. Contact an administrator for help.");
      setMessageType("error");
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    setMessageType("error");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Unable to log in. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
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

        <form onSubmit={handleLogin} aria-busy={loading} className="mt-8 space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium mb-1">
              Email
            </label>

            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"              placeholder="member@email.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium mb-1">
              Password
            </label>

            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-white placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
className="w-full rounded-lg bg-sky-700 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"          >
            {loading ? "Logging in..." : "Log In"}
          </button>

            <p
              role="status"
              aria-live={messageType === "error" ? "assertive" : "polite"}
              className={`text-center text-sm ${
                messageType === "success" ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
        </form>

        <div className="mt-6 text-center text-sm">
            <a href="/register" tabIndex={0} className="font-medium text-sky-400 hover:text-sky-300">
             Create account
            </a>
        </div>
      </div>
    </main>
  );
}
