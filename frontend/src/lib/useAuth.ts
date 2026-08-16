"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeJwtPayload } from "./jwt";
import { getToken, clearToken } from "./token";

interface TokenPayload {
  id: string;
  role: string;
  exp: number;
}

export function useAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      setIsChecking(false);
      return;
    }

    const payload = decodeJwtPayload<TokenPayload>(token);
    const isExpired = !payload?.exp || payload.exp * 1000 <= Date.now();

    if (isExpired) {
      clearToken();
      router.replace("/login");
      setIsChecking(false);
      return;
    }

    setIsAuthenticated(true);
    setIsChecking(false);
  }, [router]);

  return { isAuthenticated, isChecking };
}
