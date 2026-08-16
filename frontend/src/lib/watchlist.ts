// Mirrors the watchlist seeded into the backend's fundamentals table
// (backend/src/screener/seed-fundamentals.ts). AAPL, MO, and WYNN have no
// price_history data (the Kaggle CSV backfill didn't cover them) - they're
// still included so the symbol selector can demonstrate the no-data state,
// but deliberately placed after the symbols that do have data so the
// default selection on page load renders a real chart, not an error.
export const WATCHLIST = [
  "MSFT",
  "GOOGL",
  "NVDA",
  "ADBE",
  "JNJ",
  "PG",
  "KO",
  "MCD",
  "HD",
  "PFE",
  "UNH",
  "XOM",
  "CVX",
  "JPM",
  "BAC",
  "AAPL",
  "MO",
  "WYNN",
];
