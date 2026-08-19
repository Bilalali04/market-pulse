// Hand-implemented logistic regression (batch gradient descent) - no ML
// library. For a dataset this size (hundreds to low thousands of rows,
// 5 features), a from-scratch implementation is small enough to read in
// full and verify by hand, which is more defensible here than a
// black-box library call.

export interface StandardizationParams {
  means: number[];
  stds: number[];
}

// Computes per-feature mean and standard deviation for z-score
// standardization. CRITICAL: this must only ever be called on the
// TRAINING set - see trainModel.ts's comment at the call site for why
// (fitting these statistics on data that includes the test set leaks
// test-set distribution information into every feature the model
// trains on, even though no test LABEL is ever touched).
export function computeStandardization(features: number[][]): StandardizationParams {
  const n = features.length;
  const numFeatures = features[0].length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);

  for (const row of features) {
    for (let j = 0; j < numFeatures; j++) {
      means[j] += row[j];
    }
  }
  for (let j = 0; j < numFeatures; j++) {
    means[j] /= n;
  }

  for (const row of features) {
    for (let j = 0; j < numFeatures; j++) {
      const diff = row[j] - means[j];
      stds[j] += diff * diff;
    }
  }
  for (let j = 0; j < numFeatures; j++) {
    stds[j] = Math.sqrt(stds[j] / n);
  }

  return { means, stds };
}

// Applies previously-computed standardization params to any feature
// matrix. The params must come from computeStandardization(trainingSet)
// - never recomputed on whatever's being standardized here, or test
// statistics would leak into the values the model sees.
export function applyStandardization(features: number[][], params: StandardizationParams): number[][] {
  return features.map((row) =>
    row.map((value, j) => {
      const std = params.stds[j];
      // A zero-variance training feature would divide by zero; treat it
      // as already-centered (it's constant across training, so it
      // carries no discriminating information regardless).
      return std === 0 ? 0 : (value - params.means[j]) / std;
    })
  );
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export interface TrainedModel {
  weights: number[];
  bias: number;
}

// Batch gradient descent on binary cross-entropy loss. The gradient of
// cross-entropy w.r.t. a logistic model's weights simplifies to
// (prediction - label) * feature - the "error" term below - which is the
// standard, well-known closed form (see e.g. any intro ML derivation of
// logistic regression's gradient); this isn't a from-scratch derivation,
// just its direct implementation.
export function trainLogisticRegression(
  features: number[][],
  labels: number[],
  learningRate: number,
  epochs: number
): TrainedModel {
  const n = features.length;
  const numFeatures = features[0].length;
  const weights = new Array(numFeatures).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const weightGradients = new Array(numFeatures).fill(0);
    let biasGradient = 0;

    for (let i = 0; i < n; i++) {
      const prediction = sigmoid(dot(features[i], weights) + bias);
      const error = prediction - labels[i];

      for (let j = 0; j < numFeatures; j++) {
        weightGradients[j] += error * features[i][j];
      }
      biasGradient += error;
    }

    for (let j = 0; j < numFeatures; j++) {
      weights[j] -= (learningRate * weightGradients[j]) / n;
    }
    bias -= (learningRate * biasGradient) / n;
  }

  return { weights, bias };
}

export function predict(features: number[], weights: number[], bias: number): number {
  return sigmoid(dot(features, weights) + bias);
}
