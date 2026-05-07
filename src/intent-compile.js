/**
 * Intent-directed compilation: classify precision from C9 (Stakes) channel.
 *
 * C9 < 0.25 → INT8
 * C9 0.25–0.5 → INT16
 * C9 0.5–0.75 → INT32
 * C9 > 0.75 → DUAL
 */

import { IntentVector, Channels } from './index.js';

/**
 * Classify precision level from an IntentVector's Stakes channel.
 * @param {IntentVector} profile
 * @returns {'INT8'|'INT16'|'INT32'|'DUAL'}
 */
export function classifyPrecision(profile) {
  const stakes = profile.get(Channels.Stakes);
  if (stakes < 0.25) return 'INT8';
  if (stakes < 0.5) return 'INT16';
  if (stakes < 0.75) return 'INT32';
  return 'DUAL';
}

/**
 * Batch-classify a list of { lower, upper, value, profile } entries.
 * @param {Array<{lower: number, upper: number, value: number, profile: IntentVector}>} entries
 * @returns {{ results: Array, stats: object }}
 */
export function batchClassify(entries) {
  const counts = { INT8: 0, INT16: 0, INT32: 0, DUAL: 0 };
  const throughputMap = { INT8: 8.0, INT16: 4.0, INT32: 2.0, DUAL: 1.0 };
  const results = [];

  for (const { lower = 0.0, upper = 1.0, value = 0.5, profile } of entries) {
    const precision = classifyPrecision(profile);
    counts[precision]++;
    const passed = lower <= value && value <= upper;
    results.push({ precision, stakes: profile.get(Channels.Stakes), passed, mismatches: passed ? 0 : 1 });
  }

  const total = entries.length;
  const throughput = total === 0 ? 0 : results.reduce((sum, r) => sum + throughputMap[r.precision], 0) / total;

  return {
    results,
    stats: { counts, total, throughputProjection: throughput },
  };
}

/**
 * Differential verification with precision-appropriate epsilon.
 */
export function checkWithPrecision(value, lower, upper, precision) {
  const epsilons = { INT8: 1e-2, INT16: 1e-4, INT32: 1e-7, DUAL: 1e-12 };
  const eps = epsilons[precision];
  return (lower - eps) <= value && value <= (upper + eps);
}
