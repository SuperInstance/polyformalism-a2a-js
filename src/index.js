/**
 * @superinstance/polyformalism-a2a
 * 
 * 9-channel polyglot communication framework for multi-agent alignment.
 * 
 * The 9 channels are Pythagorean anchor points on a continuous intent curve.
 * The curve between any finite set of values is irreducible.
 * 
 * Channels:
 *   C1 Boundary   — What are we talking about?
 *   C2 Pattern    — How do pieces connect?
 *   C3 Process    — What's happening over time?
 *   C4 Knowledge  — How sure am I?
 *   C5 Social     — Who cares and why?
 *   C6 Deep Structure — What's really being said?
 *   C7 Instrument — What tools are available?
 *   C8 Paradigm   — What model of thought?
 *   C9 Stakes     — What matters vs what doesn't?
 */

export const Channels = Object.freeze({
  Boundary: 0,
  Pattern: 1,
  Process: 2,
  Knowledge: 3,
  Social: 4,
  DeepStructure: 5,
  Instrument: 6,
  Paradigm: 7,
  Stakes: 8,
});

export const CHANNEL_NAMES = Object.freeze([
  'Boundary', 'Pattern', 'Process', 'Knowledge',
  'Social', 'DeepStructure', 'Instrument', 'Paradigm', 'Stakes'
]);

export const CHANNEL_QUESTIONS = Object.freeze([
  'What are we talking about?',
  'How do pieces connect?',
  "What's happening over time?",
  'How sure am I?',
  'Who cares and why?',
  "What's really being said?",
  'What tools are available?',
  'What model of thought?',
  "What matters vs what doesn't?",
]);

/**
 * A 9-dimensional intent vector.
 * Each dimension is [0, 1] representing salience of that channel.
 */
export class IntentVector {
  constructor(values = new Float64Array(9), tolerance = null) {
    this.values = values instanceof Float64Array ? values : new Float64Array(values);
    this.tolerance = tolerance || new Float64Array(9).fill(0.5);
  }

  static zero() {
    return new IntentVector();
  }

  set(channel, value) {
    this.values[channel] = Math.max(0, Math.min(1, value));
    return this;
  }

  setTolerance(channel, tol) {
    this.tolerance[channel] = Math.max(0.001, tol);
    return this;
  }

  get(channel) {
    return this.values[channel];
  }

  cosineSimilarity(other) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < 9; i++) {
      dot += this.values[i] * other.values[i];
      normA += this.values[i] ** 2;
      normB += other.values[i] ** 2;
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    return (normA === 0 || normB === 0) ? 0 : dot / (normA * normB);
  }

  euclideanDistance(other) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += (this.values[i] - other.values[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  /** Draft: how deep this intent's requirements are. Higher = more context needed. */
  draft() {
    let total = 0;
    for (let i = 0; i < 9; i++) {
      total += this.values[i] / Math.max(0.001, this.tolerance[i]);
    }
    return Math.min(total / 9, 2.0) / 10;
  }

  dominantChannel() {
    let maxIdx = 0;
    for (let i = 1; i < 9; i++) {
      if (this.values[i] > this.values[maxIdx]) maxIdx = i;
    }
    return maxIdx;
  }

  toJSON() {
    return {
      values: Array.from(this.values),
      tolerance: Array.from(this.tolerance),
    };
  }

  static fromJSON(obj) {
    return new IntentVector(obj.values, obj.tolerance ? new Float64Array(obj.tolerance) : null);
  }
}

/**
 * Check alignment between sender and receiver intent vectors.
 */
export function checkAlignment(sender, receiver) {
  const cosine = sender.cosineSimilarity(receiver);
  const distance = sender.euclideanDistance(receiver);

  const warnings = [];
  for (let i = 0; i < 9; i++) {
    const dist = Math.abs(sender.values[i] - receiver.values[i]);
    if (dist > sender.tolerance[i] + 0.1) {
      warnings.push(
        `C${i + 1} (${CHANNEL_NAMES[i]}): distance ${dist.toFixed(3)} exceeds tolerance ${sender.tolerance[i].toFixed(3)}`
      );
    }
  }

  const receiverCapacity = 1 - receiver.draft();
  const draftMargin = receiverCapacity - sender.draft();
  const isSafe = warnings.length === 0 && draftMargin > 0;

  return { cosineSimilarity: cosine, euclideanDistance: distance, draftMargin, isSafe, warnings };
}

/**
 * Hydraulic fitting selection: right-size tooling to pressure.
 */
export const Fitting = Object.freeze({
  HoseClamp: { name: 'HoseClamp', pressure: '50 PSI', tolerance: 0.8, minChannels: 2 },
  IndustrialFitting: { name: 'IndustrialFitting', pressure: '300 PSI', tolerance: 0.5, minChannels: 4 },
  JicFitting: { name: 'JicFitting', pressure: '2500 PSI', tolerance: 0.2, minChannels: 7 },
  DeepSeaSeal: { name: 'DeepSeaSeal', pressure: '10000 PSI', tolerance: 0.05, minChannels: 9 },
});

export function selectFitting(stakes) {
  if (stakes < 0.25) return Fitting.HoseClamp;
  if (stakes < 0.5) return Fitting.IndustrialFitting;
  if (stakes < 0.75) return Fitting.JicFitting;
  return Fitting.DeepSeaSeal;
}

/**
 * Check draft compatibility.
 * speedFactor: 0 = careful, 0.5 = rushed, 1.0 = emergency.
 */
export function checkDraft(sender, receiverCapacity, speedFactor = 0) {
  const base = sender.draft();
  const effective = base * (1 + speedFactor);
  const margin = receiverCapacity - effective;
  return { baseDraft: base, effectiveDraft: effective, receiverCapacity, margin, isSafe: margin > 0 };
}

// Re-export LLM encoder
export { LLMEncoder } from './llm-encoder.js';
// Re-export DivergenceAwareTolerance
export { DivergenceAwareTolerance, DriftTrend, PrecisionClass } from './divergence-tolerance.js';

/**
 * Tolerance stack: ε_total = √(ε₁² + ε₂² + ... + ε₉²)
 */
export function toleranceStack(profile) {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += profile.tolerance[i] ** 2;
  }
  return Math.sqrt(sum);
}
