// Orchestrates the pooled-dataset training pipeline: build the pool,
// split by absolute calendar date, try a small bounded set of
// legitimate variations against VALIDATION only, then run the single
// best-performing config against TEST exactly once.
import { buildPooledDataset, PooledDataset, SymbolPriceHistory } from "./pooledDataset";
import {
  computeStandardization,
  applyStandardization,
  trainLogisticRegression,
  predict,
  TrainedModel,
} from "./logisticRegression";
import { evaluateBinaryClassifier, EvaluationResult } from "./trainModel";

interface DateSplitDataset {
  features: number[][];
  labels: number[];
  dates: string[];
}

export interface ChronologicalSplit {
  train: DateSplitDataset;
  validation: DateSplitDataset;
  test: DateSplitDataset;
}

function filterByDateRange(dataset: PooledDataset, minDateInclusive: string | null, maxDateExclusive: string | null): DateSplitDataset {
  const features: number[][] = [];
  const labels: number[] = [];
  const dates: string[] = [];
  for (let i = 0; i < dataset.features.length; i++) {
    const d = dataset.dates[i];
    if (minDateInclusive !== null && d < minDateInclusive) continue;
    if (maxDateExclusive !== null && d >= maxDateExclusive) continue;
    features.push(dataset.features[i]);
    labels.push(dataset.labels[i]);
    dates.push(d);
  }
  return { features, labels, dates };
}

// Splits by ABSOLUTE CALENDAR DATE - the same two cutoffs applied to
// every symbol in the pool, not each symbol's own percentage split. A
// per-symbol percentage split would let, say, MSFT's last 15% (which
// might start in mid-2021, depending on MSFT's own history length) land
// in "test" while GOOGL's overlapping mid-2021 rows land in "train"
// purely because GOOGL's own history happens to have a different length
// or start date. Once a model is pooling across symbols, that's a real
// leakage channel: same-calendar-time information from one symbol could
// sit in training while the model is being tested on that exact same
// slice of history from a different symbol - the model could learn
// something about "what mid-2021 looked like" from GOOGL's training rows
// and get credit for it on MSFT's mid-2021 test rows, even though mid-
// 2021 was never supposed to be visible to training at all. A shared
// date cutoff guarantees every row in "train" is chronologically before
// every row in "test", for every symbol, with no exceptions.
export function splitChronologically(dataset: PooledDataset, cutoff1: string, cutoff2: string): ChronologicalSplit {
  return {
    train: filterByDateRange(dataset, null, cutoff1),
    validation: filterByDateRange(dataset, cutoff1, cutoff2),
    test: filterByDateRange(dataset, cutoff2, null),
  };
}

function selectColumns(features: number[][], indices: number[]): number[][] {
  return features.map((row) => indices.map((i) => row[i]));
}

function dateRange(dates: string[]): [string, string] {
  let min = dates[0];
  let max = dates[0];
  for (const d of dates) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

export interface ModelVariation {
  name: string;
  learningRate: number;
  epochs: number;
  // Indices into the canonical 5-feature vector
  // (rsi14, macdHistogram, priceToSma20, return1d, rsiMomentum1d).
  featureIndices: number[];
}

// A small, bounded set of legitimate variations - not a hyperparameter
// sweep. Three axes are each touched once: epoch count, learning rate,
// and whether either of the two "extra" features (the ones added beyond
// the task's original 3 required features) earns its place. Every one of
// these gets logged with its real validation accuracy below, including
// whichever ones don't help.
export const MODEL_VARIATIONS: ModelVariation[] = [
  { name: "baseline: all 5 features, lr=0.1, epochs=500", learningRate: 0.1, epochs: 500, featureIndices: [0, 1, 2, 3, 4] },
  { name: "more epochs: lr=0.1, epochs=1000", learningRate: 0.1, epochs: 1000, featureIndices: [0, 1, 2, 3, 4] },
  { name: "lower learning rate: lr=0.05, epochs=500", learningRate: 0.05, epochs: 500, featureIndices: [0, 1, 2, 3, 4] },
  { name: "drop rsiMomentum1d", learningRate: 0.1, epochs: 500, featureIndices: [0, 1, 2, 3] },
  { name: "drop return1d", learningRate: 0.1, epochs: 500, featureIndices: [0, 1, 2, 4] },
];

export interface VariationResult {
  variation: ModelVariation;
  validationAccuracy: number;
}

function evaluateVariationOnValidation(split: ChronologicalSplit, variation: ModelVariation): number {
  const trainCols = selectColumns(split.train.features, variation.featureIndices);
  const valCols = selectColumns(split.validation.features, variation.featureIndices);

  const standardization = computeStandardization(trainCols);
  const standardizedTrain = applyStandardization(trainCols, standardization);
  const standardizedVal = applyStandardization(valCols, standardization);

  const model = trainLogisticRegression(standardizedTrain, split.train.labels, variation.learningRate, variation.epochs);
  const predictions = standardizedVal.map((row) => (predict(row, model.weights, model.bias) >= 0.5 ? 1 : 0));

  return predictions.filter((p, i) => p === split.validation.labels[i]).length / split.validation.labels.length;
}

export interface PooledTrainingResult {
  poolRowCount: number;
  symbolsIncluded: string[];
  cutoff1: string;
  cutoff2: string;
  trainSize: number;
  validationSize: number;
  testSize: number;
  trainDateRange: [string, string];
  validationDateRange: [string, string];
  testDateRange: [string, string];
  variationResults: VariationResult[];
  chosenVariation: ModelVariation;
  finalModel: TrainedModel;
  testEvaluation: EvaluationResult;
  testBaselineAccuracy: number;
  testBaselineMajorityClass: 0 | 1;
}

export function trainPooledModel(histories: SymbolPriceHistory[], cutoff1: string, cutoff2: string): PooledTrainingResult {
  const dataset = buildPooledDataset(histories);
  const split = splitChronologically(dataset, cutoff1, cutoff2);

  // Every variation is scored ONLY against validation. Test is not
  // touched anywhere in this loop.
  const variationResults: VariationResult[] = MODEL_VARIATIONS.map((variation) => ({
    variation,
    validationAccuracy: evaluateVariationOnValidation(split, variation),
  }));

  const chosenVariation = variationResults.reduce((best, current) =>
    current.validationAccuracy > best.validationAccuracy ? current : best
  ).variation;

  // Re-running the chosen config here (rather than reusing the model
  // object from the loop above) is safe and reproducible, not a second
  // different attempt: nothing in this pipeline is random (weights start
  // at zero, gradient descent is full-batch, the split is a deterministic
  // date filter), so this produces the byte-identical model already
  // selected on validation.
  const trainCols = selectColumns(split.train.features, chosenVariation.featureIndices);
  const testCols = selectColumns(split.test.features, chosenVariation.featureIndices);
  const standardization = computeStandardization(trainCols);
  const standardizedTrain = applyStandardization(trainCols, standardization);
  const standardizedTest = applyStandardization(testCols, standardization);

  const finalModel = trainLogisticRegression(standardizedTrain, split.train.labels, chosenVariation.learningRate, chosenVariation.epochs);

  // The ONE and only time test is touched.
  const testPredictions = standardizedTest.map((row) => (predict(row, finalModel.weights, finalModel.bias) >= 0.5 ? 1 : 0));
  const testEvaluation = evaluateBinaryClassifier(split.test.labels, testPredictions);

  const trainUpCount = split.train.labels.filter((label) => label === 1).length;
  const testBaselineMajorityClass: 0 | 1 = trainUpCount >= split.train.labels.length - trainUpCount ? 1 : 0;
  const baselinePredictions = split.test.labels.map(() => testBaselineMajorityClass);
  const testBaselineAccuracy =
    baselinePredictions.filter((p, i) => p === split.test.labels[i]).length / split.test.labels.length;

  return {
    poolRowCount: dataset.features.length,
    symbolsIncluded: [...new Set(dataset.symbols)],
    cutoff1,
    cutoff2,
    trainSize: split.train.features.length,
    validationSize: split.validation.features.length,
    testSize: split.test.features.length,
    trainDateRange: dateRange(split.train.dates),
    validationDateRange: dateRange(split.validation.dates),
    testDateRange: dateRange(split.test.dates),
    variationResults,
    chosenVariation,
    finalModel,
    testEvaluation,
    testBaselineAccuracy,
    testBaselineMajorityClass,
  };
}
