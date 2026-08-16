export type ExcludedCategory =
  | "conventional-banking-insurance"
  | "alcohol"
  | "tobacco"
  | "gambling"
  | "adult-entertainment"
  | "conventional-weapons";

// Finnhub `finnhubIndustry` strings known to indicate each excluded
// category, matched case-insensitively and exactly (not substring, to
// avoid false positives against unrelated categories with similar names).
//
// Entries marked "confirmed" were observed directly in real Finnhub API
// responses for the Day 3 seeded watchlist. Entries marked "expected"
// follow Finnhub's naming pattern but haven't been verified against a real
// symbol yet, since no symbol in that category is in the current
// watchlist - if one is added later and reports a different string, add it
// here.
//
// Some categories are intentionally left with an empty (or near-empty)
// pattern list rather than a guessed broad pattern:
// - "Beverages" alone is NOT listed under alcohol: it's too broad and
//   would incorrectly exclude non-alcoholic beverage companies (KO,
//   confirmed sector = "Beverages"). No pure-play alcohol producer is in
//   the watchlist to confirm a narrower label against.
// - "Aerospace & Defense" alone is NOT listed under conventional-weapons:
//   it's too broad and would incorrectly exclude non-weapons aerospace
//   companies (e.g. commercial aviation). No defense contractor is in the
//   watchlist to confirm a narrower label against.
// - Gambling has no confirmed pattern at all: the one gambling company in
//   the watchlist (WYNN) reports as "Hotels, Restaurants & Leisure", too
//   broad to exclude wholesale (it also covers MCD). See
//   sectorOverrides.ts for how WYNN is actually caught.
export const EXCLUDED_SECTOR_PATTERNS: Record<ExcludedCategory, string[]> = {
  "conventional-banking-insurance": [
    "Banking", // confirmed: JPM, BAC
    "Insurance", // expected, not yet observed
  ],
  alcohol: [],
  tobacco: [
    "Tobacco", // confirmed: MO
  ],
  gambling: [],
  "adult-entertainment": [
    "Adult Entertainment", // expected, not yet observed
  ],
  "conventional-weapons": [],
};
