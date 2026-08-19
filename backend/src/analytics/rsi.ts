// Pure math only - no I/O, no wiring into the app yet.
import { InvalidPeriodError } from "./movingAverages";

// RSI needs `period` price changes (deltas) for its first average, which
// requires period + 1 prices - one more than SMA/EMA need for their first
// value (see movingAverages.ts). Reuses InvalidPeriodError and the
// throw-on-invalid-input philosophy, but with RSI's own correct boundary:
// period === prices.length would silently produce an all-null result (not
// enough deltas for even one value), which is exactly the kind of
// unhelpful silent output this validation exists to prevent.
function validateRsiPeriod(prices: number[], period: number): void {
  if (!Number.isInteger(period) || period <= 0 || period >= prices.length) {
    throw new InvalidPeriodError(period, prices.length);
  }
}

export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  validateRsiPeriod(prices, period);

  const result: (number | null)[] = new Array(prices.length).fill(null);

  const gains: number[] = new Array(prices.length).fill(0);
  const losses: number[] = new Array(prices.length).fill(0);
  for (let i = 1; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    gains[i] = delta > 0 ? delta : 0;
    losses[i] = delta < 0 ? -delta : 0;
  }

  // First average: simple average of the first `period` gains/losses.
  let sumGain = 0;
  let sumLoss = 0;
  for (let i = 1; i <= period; i++) {
    sumGain += gains[i];
    sumLoss += losses[i];
  }
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  result[period] = toRsi(avgGain, avgLoss);

  // Subsequent averages: Wilder's smoothing.
  for (let i = period + 1; i < prices.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    result[i] = toRsi(avgGain, avgLoss);
  }

  return result;
}

function toRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) {
    return 100;
  }
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
