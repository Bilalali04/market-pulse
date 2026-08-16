// Decodes a JWT payload without verifying its signature. Client-side use
// only, for reading claims like `exp` to decide whether to bother sending
// the token to the backend; the backend remains the real authority on
// validity.
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as T;
  } catch {
    return null;
  }
}
