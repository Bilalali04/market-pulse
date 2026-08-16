import { ExcludedCategory } from "./excludedCategories";

export interface SectorOverride {
  symbol: string;
  category: ExcludedCategory;
  reason: string;
}

// Manual overrides for symbols whose real primary business doesn't cleanly
// surface in Finnhub's sector/industry classification. Checked before the
// automatic sector-string match, so these take priority regardless of what
// Finnhub reports for the symbol.
//
// Keep this list small and add to it only when a specific symbol is
// confirmed (via real API output) to be misclassified - don't add entries
// speculatively ahead of evidence.
export const SECTOR_OVERRIDES: SectorOverride[] = [
  {
    symbol: "WYNN",
    category: "gambling",
    reason:
      'Wynn Resorts is a casino/gambling operator, but Finnhub classifies it under "Hotels, Restaurants & Leisure" ' +
      "(the same bucket as non-gambling companies like MCD), not a distinct gambling label.",
  },
];
