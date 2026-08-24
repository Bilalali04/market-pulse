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

## Client-side-only protected routes (Day 2)
`/dashboard` (and any future protected frontend route) is guarded by a
client-side `useAuth` hook / `RequireAuth` wrapper: it checks for a token
in `localStorage`, decodes it to check `exp`, and redirects to `/login` if
missing or expired. There is no Next.js `middleware.ts` doing this at the
edge/server level yet. This is a deliberate scope choice, not an
oversight: the backend API routes are the real authority (JWT verified
server-side via `authenticate`/`requireRole` on every protected backend
call), so a client-side-only frontend guard cannot leak data, it can only
be bypassed to see an empty/placeholder page shell for a moment before
redirecting. Adding `middleware.ts` for server-side redirect (avoiding
even that placeholder flash) is a reasonable later hardening step, not
required for this stage.

## Fundamentals data source: Finnhub over Kaggle (Day 3)
Considered seeding the `fundamentals` table from a static Kaggle dataset
(consistent with the architecture note that fundamentals change slowly and
don't need to be real-time), but Kaggle's readily available fundamentals
datasets don't include sector/industry classification or anything
interest-income-related, both of which the halal screener needs. Finnhub
was used instead: we already have the WebSocket integration and API key
from Day 3's ingestion work, and Finnhub's REST endpoints
(`/stock/profile2`, `/stock/metric`) cover sector and enough debt data to
be useful. No new data source or credential was introduced just for this.

## Interest-income criterion dropped from halal screener scope (Day 3)
The halal screener's original scope (per `CLAUDE.md`) included an
interest-income ratio check alongside sector and debt-to-market-cap.
Finnhub's free tier does not expose an interest-income line item that can
be pulled cleanly, and there is no reliable derivation from the fields
that are available (unlike debt-to-market-cap, see below). Rather than
fabricate or approximate a number for it, the criterion is dropped from
scope entirely: the `fundamentals` table has no interest-income column,
and the screener will only ever check sector and debt-to-market-cap. If a
paid data source is added later this can be revisited.

Related methodology note: Finnhub's free tier also doesn't expose a raw
total-debt dollar figure, only debt/equity ratios and per-share book
value. `debtToMarketCap` is derived from real reported figures (book value
per share x shares outstanding = total equity, then apply the reported
debt/equity ratio to get total debt, divide by market cap) rather than
fabricated; if any input is missing, the result is `null`, never guessed.
See `backend/src/screener/finnhubFundamentalsFetcher.ts`.

## Fundamentals seed script reuses the Finnhub fetcher (Day 3)
`backend/src/screener/seed-fundamentals.ts` (one-off script) calls the
same `FinnhubFundamentalsFetcher` that would power a future scheduled
refresh job. There is no separate "refresh" code path: refreshing
fundamentals later is the same fetch-and-upsert call, just re-run on a
schedule against the existing watchlist, since fundamentals change slowly
enough that a from-scratch refresh mechanism isn't warranted yet.

## Known limitation: Finnhub sector granularity is too coarse for gambling (Day 3)
WYNN was deliberately included in the Day 3 seed watchlist as a
known-should-fail case for the future sector-based halal screen (casino
operator). Finnhub's `finnhubIndustry` classification returned
`Hotels, Restaurants & Leisure` for WYNN, the same bucket as non-gambling
peers like MCD, rather than a distinct gambling label. A naive
sector-string-match screen (e.g. reject if sector in a blocklist) will not
catch WYNN on classification alone. Not fixed as part of Day 3, since
fixing it belongs to the screening-rules step, not the data-seeding step;
noted here so whoever builds the rules engine knows sector alone is
insufficient for gambling exclusion and needs either a finer-grained
classification source or a name/description-based supplementary check.

## Live trade stream: no free/paid tiering (Day 4)
The original architecture notes described the live WebSocket stream as
tier-gated: free-tier users would get a limited/delayed view, paid-tier
users would get the full live stream. That tiering is deliberately dropped
for the live trade broadcast (`backend/src/realtime/tradeStreamServer.ts`):
any authenticated user, any role, gets the same full, immediate stream.
There is no paywall on real-time data in this project. The `authenticate`
middleware's tier concept (`free`/`paid`/`admin`) still exists and is still
enforced elsewhere (e.g. `requireRole` on other routes) - this decision is
scoped specifically to the live trade stream, not a removal of RBAC
project-wide. If tiering the live stream is wanted later, it would need
per-connection role tracking and a way to actually delay or filter the
broadcast per client, neither of which exists today.

## price_history backfill replaced: 10-year Kaggle S&P 500 dataset with volume
The original `price_history` backfill (Day 3-ish, `kaggle-backfill` source)
came from a wide-format Kaggle CSV that only covered 15 of the 18
watchlist symbols - AAPL, MO, and WYNN had zero rows, a known gap noted at
the time in `frontend/src/lib/watchlist.ts`. That dataset is now replaced
entirely (not merged) with a second Kaggle dataset
(`SP500_Data_10Y`, one CSV per ticker), imported via
`backend/src/priceHistory/importSp500History.ts`, which:
- covers all 18 watchlist symbols (closes the AAPL/MO/WYNN gap)
- spans 10 years (2015-12-21 to 2025-12-19) instead of the original ~4
- includes real per-day volume, which `price_history` previously had no
  column for at all (added via migration
  `1787156413776_add-volume-to-price-history`, `ALTER TABLE ... ADD
  COLUMN`, not a drop/recreate)

The old script (`importPriceHistory.ts`) and its source file
(`data/stocks.csv`) were deleted rather than left alongside the new one:
keeping a script that reads a since-deleted, inferior, now-superseded
data source around would just be dead code someone could accidentally
re-run. The new import truncates `price_history` before inserting
(`source = 'kaggle-sp500-10y'`, distinct from the old `kaggle-backfill`
value) - this is a deliberate full replacement, not a merge, run inside a
single transaction so a partial failure can't leave the table half
truncated.

Data quirk worth knowing if this is ever touched again: NVDA's pre-split
(2016-2019) rows show close prices in the $1-4 range and correspondingly
huge volume figures (up to ~3.69 billion shares on 2017-06-09) - this
dataset is split-adjusted (NVDA had a 4:1 split in 2021 and a 10:1 split
in 2024), and volume is adjusted along with price to keep price x volume
economically consistent across the split boundary. Confirmed this is a
real characteristic of the source data, not an import bug, by checking
which symbol/dates produced the outlier and cross-referencing NVDA's
known split history - not something to "fix" by rescaling, since that
would mean fabricating a correction not present in the source.

**Methodology note, not a data note:** the single-symbol logistic
regression result (47.18% model vs 46.67% baseline) and the pooled
15-symbol result (50.05% model vs 51.00% baseline, model behind) were
both computed against the *old* `kaggle-backfill` data - shorter history,
15 symbols, no volume. Both results are superseded by this data
replacement (the underlying rows they were computed from no longer
exist) and would need to be re-run against the new dataset to still be
meaningful numbers. They're not deleted from the earlier conversation
record because the *methodology* (chronological split, train-only
standardization, validation-only tuning, one-time test evaluation) is
still valid and worth keeping as documented reasoning - only the specific
reported numbers no longer describe live data.
