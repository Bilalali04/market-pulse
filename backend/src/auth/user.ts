// Canonical shape of a `users` row, reflecting the schema after
// 1787601485736_add-google-auth-support-to-users: password_hash and
// google_id are each nullable, mutually required by auth_provider (see
// that migration's CHECK constraints). register.ts's RegisteredUser and
// login.ts's UserRow are deliberately narrower, query-specific
// projections of this shape (only the columns each query actually
// selects) - not being widened here, since neither route is changing
// behavior yet.
export type AuthProvider = "local" | "google";

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  authProvider: AuthProvider;
  googleId: string | null;
  role: string;
  createdAt: Date;
}
