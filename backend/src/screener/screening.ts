import { Fundamentals } from "./fundamentalsProvider";
import { EXCLUDED_SECTOR_PATTERNS, ExcludedCategory } from "./excludedCategories";
import { SECTOR_OVERRIDES } from "./sectorOverrides";

// Mirrors common Islamic-index screening methodologies (AAOIFI, S&P, MSCI
// Islamic indices commonly use ~33% debt-to-market-cap), not a threshold
// invented for this project.
const DEBT_TO_MARKET_CAP_THRESHOLD = 0.33;

export interface ScreeningResult {
  compliant: boolean;
  reasons: string[];
}

export function screenFundamentals(symbol: string, fundamentals: Fundamentals): ScreeningResult {
  const reasons: string[] = [];

  const sectorExclusionReason = checkSectorExclusion(symbol, fundamentals.sector);
  if (sectorExclusionReason) {
    reasons.push(sectorExclusionReason);
  }

  if (fundamentals.debtToMarketCap !== null && fundamentals.debtToMarketCap > DEBT_TO_MARKET_CAP_THRESHOLD) {
    const actualPct = (fundamentals.debtToMarketCap * 100).toFixed(0);
    const thresholdPct = DEBT_TO_MARKET_CAP_THRESHOLD * 100;
    reasons.push(`debt-to-market-cap ${actualPct}% exceeds ${thresholdPct}% threshold`);
  }

  return {
    compliant: reasons.length === 0,
    reasons,
  };
}

function checkSectorExclusion(symbol: string, sector: string): string | null {
  const override = SECTOR_OVERRIDES.find((entry) => entry.symbol === symbol);
  if (override) {
    return `sector override: ${override.category} - ${override.reason}`;
  }

  for (const [category, patterns] of Object.entries(EXCLUDED_SECTOR_PATTERNS) as [
    ExcludedCategory,
    string[]
  ][]) {
    const matches = patterns.some((pattern) => pattern.toLowerCase() === sector.toLowerCase());
    if (matches) {
      return `sector: ${sector} (excluded, ${category})`;
    }
  }

  return null;
}
