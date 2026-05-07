import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IntentVector, Channels } from '../src/index.js';
import { classifyPrecision, batchClassify, checkWithPrecision } from '../src/intent-compile.js';

function profileWithStakes(stakes) {
  const v = new IntentVector();
  v.set(Channels.Stakes, stakes);
  return v;
}

describe('classifyPrecision', () => {
  it('returns INT8 for low stakes', () => {
    assert.equal(classifyPrecision(profileWithStakes(0.1)), 'INT8');
  });
  it('returns INT16 for mid-low stakes', () => {
    assert.equal(classifyPrecision(profileWithStakes(0.35)), 'INT16');
  });
  it('returns INT32 for mid-high stakes', () => {
    assert.equal(classifyPrecision(profileWithStakes(0.6)), 'INT32');
  });
  it('returns DUAL for high stakes', () => {
    assert.equal(classifyPrecision(profileWithStakes(0.9)), 'DUAL');
  });
});

describe('batchClassify', () => {
  it('handles AV mix', () => {
    const entries = [
      { lower: 0.0, upper: 1.0, value: 0.5, profile: profileWithStakes(0.1) },
      { lower: 0.0, upper: 1.0, value: 0.5, profile: profileWithStakes(0.35) },
      { lower: 0.0, upper: 1.0, value: 0.5, profile: profileWithStakes(0.6) },
      { lower: 0.0, upper: 1.0, value: 0.5, profile: profileWithStakes(0.9) },
      { lower: 0.2, upper: 0.8, value: 0.5, profile: profileWithStakes(0.15) },
      { lower: 0.0, upper: 0.3, value: 0.5, profile: profileWithStakes(0.8) },
    ];
    const { results, stats } = batchClassify(entries);
    assert.equal(stats.total, 6);
    assert.equal(stats.counts.INT8, 2);
    assert.equal(stats.counts.INT16, 1);
    assert.equal(stats.counts.INT32, 1);
    assert.equal(stats.counts.DUAL, 2);
    assert.ok(stats.throughputProjection > 0);
    assert.equal(results.at(-1).mismatches, 1);
    assert.equal(results.at(-1).passed, false);
  });
});

describe('checkWithPrecision', () => {
  it('passes for in-range values at all precisions', () => {
    for (const p of ['INT8', 'INT16', 'INT32', 'DUAL']) {
      assert.ok(checkWithPrecision(0.5, 0.0, 1.0, p));
    }
  });
  it('passes boundary values', () => {
    assert.ok(checkWithPrecision(0.0, 0.0, 1.0, 'INT8'));
    assert.ok(checkWithPrecision(1.0, 0.0, 1.0, 'INT8'));
  });
  it('rejects out-of-range values', () => {
    assert.equal(checkWithPrecision(1.5, 0.0, 1.0, 'INT8'), false);
    assert.equal(checkWithPrecision(-0.1, 0.0, 1.0, 'DUAL'), false);
  });
});
