import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const usage = 'Usage: node scripts/task-command-fixtures.mjs\nRequires MERI_TASK_COMMAND_QUALIFICATION_SOURCE, a reviewed Meri source checkout. Generates synthetic test HTTP wires using actual owners; no native network or credentials. Exit0 success/help; exit1 setup/failure.';
export async function generateTaskCommandFixtures(source) {
  if (!source || !path.isAbsolute(source)) throw Error('Set absolute MERI_TASK_COMMAND_QUALIFICATION_SOURCE');
  const { commandComposition, id } = await import(pathToFileURL(path.join(source, 'apps/control/intents/test/fixture.mjs')).href);
  const { createTaskCommandApplication } = await import(pathToFileURL(path.join(source, 'apps/control/task-command-application/index.mjs')).href);
  const c = commandComposition({ action: 'task.update' });
  const now = () => c.f.state.now;
  const app = createTaskCommandApplication({ now, limits: { maxRequestMs: 1000, maxRequestBytes: 65536, maxResponseBytes: 65536 },
    resolveSession: async () => ({ binding: c.binding, commandOptions: c.commandOptions, checkedAtMs: now(), expiresAtMs: now() + 1000,
      authorizeExecution: async ({ proposal }) => ({ credential: 'synthetic', execution: { ...c.f.execution, proposalId: proposal.proposalId, commandSha256: proposal.commandSha256, idempotencyKey: proposal.command.idempotencyKey } }) }) });
  const request = { arguments: { taskId: id(21), title: 'Updated', status: 'open' } };
  const call = async (route, body) => {
    const response = await app.handle(new Request(`https://meri.invalid/api/task-commands/${route}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer synthetic-session' }, body: JSON.stringify(body) }));
    return { route, request: body, httpStatus: response.status, response: JSON.parse(await response.text()) };
  };
  const prepare = await call('prepare', request);
  if (prepare.httpStatus !== 200 || c.f.state.fetches !== 0) throw Error('Synthetic prepare failed');
  const proposal = prepare.response.proposal, executeRequest = { proposal };
  const missingApprovalStore = await call('execute', executeRequest);
  // A known absent current approval is distinct from a failed approval-store read.
  const currentApproval = c.approvalStore.getCurrent;
  c.commandOptions.executor = c.f.create({ approvalStore: { async getCurrent(value) {
    try { return await currentApproval(value); } catch { return null; }
  } } });
  const pending = await call('execute', executeRequest);
  if (pending.httpStatus !== 409 || c.f.state.fetches !== 0) throw Error('Synthetic approval hold failed');
  c.approve(proposal);
  const observed = await call('execute', executeRequest), replay = await call('execute', executeRequest);
  if (observed.httpStatus !== 200 || replay.httpStatus !== 200 || c.f.state.fetches !== 1) throw Error('Synthetic execution/replay failed');
  const context = { ...c.binding, selectedClientId: id(9), syntheticNow: now() };
  const directory = new URL('../apps/web/tests/fixtures/meri-task-commands/', import.meta.url);
  await mkdir(directory, { recursive: true });
  for (const [name, value] of Object.entries({ prepare, pending, observed, replay, missingApprovalStore, context }))
    await writeFile(new URL(`${name}.json`, directory), JSON.stringify(value, null, 2) + '\n');
  return { synthetic: true, files: 6, nativeRequests: 0, simulatedSourceEffects: c.f.state.fetches };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).length === 1 && process.argv[2] === '--help') console.log(usage);
  else if (process.argv.length !== 2) { console.error(usage); process.exitCode = 1; }
  else generateTaskCommandFixtures(process.env.MERI_TASK_COMMAND_QUALIFICATION_SOURCE)
    .then(value => console.log(JSON.stringify(value))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
