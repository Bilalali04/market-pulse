"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setToken } from "../../../lib/token";

type CallbackState = "processing" | "failed";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>("processing");

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    const error = params.get("error");

    if (token) {
      setToken(token);
      router.replace("/dashboard");
      return;
    }

    if (error === "email_registered_locally") {
      router.replace("/login?googleError=email_registered_locally");
      return;
    }

    // Any other/unexpected error value, or no hash at all.
    setState("failed");
  }, [router]);

  if (state === "failed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper p-8 text-center">
        <p className="text-sm text-flag">Google sign-in failed. Please try again.</p>
        <Link
          href="/login"
          className="text-sm text-ink underline outline-offset-2 focus:outline focus:outline-2 focus:outline-ink"
        >
          Back to login
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper p-8">
      <p className="text-sm text-slate">Signing you in...</p>
    </main>
  );
}
