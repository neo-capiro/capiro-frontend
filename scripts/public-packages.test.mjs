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
