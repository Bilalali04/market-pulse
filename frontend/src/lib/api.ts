const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export interface LoginResult {
  token: string;
}

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 401) {
    throw new Error("Invalid email or password.");
  }

  if (!response.ok) {
    throw new Error("Something went wrong. Please try again.");
  }

  return response.json();
}

export interface RegisterResult {
  id: string;
  email: string;
  role: string;
}

export async function registerRequest(email: string, password: string): Promise<RegisterResult> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 409) {
    throw new Error("An account with this email already exists.");
  }

  if (response.status === 400) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Invalid registration details.");
  }

  if (!response.ok) {
    throw new Error("Something went wrong. Please try again.");
  }

  return response.json();
}

export interface PricePoint {
  date: string;
  closePrice: number;
}

export interface PriceHistoryResult {
  symbol: string;
  prices: PricePoint[];
}

export async function priceHistoryRequest(symbol: string, token: string): Promise<PriceHistoryResult> {
  const response = await fetch(`${API_BASE_URL}/prices/${symbol}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) {
    throw new Error(`No price history available for ${symbol}.`);
  }

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Something went wrong loading price history. Please try again.");
  }

  return response.json();
}

export interface ScreeningResult {
  symbol: string;
  compliant: boolean;
  reasons: string[];
}

export async function screenerRequest(symbol: string, token: string): Promise<ScreeningResult> {
  const response = await fetch(`${API_BASE_URL}/screener/${symbol}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) {
    throw new Error(`No fundamentals data available for ${symbol}.`);
  }

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error("Something went wrong loading the compliance screen. Please try again.");
  }

  return response.json();
}
