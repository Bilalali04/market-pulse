// Pure math only - no I/O, no wiring into the app yet.

// `period` is a caller-supplied argument the caller fully controls, not
// untrusted external data (contrast with backend/src/ingestion/finnhubParser.ts,
// which returns a discriminated result for untrusted network input because a
// throw there would take down the ingestion service). An invalid period here
// is a programming bug, not recoverable data - it should fail loudly and
// immediately rather than be silently absorbed into a return value a caller
// could forget to check.
// Message intentionally doesn't assert a specific comparison operator
// (e.g. "<=") since the exact valid boundary differs by function - SMA/EMA
// need `period` prices, RSI needs `period + 1` (see rsi.ts). Reused as-is
// across analytics functions; each caller enforces its own correct bound
// before throwing.
export class InvalidPeriodError extends Error {
  constructor(period: number, length: number) {
    super(`invalid period ${period} for price array of length ${length}`);
    this.name = "InvalidPeriodError";
  }
}

// Exported so macd.ts can reuse the exact same bound check for all three
// of its periods (fast/slow/signal) instead of re-implementing it.
export function validatePeriod(prices: (number | null)[], period: number): void {
  if (!Number.isInteger(period) || period <= 0 || period > prices.length) {
    throw new InvalidPeriodError(period, prices.length);
  }
}

export function calculateSMA(prices: number[], period: number): (number | null)[] {
  validatePeriod(prices, period);

  const result: (number | null)[] = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += prices[j];
    }
    result[i] = sum / period;
  }

  return result;
}

// Accepts a LEADING run of nulls (e.g. macd.ts's macdLine, which is null
// until slowEma has enough data, then entirely real numbers) so it can
// also serve as the composition point for MACD's signal line, without
// macd.ts reimplementing EMA. Not designed to handle nulls appearing
// after real data has started - that shape doesn't occur anywhere in
// this codebase's actual usage.
//
// For a null-free array (the original use case), the first non-null
// index is always 0, so this is byte-identical to the previous
// implementation for every existing caller - re-verified directly.
export function calculateEMA(prices: (number | null)[], period: number): (number | null)[] {
  validatePeriod(prices, period);

  const result: (number | null)[] = new Array(prices.length).fill(null);
  const multiplier = 2 / (period + 1);

  const firstNonNullIndex = prices.findIndex((p) => p !== null);
  if (firstNonNullIndex === -1 || firstNonNullIndex + period > prices.length) {
    return result; // no real data, or not enough trailing data for one full window
  }

  // Seed with the SMA of the first `period` real values.
  let sum = 0;
  for (let i = firstNonNullIndex; i < firstNonNullIndex + period; i++) {
    sum += prices[i] as number;
  }
  let previousEma = sum / period;
  result[firstNonNullIndex + period - 1] = previousEma;

  for (let i = firstNonNullIndex + period; i < prices.length; i++) {
    const ema = ((prices[i] as number) - previousEma) * multiplier + previousEma;
    result[i] = ema;
    previousEma = ema;
  }

  return result;
}
