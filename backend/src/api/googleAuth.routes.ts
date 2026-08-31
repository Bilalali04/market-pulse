import { Router, Request, Response } from "express";
import {
  buildGoogleConsentUrl,
  exchangeCodeForGoogleIdentity,
  findOrCreateGoogleUser,
  GoogleAccountEmailCollisionError,
} from "../auth/googleAuth";
import { signAccessToken } from "../auth/jwt";

export const googleAuthRouter = Router();

const FRONTEND_CALLBACK_PATH = "/auth/callback";

function frontendCallbackUrl(): string {
  const origin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  return `${origin}${FRONTEND_CALLBACK_PATH}`;
}

googleAuthRouter.get("/google", (_req: Request, res: Response) => {
  res.redirect(buildGoogleConsentUrl());
});

googleAuthRouter.get("/google/callback", async (req: Request, res: Response) => {
  const code = req.query.code;

  if (typeof code !== "string") {
    res.redirect(`${frontendCallbackUrl()}#error=missing_code`);
    return;
  }

  try {
    const identity = await exchangeCodeForGoogleIdentity(code);
    const user = await findOrCreateGoogleUser(identity);
    const token = signAccessToken({ id: user.id, role: user.role });

    // Token goes in the URL FRAGMENT (after #), not a query param.
    // Fragments are never transmitted to the server by the browser (they
    // never appear in the HTTP request line at all), so this can't end
    // up in server access logs the way a query param would - directly
    // addressing that risk. It can still land in browser history, same
    // as a query param would; fully closing that would need a different
    // mechanism (e.g. an httpOnly cookie), which isn't compatible with
    // this app's existing localStorage-based token handling without a
    // real frontend change - out of scope for this backend-only step.
    res.redirect(`${frontendCallbackUrl()}#token=${encodeURIComponent(token)}`);
  } catch (err) {
    if (err instanceof GoogleAccountEmailCollisionError) {
      res.redirect(`${frontendCallbackUrl()}#error=email_registered_locally`);
      return;
    }
    // Deliberately not logging `err` itself - some SDK/HTTP-client error
    // paths can embed the authorization code or raw token response in
    // the error message or object. Only ever a fixed, generic message.
    console.error("[auth] Google OAuth callback failed");
    res.redirect(`${frontendCallbackUrl()}#error=google_sign_in_failed`);
  }
});
