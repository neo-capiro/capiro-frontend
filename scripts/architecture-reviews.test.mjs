import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { inspectSources } from './architecture.mjs';
import { reviewSizeSignals } from './architecture-reviews.mjs';

const name = 'apps/web/src/features/modules/Reviewed.tsx';
const source = `export function reviewed(){\n${'void 0;\n'.repeat(401)}}`;
const files = new Map([[name, source]]);
const inspection = inspectSources(files);
const record = {
  path: name, sha256: createHash('sha256').update(source).digest('hex'),
  reviewer: 'Test reviewer', reviewedAt: '2026-10-12',
  rationale: 'A specific design review records the cohesive responsibility and its verification.',
  evidence: 'docs/review.md#fixture', signals: inspection.signals,
};
test('an exact reviewed source retains all signals and records their disposition', () => {
  const result = reviewSizeSignals(files, inspection.signals, [record], () => true);
  assert.deepEqual(result.reviewed, inspection.signals);
  assert.deepEqual(result.pending, []);
  assert.equal(inspection.signals.length, 2);
});
test('changed bytes, new signals, absent evidence and incomplete rationale require another review', () => {
  for (const next of [{...record, sha256: '0'.repeat(64)}, {...record, signals: []}, {...record, rationale: ''}, {...record, reviewer: ''}]) {
    assert.deepEqual(reviewSizeSignals(files, inspection.signals, [next], () => true).pending, inspection.signals);
  }
  assert.deepEqual(reviewSizeSignals(new Map([[name, source + '\n']]), inspection.signals, [record], () => true).pending, inspection.signals);
  assert.deepEqual(reviewSizeSignals(files, inspection.signals, [record], () => false).pending, inspection.signals);
});
test('reviews cannot waive boundary failures and duplicate records fail', () => {
  const bad = inspectSources(new Map([[name, source + "\nimport 'meri-greenfield/private';"]]));
  reviewSizeSignals(files, bad.signals, [record], () => true);
  assert.ok(bad.errors.some(error => error.includes('restricted runtime')));
  assert.ok(reviewSizeSignals(files, inspection.signals, [record, record], () => true).errors.length);
  assert.ok(reviewSizeSignals(files, inspection.signals, {}, () => true).errors.length);
});
