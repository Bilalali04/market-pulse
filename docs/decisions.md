# Decisions

## Login timing side-channel (found Day 2, fixed Day 2)

**Issue:** In the `POST /auth/login` flow, the "no such user" path
short-circuited immediately after the email lookup, while the "wrong
password" path paid the full `bcrypt.compare` cost. This meant response
timing could theoretically distinguish "no such user" from "wrong
password," even though both returned the same generic 401 body.

**Fix:** When the email lookup finds no user, the login flow now runs a
dummy `bcrypt.compare()` against a fixed, precomputed hash (not derived
from any real user's password) before returning the 401, so the "no such
user" path pays the same bcrypt cost as the "wrong password" path instead
of short-circuiting. See `backend/src/auth/login.ts`.

## JWT staleness on role change (found Day 2)
Since access tokens are stateless and carry the role at issuance time, a
role change in the DB (e.g. free -> paid) does not take effect until the
user re-authenticates and receives a new token. Confirmed directly: an
already-issued free-tier token still returned 403 against a paid-gated
route immediately after the DB role update, until re-login. This is a
direct, acceptable consequence of the access-token-only decision (Day 2):
worst case staleness is bounded by the token's 1-hour expiry. Not a bug,
documented here so it's a deliberate, explained tradeoff rather than a
surprise later (e.g. if a "why didn't my upgrade take effect immediately"
question ever comes up).
