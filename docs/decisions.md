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
