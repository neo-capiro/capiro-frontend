// Independent pure synthetic probe. No network, providers, server, DOM or backend code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const workspace = '/workspace/capiro-meri-workflow-20261013';
const require = createRequire(workspace + '/apps/web/package.json');
const receiverPath = require.resolve('@capiro/meri-contracts/action-application');
const { receiveActionResponse } = await import(pathToFileURL(receiverPath));
const { default: canonicalize } = await import(pathToFileURL(require.resolve('canonicalize')));
const correlationPath = process.argv[2] ?? root + 'initial-source/apps/web/src/shared/meri-actions/correlation.ts';
const { validQuery } = await import(pathToFileURL(correlationPath));
const expected = process.argv[3] ?? 'red';
assert.ok(['red', 'green'].includes(expected));
const output = process.argv[4] ?? root + 'query-intent-before-results.json';
const bytesHash = value => createHash('sha256').update(value).digest('hex');
const hash = value => bytesHash(canonicalize(value));
const seedPath = workspace + '/apps/web/tests/fixtures/meri-actions/query.json';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const contextPath = workspace + '/apps/web/tests/fixtures/meri-actions/CONTEXT.json';
const c = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
const context = { tenantId:c.tenantId, actorId:c.actorId, conversationId:c.conversationId,
  runId:c.runId, selectedClientId:c.clientId };
const controls = [];
const original = await receiveActionResponse('query', 200, JSON.stringify(seed.response));
assert.equal(validQuery(original, context), true, 'original first page remains accepted');
controls.push({name:'original-first-page', receiverAccepted:true, correlationAccepted:true});
for (const [name, changes] of [
  ['limit', {limit:50}],
  ['page', {page:2,cursorApplied:true}],
]) {
  const response = structuredClone(seed.response);
  Object.assign(response.observation.result.scope, changes);
  Object.assign(response.observation.result.selection, changes);
  // Canonical selection does not claim a cursor's page number; native read scope can.
  if (name === 'page') response.observation.result.selection.page = null;
  response.resultSha256 = hash(response.observation);
  const fixture = {
    name:`query-foreign-intent-${name}`, route:'query', httpStatus:200, response,
    expected:'receiver_accept_adapter_must_reject',
    request:{request:{limit:20}},
    note:'Synthetic response with matching scope/selection fields and recomputed canonical observation digest. Unrelated native arguments/source hashes are unchanged. Public receiver acceptance is intentionally insufficient to establish request-intent correlation; not a claim this response was emitted by native services.',
  };
  const fixturePath = root + fixture.name + '.json';
  if (!fs.existsSync(fixturePath)) fs.writeFileSync(fixturePath, JSON.stringify(fixture,null,2)+'\n');
  else assert.deepEqual(JSON.parse(fs.readFileSync(fixturePath,'utf8')),fixture);
  const admitted = await receiveActionResponse('query', 200, JSON.stringify(response));
  const accepted = validQuery(admitted, context);
  controls.push({name:fixture.name,receiverAccepted:true,correlationAccepted:accepted,
    requiredCorrelationAccepted:false,scope:admitted.observation.result.scope,
    fixtureSha256:bytesHash(fs.readFileSync(fixturePath))});
}
const record = {scope:'PUBLIC_RECEIVER_AND_PURE_CORRELATION_ONLY',node:process.version,
  observedAt:new Date().toISOString(), expected,
  source:{correlationPath,correlationSha256:bytesHash(fs.readFileSync(correlationPath)),
    receiverPath,receiverSha256:bytesHash(fs.readFileSync(receiverPath)),
    seedSha256:bytesHash(fs.readFileSync(seedPath))},controls,
  defectsObserved:controls.filter(x=>x.requiredCorrelationAccepted===false&&x.correlationAccepted).length};
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
assert.equal(record.defectsObserved,expected==='red'?2:0);
