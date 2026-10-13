// Regenerate only owned source metadata; never builds/imports a UI component.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HERE, computePins } from './sources.mjs';

export function generatePins({ check = false, packageRoot = HERE } = {}) {
  const path = resolve(packageRoot, 'promotion-pins.json');
  const raw = Buffer.from(JSON.stringify(computePins(packageRoot), null, 2) + '\n');
  if (check) assert.deepEqual(readFileSync(path), raw, 'generated promotion metadata drift');
  else writeFileSync(path, raw);
  return { check, bytes: raw.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--check'), 'usage: node generate-pins.mjs [--check]');
  console.log(JSON.stringify(generatePins({ check: process.argv.length === 3 })));
}
