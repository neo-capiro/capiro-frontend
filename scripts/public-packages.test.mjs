import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPackageInputs } from './public-packages.mjs';

const record = { file: 'fixture-0.1.0.tgz', sourceCommit: 'a'.repeat(40), bytes: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' };
const manifest = value => ({ schema: 'capiro-public-package-inputs/1', artifacts: [value] });

test('package binding detects byte corruption independently of filename/version', () => {
  assert.equal(verifyPackageInputs(manifest(record), () => Buffer.from('abc')).length, 1);
  assert.throws(() => verifyPackageInputs(manifest(record), () => Buffer.from('abd')), /Public package drift/);
});

test('untrusted artifact paths and malformed bindings fail before file reads', () => {
  let reads = 0;
  for (const value of [{ ...record, file: '../fixture.tgz' }, { ...record, bytes: -1 }, { ...record, sourceCommit: 'main' }]) {
    assert.throws(() => verifyPackageInputs(manifest(value), () => { reads += 1; return Buffer.from('abc'); }), /Invalid/);
  }
  assert.equal(reads, 0);
});

test('file, commit and hash reject coercible nonstrings before any artifact read', () => {
  let reads = 0, coercions = 0;
  for (const key of ['file', 'sourceCommit', 'sha256']) {
    for (const value of [[record[key]], new String(record[key]), { toString() { coercions++; return record[key]; } }, null, undefined, 1, true]) {
      assert.throws(() => verifyPackageInputs(manifest({ ...record, [key]: value }), () => { reads++; return Buffer.from('abc'); }), /Invalid/);
    }
  }
  assert.equal(reads, 0); assert.equal(coercions, 0);
});

test('all record shapes are validated before reads, including a malformed later binding', () => {
  let reads = 0, getters = 0;
  const read = () => { reads++; return Buffer.from('abc'); };
  for (const invalid of [null, [], new (class Binding { constructor() { Object.assign(this, record); } })(), Object.create(record), { ...record, get sourceCommit() { getters++; return record.sourceCommit; } }]) {
    assert.throws(() => verifyPackageInputs(manifest(invalid), read), /Invalid/);
  }
  const malformedLater = { schema: 'capiro-public-package-inputs/1', artifacts: [record, { ...record, file: 'second.tgz', sourceCommit: [record.sourceCommit] }] };
  assert.throws(() => verifyPackageInputs(malformedLater, read), /Invalid/);
  assert.throws(() => verifyPackageInputs({ schema: 'capiro-public-package-inputs/1', artifacts: [record, record] }, read), /duplicate/);
  assert.throws(() => verifyPackageInputs(Object.assign([], manifest(record)), read), /Invalid/);
  assert.equal(reads, 0); assert.equal(getters, 0);
});

test('validated primitive snapshots survive reader mutation of a later input record', () => {
  const first = { ...record }, second = { ...record, file: 'second.tgz' };
  const names = [];
  const result = verifyPackageInputs({ schema: 'capiro-public-package-inputs/1', artifacts: [first, second] }, name => {
    names.push(name); second.file = '../changed.tgz'; second.sourceCommit = [record.sourceCommit]; return Buffer.from('abc');
  });
  assert.deepEqual(names, ['fixture-0.1.0.tgz', 'second.tgz']);
  assert.equal(result[1].sourceCommit, record.sourceCommit);
  assert.equal(verifyPackageInputs(manifest(Object.assign(Object.create(null), record)), () => Buffer.from('abc')).length, 1);
});
