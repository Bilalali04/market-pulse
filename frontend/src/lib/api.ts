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
