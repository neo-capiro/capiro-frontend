import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';
import { scanModule } from './architecture/scan.mjs';

const root = 'apps/web/src/';
const owner = `${root}features/portfolio/prospects/brief/client-copy/`;
const target = `${root}features/modules/workspace/prospect-actions-public.ts`;
const seam = '@/features/modules/workspace/prospect-actions-public';
const callers = new Map([
  ['authority.ts', ['verifyProspectWriter', 'ProspectWriter']],
  ['command.ts', ['prospectIntentScope', 'ProspectWriter']],
  ['ClientBriefCopy.tsx', ['ProspectWriter']],
  ['useClientBriefCopy.ts', ['ProspectWriter']],
  ['recovery.ts', ['ProspectWriter']],
]);
const inspect = (file, source, to = target) => inspectSources(new Map([
  [file, source], [to, 'export const fixture = 1;'],
]));
const rejected = (file, source, to = target, message = 'private cross-feature import') => {
  const errors = inspect(file, source, to).errors;
  assert.ok(errors.some(error => error.includes(message)), `${file}: ${source}`);
};

test('only the five allocated brief callers import their exact named authority exports', () => {
  for (const [caller, names] of callers) {
    for (const keyword of ['import', 'import type']) {
      const source = `${keyword} { ${names.join(', ')} } from '${seam}';`;
      const scanned = scanModule(`${owner}${caller}`, source).imports[0];
      assert.equal(scanned.kind, keyword === 'import' ? 'named' : 'other');
      assert.deepEqual(scanned.names, names);
      assert.deepEqual(inspect(`${owner}${caller}`, source).errors, []);
      assert.deepEqual(inspect(`${owner}${caller}`, source).graph[`${owner}${caller}`], [target]);
    }
    assert.deepEqual(inspect(`${owner}${caller}`, `import type { ProspectWriter as Actor } from '${seam}';`).errors, []);
  }
  assert.deepEqual(inspect(`${owner}authority.ts`, `import { verifyProspectWriter, type ProspectWriter } from '${seam}';`).errors, []);
});

test('caller allocation does not permit extra or another caller’s authority exports', () => {
  for (const [caller, allowed] of callers) {
    for (const name of ['verifyProspectWriter', 'prospectIntentScope', 'privateAuthority']) {
      if (allowed.includes(name)) continue;
      for (const keyword of ['import', 'import type']) rejected(`${owner}${caller}`, `${keyword} { ProspectWriter, ${name} } from '${seam}';`);
    }
  }
});

test('default, wildcard, empty, dynamic, require and re-export forms cannot widen the exact seam', () => {
  for (const caller of callers.keys()) {
    for (const source of [
      `import authority from '${seam}';`,
      `import authority, { ProspectWriter } from '${seam}';`,
      `import * as authority from '${seam}';`,
      `import type * as authority from '${seam}';`,
      `import {} from '${seam}';`,
      `import type {} from '${seam}';`,
      `import '${seam}';`,
      `void import('${seam}');`,
      `const authority = require('${seam}');`,
      `type Actor = import('${seam}').ProspectWriter;`,
      `export { ProspectWriter } from '${seam}';`,
      `export type { ProspectWriter } from '${seam}';`,
      `export * from '${seam}';`,
      `export * as authority from '${seam}';`,
    ]) rejected(`${owner}${caller}`, source);
  }
});

test('a sixth caller, a private target and reverse or other feature edges remain forbidden', () => {
  for (const file of [`${owner}sixth.ts`, `${owner}command.tsx`, `${root}features/portfolio/prospects/Other.ts`, `${root}features/meri/View.ts`]) {
    rejected(file, `import type { ProspectWriter } from '${seam}';`);
  }
  for (const suffix of ['prospects/recovery-authority', 'another-public', 'prospect-actions-public.ts/private']) {
    const to = `${root}features/modules/workspace/${suffix}.ts`;
    rejected(`${owner}authority.ts`, `import { verifyProspectWriter } from '@/features/modules/workspace/${suffix}';`, to);
  }
  rejected(target, `import { clientBriefCopyScope } from '@/features/portfolio/prospects/brief/client-copy/command';`, `${owner}command.ts`);
  rejected(`${root}shared/authority.ts`, `import type { ProspectWriter } from '${seam}';`, target, 'foundations import');
  rejected('packages/meri-client/src/authority.ts', `import type { ProspectWriter } from '${seam}';`, target, 'private cross-owner');
});

test('the new command and existing objective owner alone admit the sole named public snapshot function', () => {
  const statement = "import { canonicalWorkspaceSnapshot } from '@capiro/shared';";
  const objective = `${root}shared/capiro/operations/objective-workspace-receiving.ts`;
  for (const file of [`${owner}command.ts`, objective]) {
    assert.deepEqual(inspectSources(new Map([[file, statement]])).errors, []);
    for (const source of [
      "import { canonicalWorkspaceSnapshot, clientMemoryAllowed } from '@capiro/shared';",
      "import * as shared from '@capiro/shared';",
      "import shared from '@capiro/shared';",
      "import shared, { canonicalWorkspaceSnapshot } from '@capiro/shared';",
      "import {} from '@capiro/shared';",
      "import '@capiro/shared';",
      "import type { canonicalWorkspaceSnapshot } from '@capiro/shared';",
      "void import('@capiro/shared');",
      "const shared = require('@capiro/shared');",
      "export { canonicalWorkspaceSnapshot } from '@capiro/shared';",
      "export * from '@capiro/shared';",
      "import { canonicalWorkspaceSnapshot } from '@capiro/shared/dist/workspace-saved-revision';",
    ]) assert.ok(inspectSources(new Map([[file, source]])).errors.some(error => error.includes('non-public package import')), source);
  }
  for (const file of [`${owner}authority.ts`, `${owner}sixth.ts`, `${root}features/portfolio/prospects/command.ts`, `${root}shared/capiro/operations/other.ts`]) {
    assert.ok(inspectSources(new Map([[file, statement]])).errors.some(error => error.includes('non-public package import')), file);
  }
});

test('the exact exception preserves unrelated Portfolio public entries, Meri isolation and cycle checks', () => {
  const portfolio = `${root}features/portfolio/relationships/contact-public.ts`;
  assert.deepEqual(inspect(`${owner}command.ts`, "import { readPeople } from '@/features/portfolio/relationships/contact-public';", portfolio).errors, []);
  rejected(`${root}features/meri/View.ts`, "import { readPeople } from '@/features/portfolio/relationships/contact-public';", portfolio);
  const files = new Map([
    [`${owner}command.ts`, `import { prospectIntentScope } from '${seam}';`],
    [target, "import { clientBriefCopyScope } from '@/features/portfolio/prospects/brief/client-copy/command';"],
  ]);
  const errors = inspectSources(files).errors;
  assert.ok(errors.some(error => error.includes('private cross-feature import')));
  assert.ok(errors.some(error => error.includes('Import cycle')));
});
