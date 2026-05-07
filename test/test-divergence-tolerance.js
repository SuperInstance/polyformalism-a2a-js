import { DivergenceAwareTolerance, DriftTrend, PrecisionClass } from '../src/divergence-tolerance.js';
import assert from 'node:assert/strict';

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('DivergenceAwareTolerance Tests');

test('no drift = no change', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
  const tol = dat.effectiveTolerances();
  assert.deepStrictEqual(tol, [0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
});

test('increasing drift tightens', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
  dat.adjust(8, 0.7, DriftTrend.Increasing);
  dat.adjust(8, 0.8, DriftTrend.Increasing);
  assert.ok(dat.effectiveTolerance(8) < 0.5, 'Should tighten below base');
});

test('decay restores tolerance', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5], { decayRate: 0.5 });
  dat.adjust(2, 0.8, DriftTrend.Increasing);
  const tightened = dat.effectiveTolerance(2);
  for (let i = 0; i < 10; i++) dat.decay();
  const after = dat.effectiveTolerance(2);
  assert.ok(after > tightened, 'Decay should restore tolerance');
  assert.ok(Math.abs(after - 0.5) < 0.01, 'Should be near base after heavy decay');
});

test('precision class selection', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
  assert.strictEqual(dat.precisionClasses()[8], PrecisionClass.INT8);
  dat.adjust(8, 0.9, DriftTrend.Increasing);
  dat.adjust(8, 0.9, DriftTrend.Increasing);
  assert.strictEqual(dat.precisionClasses()[8], PrecisionClass.DUAL);
});

test('max tightening respected', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5], { maxTightening: 0.5 });
  for (let i = 0; i < 100; i++) dat.adjust(0, 1.0, DriftTrend.Increasing);
  const tol = dat.effectiveTolerance(0);
  assert.ok(tol >= 0.25, `Should not tighten past max (got ${tol})`);
});

test('multiple channels independent', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
  dat.adjust(8, 0.8, DriftTrend.Increasing);
  assert.strictEqual(dat.precisionClasses()[0], PrecisionClass.INT8);
  assert.strictEqual(dat.precisionClasses()[8], PrecisionClass.DUAL);
});

test('checkpoint/restore roundtrip', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
  dat.adjust(3, 0.6, DriftTrend.Stable);
  dat.adjust(7, 0.4, DriftTrend.Decreasing);
  const cp = dat.checkpoint();
  const restored = DivergenceAwareTolerance.restore(cp);
  assert.deepStrictEqual(restored.effectiveTolerances(), dat.effectiveTolerances());
  assert.strictEqual(restored.decayRate, dat.decayRate);
});

test('invalid channel index ignored', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
  dat.adjust(-1, 0.5, DriftTrend.Increasing);
  dat.adjust(9, 0.5, DriftTrend.Increasing);
  assert.deepStrictEqual(dat.effectiveTolerances(), [0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
});

test('reset clears all', () => {
  const dat = new DivergenceAwareTolerance([0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
  dat.adjust(0, 0.9, DriftTrend.Increasing);
  dat.adjust(4, 0.9, DriftTrend.Increasing);
  dat.reset();
  assert.deepStrictEqual(dat.effectiveTolerances(), [0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5]);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
