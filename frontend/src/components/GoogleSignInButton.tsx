"use client";

import { API_BASE_URL } from "../lib/api";

// A full page navigation (not router.push, not fetch) - this needs to
// leave the SPA entirely and land on Google's own consent screen, then
// eventually get redirected back by the backend, not stay client-side.
export function GoogleSignInButton() {
  function handleClick() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded border border-hairline px-3 py-2 text-ink outline-offset-2 transition-colors hover:border-ink focus:outline focus:outline-2 focus:outline-ink"
    >
      Sign in with Google
    </button>
  );
}
