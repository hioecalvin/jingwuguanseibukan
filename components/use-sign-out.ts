"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useSignOut() {
  const router = useRouter();
  const pending = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    if (pending.current) return;
    pending.current = true;
    setSigningOut(true);
    setErrorMessage("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) {
        setErrorMessage("Unable to sign out. Please try again.");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign out. Please try again.");
    } finally {
      pending.current = false;
      setSigningOut(false);
    }
  }

  return { signingOut, errorMessage, handleLogout };
}
