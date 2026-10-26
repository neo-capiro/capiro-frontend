import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';
const root = 'apps/web/src/';
const owner = `${root}features/modules/engagement/newsletter-delivery/`;
const target = `${root}features/portfolio/relationships/public.ts`;
const seam = '@/features/portfolio/relationships/public';
const callers = new Map([
  ['delivery-api.ts', ['sendingMailboxesSchema', 'SendingMailbox']],
  ['DestinationPicker.tsx', ['personSchema']],
  ...['NewsletterDestinations.tsx', 'NewsletterPrepared.tsx', 'useNewsletterDelivery.ts'].map(file => [file, ['SendingMailbox']]),
]);
const errors = (file, source, to = target) => inspectSources(new Map([[file, source], [to, 'export const fixture = 1;']])).errors;
const refused = (file, source, to) => assert.ok(errors(file, source, to).some(e => e.includes('private cross-feature import')), source);
test('newsletter callers use only allocated named public relationship projections', () => {
  for (const [file, names] of callers) for (const keyword of ['import', 'import type'])
    assert.deepEqual(errors(owner + file, `${keyword} { ${names.join(', ')} } from '${seam}';`), []);
});
test('extra symbols, alternate callers and private target imports stay refused', () => {
  for (const [file, names] of callers) {
    refused(owner + file, `import { ${names[0]}, MailCompose } from '${seam}';`);
    refused(owner + file, `import { ${names[0]} } from '@/features/portfolio/relationships/email/mailboxes';`, `${root}features/portfolio/relationships/email/mailboxes.ts`);
  }
  for (const file of [owner + 'other.ts', `${root}features/meri/View.ts`]) refused(file, `import { SendingMailbox } from '${seam}';`);
  refused(owner + 'NewsletterPrepared.tsx', `import { personSchema } from '${seam}';`);
});
test('namespace, default, dynamic, empty and reexport imports cannot widen the seam', () => {
  for (const file of callers.keys()) for (const source of [
    `import * as mail from '${seam}';`, `import mail from '${seam}';`,
    `import mail, { SendingMailbox } from '${seam}';`, `import {} from '${seam}';`,
    `import '${seam}';`, `void import('${seam}');`, `const mail = require('${seam}');`,
    `export { SendingMailbox } from '${seam}';`, `export type { SendingMailbox } from '${seam}';`,
    `type Mail = import('${seam}').SendingMailbox;`,
  ]) refused(owner + file, source);
});
