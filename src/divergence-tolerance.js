/**
 * DivergenceAwareTolerance — Runtime→Compile Feedback Loop
 * 
 * JS port of flux-lucid's divergence_tolerance module.
 * Connects runtime drift detection (zeroclaw) to compile-time
 * constraint tolerance (IntentVector).
 * 
 * When runtime drift increases on a channel, tolerance tightens:
 * - High drift → DUAL precision (INT32 + INT8)
 * - Low drift → INT8 only
 * - Adjustments decay when drift resolves
 */

/**
 * Drift trend direction
 * @readonly
 * @enum {string}
 */
export const DriftTrend = Object.freeze({
  Increasing: 'increasing',
  Stable: 'stable',
  Decreasing: 'decreasing',
});

/**
 * Precision class for constraint checking
 * @readonly
 * @enum {string}
 */
export const PrecisionClass = Object.freeze({
  INT8: 'int8',
  DUAL: 'dual',
});

/**
 * Adjusts IntentVector tolerances based on runtime drift reports.
 */
export class DivergenceAwareTolerance {
  /**
   * @param {number[]} baseTolerance - Base tolerances from IntentVector (9 values)
   * @param {object} [options]
   * @param {number} [options.decayRate=0.9] - How fast adjustments decay (0-0.99)
   * @param {number} [options.maxTightening=0.5] - Max tightening factor (0-0.9)
   */
  constructor(baseTolerance, { decayRate = 0.9, maxTightening = 0.5 } = {}) {
    if (baseTolerance.length !== 9) {
      throw new Error('Expected 9 tolerance values');
    }
    this.baseTolerance = [...baseTolerance];
    this.driftAdjustment = new Float64Array(9);
    this.decayRate = Math.min(Math.max(decayRate, 0), 0.99);
    this.maxTightening = Math.min(Math.max(maxTightening, 0), 0.9);
    this.observationCount = new Uint32Array(9);
  }

  /**
   * Adjust tolerance for a channel based on drift report.
   * More drift + increasing trend → more aggressive tightening.
   * @param {number} channelIdx - Channel index (0-8)
   * @param {number} driftScore - Drift score (0-1)
   * @param {string} trend - DriftTrend value
   */
  adjust(channelIdx, driftScore, trend) {
    if (channelIdx < 0 || channelIdx > 8) return;
    const tightening = trend === DriftTrend.Increasing
      ? driftScore * 0.3
      : trend === DriftTrend.Stable
        ? driftScore * 0.1
        : driftScore * 0.02;
    this.driftAdjustment[channelIdx] = Math.min(
      this.driftAdjustment[channelIdx] + tightening,
      this.maxTightening
    );
    this.observationCount[channelIdx]++;
  }

  /**
   * Get effective tolerance for a channel.
   * Returns baseTolerance * (1 - driftAdjustment).
   * @param {number} channelIdx
   * @returns {number}
   */
  effectiveTolerance(channelIdx) {
    if (channelIdx < 0 || channelIdx > 8) return this.baseTolerance[0];
    return this.baseTolerance[channelIdx] * (1 - this.driftAdjustment[channelIdx]);
  }

  /**
   * Get all effective tolerances.
   * @returns {number[]}
   */
  effectiveTolerances() {
    return Array.from({ length: 9 }, (_, i) => this.effectiveTolerance(i));
  }

  /**
   * Decay all adjustments (call periodically, e.g. every 5 minutes).
   */
  decay() {
    for (let i = 0; i < 9; i++) {
      this.driftAdjustment[i] *= this.decayRate;
    }
  }

  /**
   * Reset all adjustments to zero.
   */
  reset() {
    this.driftAdjustment.fill(0);
    this.observationCount.fill(0);
  }

  /**
   * Which precision class to use for each channel.
   * DUAL if tightened > 10%, INT8 otherwise.
   * @returns {string[]}
   */
  precisionClasses() {
    return Array.from({ length: 9 }, (_, i) =>
      this.driftAdjustment[i] > 0.1 ? PrecisionClass.DUAL : PrecisionClass.INT8
    );
  }

  /**
   * Serialize state for checkpoint/restore.
   * @returns {object}
   */
  checkpoint() {
    return {
      baseTolerance: [...this.baseTolerance],
      driftAdjustment: Array.from(this.driftAdjustment),
      decayRate: this.decayRate,
      maxTightening: this.maxTightening,
      observationCount: Array.from(this.observationCount),
    };
  }

  /**
   * Restore from checkpoint.
   * @param {object} data
   * @returns {DivergenceAwareTolerance}
   */
  static restore(data) {
    const dat = new DivergenceAwareTolerance(data.baseTolerance, {
      decayRate: data.decayRate,
      maxTightening: data.maxTightening,
    });
    for (let i = 0; i < 9; i++) {
      dat.driftAdjustment[i] = data.driftAdjustment[i];
      dat.observationCount[i] = data.observationCount[i];
    }
    return dat;
  }
}
