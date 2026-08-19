// Pure math only - no I/O, no wiring into the app yet.
import { calculateEMA, validatePeriod } from "./movingAverages";

// fastPeriod >= slowPeriod isn't a period-vs-array-length problem (what
// InvalidPeriodError models), it's a relationship between two periods -
// MACD is nonsensical if the "fast" average isn't actually faster than the
// "slow" one. A distinct, clearly-named error type models this more
// honestly than forcing it into InvalidPeriodError's (period, length)
// shape.
export class InvalidMacdPeriodsError extends Error {
  constructor(fastPeriod: number, slowPeriod: number) {
    super(`fastPeriod (${fastPeriod}) must be strictly less than slowPeriod (${slowPeriod})`);
    this.name = "InvalidMacdPeriodsError";
  }
}

export interface MacdResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MacdResult {
  // All three periods validated upfront, before any computation, so
  // invalid input fails immediately regardless of which period is bad.
  validatePeriod(prices, fastPeriod);
  validatePeriod(prices, slowPeriod);
  validatePeriod(prices, signalPeriod);

  if (fastPeriod >= slowPeriod) {
    throw new InvalidMacdPeriodsError(fastPeriod, slowPeriod);
  }

  const fastEma = calculateEMA(prices, fastPeriod);
  const slowEma = calculateEMA(prices, slowPeriod);

  const macdLine: (number | null)[] = prices.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? (fastEma[i] as number) - (slowEma[i] as number) : null
  );

  // calculateEMA accepts a leading run of nulls - macdLine is null until
  // slowEma has enough data, then entirely real numbers, exactly that
  // shape.
  const signalLine = calculateEMA(macdLine, signalPeriod);

  const histogram: (number | null)[] = macdLine.map((macdValue, i) =>
    macdValue !== null && signalLine[i] !== null ? macdValue - (signalLine[i] as number) : null
  );

  return { macdLine, signalLine, histogram };
}
