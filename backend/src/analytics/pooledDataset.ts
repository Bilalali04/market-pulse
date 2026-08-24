// Combines buildLabeledDataset's output across multiple symbols into one
// pooled dataset, for training on more rows than any single symbol's own
// history provides. Pure data prep - no I/O; callers fetch each symbol's
// price history and pass it in.
import { buildLabeledDataset } from "./predictionDataset";

export interface SymbolPriceHistory {
  symbol: string;
  prices: number[];
  dates: string[];
}

export interface PooledDataset {
  features: number[][];
  labels: number[];
  featureNames: string[];
  dates: string[];
  // Parallel to features/labels/dates - which symbol each row came from.
  // Kept per-row (not just a summary list) because splitting later needs
  // to filter by date across the whole pool without losing track of which
  // rows belong to which symbol's original series.
  symbols: string[];
}

export function buildPooledDataset(histories: SymbolPriceHistory[]): PooledDataset {
  if (histories.length === 0) {
    throw new Error("buildPooledDataset requires at least one symbol's price history");
  }

  const features: number[][] = [];
  const labels: number[] = [];
  const dates: string[] = [];
  const symbols: string[] = [];
  let featureNames: string[] | null = null;

  for (const { symbol, prices, dates: symbolDates } of histories) {
    const dataset = buildLabeledDataset(prices, symbolDates);
    if (featureNames === null) {
      featureNames = dataset.featureNames;
    }
    for (let i = 0; i < dataset.features.length; i++) {
      features.push(dataset.features[i]);
      labels.push(dataset.labels[i]);
      dates.push(dataset.dates[i]);
      symbols.push(symbol);
    }
  }

  return { features, labels, featureNames: featureNames as string[], dates, symbols };
}
