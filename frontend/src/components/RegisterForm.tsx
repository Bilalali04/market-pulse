"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerRequest } from "../lib/api";
import { FormField } from "./FormField";
import { GoogleSignInButton } from "./GoogleSignInButton";

// Must match MIN_PASSWORD_LENGTH in backend/src/auth/validation.ts
const MIN_PASSWORD_LENGTH = 8;

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerRequest(email, password);
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <FormField id="email" label="Email" type="email" value={email} onChange={setEmail} />
      <FormField id="password" label="Password" type="password" value={password} onChange={setPassword} />
      {error && <p className="text-sm text-flag">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-ink px-3 py-2 text-paper outline-offset-2 focus:outline focus:outline-2 focus:outline-ink disabled:opacity-50"
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-xs text-slate">or</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>
      <GoogleSignInButton />
      <p className="text-sm text-slate">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline outline-offset-2 focus:outline focus:outline-2 focus:outline-ink">
          Log in
        </Link>
      </p>
    </form>
  );
}
