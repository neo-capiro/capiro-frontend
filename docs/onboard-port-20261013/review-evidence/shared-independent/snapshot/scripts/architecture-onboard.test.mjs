import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

const owner = 'apps/web/src/shared/capiro/onboard-pricing.server.ts';
const entry = 'apps/web/src/app/_onboard/OnboardEntry.tsx';
const projection = "import 'server-only'; import { PRICE_LOCK_COPY, PRICE_CHANGE_COPY } from '@capiro/shared'; export const copy = {lock: PRICE_LOCK_COPY, change: PRICE_CHANGE_COPY};";

test('only the explicit server pricing owner may receive the two public copy exports', () => {
  const result = inspectSources(new Map([
    [owner, projection],
    [entry, "import {copy} from '../../shared/capiro/onboard-pricing.server'; export const Entry=()=>copy;"],
  ]));
  assert.deepEqual(result.errors, []);
  for (const file of ['apps/web/src/features/onboard/Plan.tsx', 'apps/web/src/shared/capiro/other.ts', entry]) {
    assert.ok(inspectSources(new Map([[file, projection]])).errors.some(error => error.includes('non-public package')));
  }
});

test('server pricing admission refuses missing marker, client use, namespaces, require and broader symbols', () => {
  for (const source of [
    projection.replace("import 'server-only';", ''),
    `"use client"; ${projection}`,
    "import 'server-only'; import * as shared from '@capiro/shared';",
    "import 'server-only'; const shared = require('@capiro/shared');",
    "import 'server-only'; export * from '@capiro/shared';",
    "import 'server-only'; import {PRICE_LOCK_COPY, PRICE_CHANGE_COPY, MERI_TOOL_MANIFEST} from '@capiro/shared';",
    "import 'server-only'; import {PRICE_LOCK_COPY as a, PRICE_LOCK_COPY as b} from '@capiro/shared';",
  ]) assert.ok(inspectSources(new Map([[owner, source]]), new Set(['@capiro/shared'])).errors.some(error => error.includes('non-public package')), source);
});

test('the server pricing projection cannot be imported directly by feature or client foundations', () => {
  for (const file of ['apps/web/src/features/onboard/Plan.tsx', 'apps/web/src/shared/capiro/client.ts', 'apps/web/src/app/_onboard/OnboardHost.tsx']) {
    const result = inspectSources(new Map([[owner, projection], [file, "import '@/shared/capiro/onboard-pricing.server';"]]));
    assert.ok(result.errors.some(error => error.includes('allocated only to the Onboard server entry')));
  }
});
