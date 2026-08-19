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

function validatePeriod(prices: number[], period: number): void {
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

export function calculateEMA(prices: number[], period: number): (number | null)[] {
  validatePeriod(prices, period);

  const result: (number | null)[] = new Array(prices.length).fill(null);
  const multiplier = 2 / (period + 1);

  // Seed with the SMA of the first `period` values.
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let previousEma = sum / period;
  result[period - 1] = previousEma;

  for (let i = period; i < prices.length; i++) {
    const ema = (prices[i] - previousEma) * multiplier + previousEma;
    result[i] = ema;
    previousEma = ema;
  }

  return result;
}
