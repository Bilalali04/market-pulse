import { OAuth2Client } from "google-auth-library";
import { pool } from "../db/pool";

export class GoogleAccountEmailCollisionError extends Error {
  constructor(email: string) {
    super(`a local account already exists for ${email}`);
    this.name = "GoogleAccountEmailCollisionError";
  }
}

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function getGoogleConfig(): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI)");
  }
  return { clientId, clientSecret, redirectUri };
}

function createGoogleOAuthClient(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

// 'openid email profile', not a broader scope. `openid` isn't an
// additional data-access grant the way e.g. calendar/drive/contacts
// scopes would be - it's what makes Google return a verifiable ID token
// (carrying the `sub` claim this flow identifies users by) instead of
// just an opaque access token that would need a separate userinfo API
// call to get the same email/profile data, unverified.
const SCOPES = ["openid", "email", "profile"];

export function buildGoogleConsentUrl(): string {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "online", // no refresh token needed - this is sign-in, not offline API access
    scope: SCOPES,
    prompt: "select_account",
  });
}

export interface GoogleIdentity {
  email: string;
  googleId: string;
}

// Exchanges an authorization code for tokens and verifies the returned
// ID token. Deliberately never logs `code`, the token response, or any
// part of a thrown error here - only fixed, generic messages ever reach
// a log, at the call site in the route handler.
export async function exchangeCodeForGoogleIdentity(code: string): Promise<GoogleIdentity> {
  const { clientId } = getGoogleConfig();
  const client = createGoogleOAuthClient();

  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error("Google token response did not include an id_token");
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
  const payload = ticket.getPayload();

  if (!payload?.email || !payload.sub) {
    throw new Error("Google ID token is missing email or sub");
  }

  return { email: payload.email, googleId: payload.sub };
}

interface UserIdentity {
  id: string;
  role: string;
}

// Google sign-in and local password sign-in are kept as separate,
// unlinked identities on email collision - a real edge case, decided
// here rather than left unhandled. This project's local registration
// never verifies email ownership (no confirmation email step - see
// register.ts), so silently merging a Google sign-in into an existing
// local account purely because the email string matches would let
// anyone who'd registered a local account using someone else's email
// address get folded into whatever that email's real owner later signs
// into via Google, or vice versa. Rejecting the collision and pointing
// the user at password login instead avoids that; a real "link this
// Google account to my existing password account" flow would need to
// happen from inside an already-authenticated session (proving the user
// controls BOTH credentials), not implicitly during sign-in based on
// email string equality alone.
export async function findOrCreateGoogleUser(identity: GoogleIdentity): Promise<UserIdentity> {
  const byGoogleId = await pool.query<UserIdentity>(`SELECT id, role FROM users WHERE google_id = $1`, [
    identity.googleId,
  ]);
  if (byGoogleId.rows[0]) {
    return byGoogleId.rows[0];
  }

  const byEmail = await pool.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [identity.email]);
  if (byEmail.rows[0]) {
    throw new GoogleAccountEmailCollisionError(identity.email);
  }

  const created = await pool.query<UserIdentity>(
    `INSERT INTO users (email, auth_provider, google_id) VALUES ($1, 'google', $2) RETURNING id, role`,
    [identity.email, identity.googleId]
  );
  return created.rows[0];
}
