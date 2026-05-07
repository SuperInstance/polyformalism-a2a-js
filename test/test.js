import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Channels, CHANNEL_NAMES, CHANNEL_QUESTIONS,
  IntentVector, checkAlignment,
  selectFitting, Fitting, checkDraft, toleranceStack
} from '../src/index.js';

describe('Channels', () => {
  it('has 9 channels', () => {
    assert.equal(CHANNEL_NAMES.length, 9);
    assert.equal(CHANNEL_QUESTIONS.length, 9);
  });

  it('has correct names', () => {
    assert.equal(CHANNEL_NAMES[Channels.Stakes], 'Stakes');
    assert.equal(CHANNEL_NAMES[Channels.Boundary], 'Boundary');
  });
});

describe('IntentVector', () => {
  it('creates zero vector', () => {
    const v = IntentVector.zero();
    for (let i = 0; i < 9; i++) {
      assert.equal(v.get(i), 0);
    }
  });

  it('sets and gets values', () => {
    const v = IntentVector.zero();
    v.set(Channels.Stakes, 0.9);
    assert.equal(v.get(Channels.Stakes), 0.9);
  });

  it('clamps values to [0, 1]', () => {
    const v = IntentVector.zero();
    v.set(Channels.Stakes, 1.5);
    assert.equal(v.get(Channels.Stakes), 1);
    v.set(Channels.Stakes, -0.5);
    assert.equal(v.get(Channels.Stakes), 0);
  });

  it('computes cosine similarity', () => {
    const a = IntentVector.zero().set(Channels.Stakes, 0.9).set(Channels.Process, 0.8);
    const b = IntentVector.zero().set(Channels.Stakes, 0.85).set(Channels.Process, 0.75);
    assert.ok(a.cosineSimilarity(b) > 0.99);
  });

  it('computes euclidean distance', () => {
    const a = IntentVector.zero();
    const b = IntentVector.zero().set(Channels.Stakes, 1);
    assert.ok(Math.abs(a.euclideanDistance(b) - 1) < 0.001);
  });

  it('finds dominant channel', () => {
    const v = IntentVector.zero().set(Channels.Social, 0.95);
    assert.equal(v.dominantChannel(), Channels.Social);
  });

  it('serializes to JSON and back', () => {
    const v = IntentVector.zero().set(Channels.Stakes, 0.8);
    const json = v.toJSON();
    const restored = IntentVector.fromJSON(json);
    assert.equal(restored.get(Channels.Stakes), 0.8);
  });
});

describe('Alignment', () => {
  it('detects safe alignment', () => {
    const sender = IntentVector.zero().set(Channels.Stakes, 0.9);
    sender.setTolerance(Channels.Stakes, 0.5);
    const receiver = IntentVector.zero().set(Channels.Stakes, 0.8);
    receiver.setTolerance(Channels.Stakes, 0.5);
    const report = checkAlignment(sender, receiver);
    assert.ok(report.cosineSimilarity > 0.99);
    assert.ok(report.isSafe);
  });

  it('detects misalignment', () => {
    const sender = IntentVector.zero().set(Channels.Stakes, 0.95);
    sender.setTolerance(Channels.Stakes, 0.05);
    const receiver = IntentVector.zero().set(Channels.Stakes, 0.1);
    receiver.setTolerance(Channels.Stakes, 0.1);
    const report = checkAlignment(sender, receiver);
    assert.ok(report.warnings.length > 0);
  });
});

describe('Fitting', () => {
  it('selects correct fittings', () => {
    assert.equal(selectFitting(0.1).name, 'HoseClamp');
    assert.equal(selectFitting(0.4).name, 'IndustrialFitting');
    assert.equal(selectFitting(0.6).name, 'JicFitting');
    assert.equal(selectFitting(0.9).name, 'DeepSeaSeal');
  });
});

describe('Draft', () => {
  it('detects safe draft', () => {
    const sender = IntentVector.zero().set(Channels.Stakes, 0.3);
    const report = checkDraft(sender, 0.8);
    assert.ok(report.isSafe);
  });

  it('detects grounded draft', () => {
    const sender = IntentVector.zero().set(Channels.Stakes, 0.95);
    sender.setTolerance(Channels.Stakes, 0.05);
    const report = checkDraft(sender, 0.1, 1.0);
    assert.ok(!report.isSafe);
  });
});

describe('Tolerance Stack', () => {
  it('computes correct total', () => {
    const profile = IntentVector.zero();
    const total = toleranceStack(profile);
    // 9 * 0.5^2 = 2.25, sqrt(2.25) = 1.5
    assert.ok(Math.abs(total - 1.5) < 0.01);
  });
});
