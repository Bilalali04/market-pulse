"use client";

import { ReactNode } from "react";
import { useAuth } from "../lib/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isChecking } = useAuth();

  if (isChecking || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
