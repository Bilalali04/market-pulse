// Pure data preparation - no model, no ML library, no training. Builds a
// labeled feature dataset for next-day price-direction prediction, reusing
// the already-verified indicator functions unmodified.
import { calculateSMA } from "./movingAverages";
import { calculateRSI } from "./rsi";
import { calculateMACD } from "./macd";

const SMA_PERIOD = 20;

// Five features:
// - rsi14, macdHistogram, priceToSma20: the three requested in the task.
// - return1d = (price[t] - price[t-1]) / price[t-1]: the most direct
//   momentum signal there is (yesterday's move), and it's "free" here -
//   day t-1 is already guaranteed available by the time MACD's own
//   warm-up (the longest of the three indicators) has passed, so adding
//   it costs no extra warm-up rows versus the three base features alone.
// - rsiMomentum1d = rsi[t] - rsi[t-1]: RSI's own day-over-day change.
//   RSI(14) is itself already a smoothed feature; how it's *trending*
//   (rising vs falling) carries information the raw level alone doesn't
//   (e.g. RSI at 55 while climbing from 40 reads very differently than
//   RSI at 55 while falling from 70). Same "free" warm-up argument as
//   return1d, and it's derived purely from the already-computed rsi
//   array - no new indicator logic.
const FEATURE_NAMES = ["rsi14", "macdHistogram", "priceToSma20", "return1d", "rsiMomentum1d"];

export interface LabeledDataset {
  features: number[][];
  labels: number[];
  featureNames: string[];
  dates: string[];
}

export function buildLabeledDataset(prices: number[], dates: string[]): LabeledDataset {
  if (prices.length !== dates.length) {
    throw new Error(`prices and dates must have the same length (got ${prices.length} and ${dates.length})`);
  }

  const sma = calculateSMA(prices, SMA_PERIOD);
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);

  const features: number[][] = [];
  const labels: number[] = [];
  const outDates: string[] = [];

  // t needs a prior day (t - 1) for return1d/rsiMomentum1d, and a next
  // day (t + 1) for the label - so t ranges over [1, length - 2]. This is
  // also where lookahead leakage would be introduced if it existed: every
  // value read into a feature below is indexed at t or t - 1, never
  // higher. prices[t + 1] appears exactly once, on the label line, which
  // is the one place it's supposed to look forward - that's the
  // definition of a next-day-direction label, not a feature.
  for (let t = 1; t < prices.length - 1; t++) {
    const smaT = sma[t];
    const rsiT = rsi[t];
    const rsiPrev = rsi[t - 1];
    const macdHistT = macd.histogram[t];

    if (smaT === null || rsiT === null || rsiPrev === null || macdHistT === null) {
      continue; // still inside some indicator's warm-up period
    }

    const priceT = prices[t];
    const pricePrev = prices[t - 1];

    features.push([rsiT, macdHistT, (priceT - smaT) / smaT, (priceT - pricePrev) / pricePrev, rsiT - rsiPrev]);
    labels.push(prices[t + 1] > priceT ? 1 : 0);
    outDates.push(dates[t]);
  }

  return { features, labels, featureNames: FEATURE_NAMES, dates: outDates };
}
