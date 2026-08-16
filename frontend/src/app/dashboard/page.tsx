"use client";

import { useRouter } from "next/navigation";
import { RequireAuth } from "../../components/RequireAuth";
import { clearToken } from "../../lib/token";

function DashboardContent() {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <button onClick={handleLogout} className="rounded bg-blue-600 px-3 py-2 text-white">
        Log out
      </button>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
