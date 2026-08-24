// Orchestrates: build the labeled dataset, split it chronologically,
// standardize using training-set-only statistics, train, and evaluate
// against a naive majority-class baseline. No model tuning happens here
// based on the results this produces - see the verification script for
// this task, which reports whatever numbers this run actually produces.
import { buildLabeledDataset } from "./predictionDataset";
import { computeStandardization, applyStandardization, trainLogisticRegression, predict, TrainedModel } from "./logisticRegression";

const DEFAULT_LEARNING_RATE = 0.1;
const DEFAULT_EPOCHS = 500;
const TRAIN_FRACTION = 0.8;

export interface ConfusionMatrix {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
}

export interface EvaluationResult {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: ConfusionMatrix;
}

export interface TrainModelResult {
  trainSize: number;
  testSize: number;
  trainDateRange: [string, string];
  testDateRange: [string, string];
  model: TrainedModel;
  evaluation: EvaluationResult;
  baselineAccuracy: number;
  baselineMajorityClass: 0 | 1;
}

export function trainModel(
  prices: number[],
  dates: string[],
  learningRate: number = DEFAULT_LEARNING_RATE,
  epochs: number = DEFAULT_EPOCHS
): TrainModelResult {
  const dataset = buildLabeledDataset(prices, dates);

  // Chronological split, not random - train = earliest 80% of dates,
  // test = latest 20%. This is time-series data: a random shuffle would
  // scatter test-set days throughout the training set (e.g. a test row
  // from March sitting next to training rows from June), so the model
  // would train on days that come chronologically AFTER some of the days
  // it's supposedly being tested on - a form of lookahead leakage at the
  // split level, distinct from (and in addition to) the leakage already
  // ruled out inside buildLabeledDataset itself. A next-day model is only
  // realistically usable predicting forward from what it's already seen,
  // so the split has to mirror that: everything the model trains on must
  // come strictly before everything it's evaluated on.
  const splitIndex = Math.floor(dataset.features.length * TRAIN_FRACTION);

  const trainFeatures = dataset.features.slice(0, splitIndex);
  const trainLabels = dataset.labels.slice(0, splitIndex);
  const trainDates = dataset.dates.slice(0, splitIndex);

  const testFeatures = dataset.features.slice(splitIndex);
  const testLabels = dataset.labels.slice(splitIndex);
  const testDates = dataset.dates.slice(splitIndex);

  // Standardization statistics are fit on the TRAINING set only, then
  // reused unchanged to standardize the test set. Fitting them on the
  // full dataset (train + test) would leak test-set distribution
  // information - its mean, its spread - into every feature the model
  // is trained on. No test LABEL leaks either way, but the model would
  // implicitly benefit from knowing the test set's statistics before it's
  // ever evaluated, which defeats the point of holding it out.
  const standardization = computeStandardization(trainFeatures);
  const standardizedTrainFeatures = applyStandardization(trainFeatures, standardization);
  const standardizedTestFeatures = applyStandardization(testFeatures, standardization);

  const model = trainLogisticRegression(standardizedTrainFeatures, trainLabels, learningRate, epochs);

  const testPredictions = standardizedTestFeatures.map((row) =>
    predict(row, model.weights, model.bias) >= 0.5 ? 1 : 0
  );
  const evaluation = evaluateBinaryClassifier(testLabels, testPredictions);

  // Baseline: always predict the majority class OF THE TRAINING SET (the
  // only data the model itself had access to), measured against the same
  // held-out test set as the model, so the comparison is apples to apples.
  const trainUpCount = trainLabels.filter((label) => label === 1).length;
  const baselineMajorityClass: 0 | 1 = trainUpCount >= trainLabels.length - trainUpCount ? 1 : 0;
  const baselinePredictions = testLabels.map(() => baselineMajorityClass);
  const baselineAccuracy =
    baselinePredictions.filter((prediction, i) => prediction === testLabels[i]).length / testLabels.length;

  return {
    trainSize: trainFeatures.length,
    testSize: testFeatures.length,
    trainDateRange: [trainDates[0], trainDates[trainDates.length - 1]],
    testDateRange: [testDates[0], testDates[testDates.length - 1]],
    model,
    evaluation,
    baselineAccuracy,
    baselineMajorityClass,
  };
}

export function evaluateBinaryClassifier(actual: number[], predicted: number[]): EvaluationResult {
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 1 && predicted[i] === 1) truePositive++;
    else if (actual[i] === 0 && predicted[i] === 0) trueNegative++;
    else if (actual[i] === 0 && predicted[i] === 1) falsePositive++;
    else falseNegative++;
  }

  const accuracy = (truePositive + trueNegative) / actual.length;
  const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
  const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    accuracy,
    precision,
    recall,
    f1,
    confusionMatrix: { truePositive, trueNegative, falsePositive, falseNegative },
  };
}
