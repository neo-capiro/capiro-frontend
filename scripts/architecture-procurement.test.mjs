import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectDependencies, publicExports } from './architecture/dependencies.mjs';
import { scanModule } from './architecture/scan.mjs';

const owner = 'apps/web/src/features/modules/intelligence/research/procurement-selection.ts';
const errors = (file, source) => inspectDependencies(file, scanModule(file, source), new Map([[file, source]]), publicExports).errors;
test('only allocated procurement readers can import their canonical public DTO types', () => {
  assert.deepEqual(errors(owner, "import type { ProcurementMoneyFlow, ProcurementScopeRequest } from '@capiro/shared';"), []);
  for (const source of [
    "import { ProcurementMoneyFlow } from '@capiro/shared';",
    "import type { ProcurementMoneyFlow, unrelatedRuntime } from '@capiro/shared';",
    "import * as shared from '@capiro/shared';",
    "export * from '@capiro/shared';",
    "import type { ProcurementMoneyFlow } from '@capiro/shared/dist/defense-procurement';",
  ]) assert.ok(errors(owner, source).length, source);
  assert.ok(errors('apps/web/src/features/modules/hub/HubCardMetrics.tsx', "import type { ProcurementMoneyFlow } from '@capiro/shared';").length);
});
