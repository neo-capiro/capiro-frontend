import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { renderPreviewConfiguration, validatePreviewParameters } from '../apps/web/deployment/portfolio/preview-config.mjs';

// Public resource references only. The test never reads secret payloads or sends a token.
const bindings = {
  clerkIssuer: 'https://clerk.app.capiro.ai',
  clerkApplicationId: 'app_syntheticpreview',
  clerkPublishableKeyArn: 'arn:aws:secretsmanager:us-east-1:967807252336:secret:/capiro/dev/clerk/publishable-key-rAfesC',
  clerkSecretArn: 'arn:aws:secretsmanager:us-east-1:967807252336:secret:/capiro/dev/clerk/secret-key-FT67tM',
  clerkKeyArn: 'arn:aws:kms:us-east-1:967807252336:key/f47b4c53-b9c0-4d91-ad57-4d882f87767e',
};
const script = 'apps/web/deployment/portfolio/preview-config.mjs';
const template = readFileSync('apps/web/deployment/portfolio/service.yml', 'utf8');
const qualification = readFileSync('apps/web/deployment/portfolio/PR70-FIRST-CHAT-IMAGE-QUALIFICATION.buildspec.yml', 'utf8');
const coreApi = 'https://first-chat-preview.app-dev.capiro.ai/api';
const coreReadSource = '6542f5b089656b6d255465edd464d06c2a0b408f';
const qualifiedCoreRosterSource = '50475125275853299798fc40f8cb119f0b865464';
const qualifiedCoreRosterApi = 'https://core-roster-preview.capiro.ai/api';
const coreBootstrapSource = '16c3122a379481eb19cdee156ceb5d5c8b615bea';
const coreDeploymentSource = 'd03a118192acd2b1ed2ef5698afb0ab8f2b36ae8';
const coreDeploymentDigest = 'sha256:a1e35b1aeae40889b46c75df472ced83aebe54b8f78234bffef4192c9767e375';
const meriSource = '7eea1e852f177c17e3675429830b886b906e4cd6';
const meriDigest = 'sha256:1421f5cb090a010be2c3e3faa8c549f2c570c30a7432641efcca839dd8a8e35d';
const meriEnabled = {
  meriApiBaseUrl: 'https://meri-preview.example.test',
  meriConversationWorkflowEnabled: true,
  meriConversationRoutesEnabled: true,
  meriRuntimeSource: meriSource,
  meriRuntimeImageDigest: meriDigest,
};

test('preview proposes held Meri defaults while unavailable services stay disabled', () => {
  const p = renderPreviewConfiguration(bindings);
  assert.equal(p.environment.CORE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/api');
  assert.equal(p.environment.WORKSPACE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/workspace-api');
  assert.equal(p.environment.INTELLIGENCE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/intel-api');
  for (const name of ['STRATEGY_API_BASE_URL', 'ONBOARD_API_BASE_URL', 'MERI_API_BASE_URL', 'MERI_DOCUMENT_OPERATION']) assert.equal(p.environment[name], '');
  assert.equal(p.environment.MERI_ACTION_WORKFLOW_ENABLED, 'false');
  assert.equal(p.environment.MERI_CONVERSATION_WORKFLOW_ENABLED, 'false');
  assert.equal(p.environment.MERI_DOCUMENT_WORKFLOW_ENABLED, 'false');
  assert.equal(p.environment.CAPIRO_REQUEST_ORIGIN, 'https://portfolio-preview.app.capiro.ai');
  assert.equal(p.environment.CAPIRO_PREVIEW_READ_ONLY, 'true');
  for (const name of ['CAPIRO_PREVIEW_READ_BACKEND_SOURCE', 'CAPIRO_PREVIEW_READ_API_BASE_URL',
    'CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE', 'CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL',
    'CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE',
    'CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL', 'CAPIRO_PREVIEW_MERI_RUNTIME_ORIGIN',
    'CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE', 'CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST',
    'CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION']) assert.equal(p.environment[name], '', name);
  for (const name of ['CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE', 'CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL']) assert.equal(p.environment[name], '', name);
  for (const name of ['MERI_FIRST_CHAT_BOOTSTRAP_ENABLED', 'CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED',
    'MERI_MEMORY_OWNER_REVIEW_ENABLED', 'CAPIRO_PREVIEW_MEMORY_OWNER_ROUTES_ENABLED']) assert.equal(p.environment[name], 'false', name);
  assert.equal(p.parameters.length, 29);
  assert.deepEqual(p.parameters.filter(item => item.ParameterKey.startsWith('Meri')), [
    { ParameterKey: 'MeriFirstChatBootstrapEnabled', ParameterValue: 'false' },
    { ParameterKey: 'MeriMemoryOwnerReviewEnabled', ParameterValue: 'false' },
    { ParameterKey: 'MeriApiBaseUrl', ParameterValue: '' },
    { ParameterKey: 'MeriConversationWorkflowEnabled', ParameterValue: 'false' },
  ]);
  assert.equal(p.clerkMetadata.requiredEnvironment, 'configured-core-issuer-unverified');
  assert.match(p.activationStatus, /held at zero/);
  assert.equal(Object.hasOwn(p.environment, 'CLERK_SECRET_KEY'), false);
  assert.equal(p.secretReferences.CLERK_SECRET_KEY, bindings.clerkSecretArn);
  validatePreviewParameters(p.parameters.toReversed(), bindings);
});

test('memory preview is held until a listener-compatible Core successor is pinned', () => {
  assert.throws(() => renderPreviewConfiguration({ ...bindings, memoryOwnerReviewEnabled: true }),
    /PREVIEW_MEMORY_LISTENER_UNQUALIFIED/);
  for (const value of [null, 'true', 1]) {
    assert.throws(() => renderPreviewConfiguration({ ...bindings, memoryOwnerReviewEnabled: value }),
      /PREVIEW_MEMORY_FLAG_INVALID/);
  }
  const held = renderPreviewConfiguration({ ...bindings, memoryOwnerReviewEnabled: false });
  assert.equal(held.environment.MERI_MEMORY_OWNER_REVIEW_ENABLED, 'false');
  assert.equal(held.environment.CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL, '');
});

test('Meri opt-in requires an explicit canonical HTTPS root origin', () => {
  assert.throws(() => renderPreviewConfiguration({ ...bindings, ...meriEnabled, meriApiBaseUrl: '' }), /PREVIEW_MERI_ORIGIN_REQUIRED/);
  for (const meriApiBaseUrl of [null, 1, 'http://meri.example.test', 'https://meri.example.test/',
    'https://meri.example.test/path', 'https://user@meri.example.test', 'https://meri.example.test?x=1',
    'https://meri.example.test#part', 'https://meri..example.test', 'https://MERI.example.test',
    'https://127.0.0.1', 'https://portfolio-preview.app.capiro.ai', 'https://first-chat-preview.app-dev.capiro.ai',
    'https://core-roster-preview.capiro.ai']) {
    assert.throws(() => renderPreviewConfiguration({ ...bindings, meriApiBaseUrl }), /PREVIEW_MERI_ORIGIN_INVALID/);
  }
  for (const meriConversationWorkflowEnabled of [null, 1, 'true']) {
    assert.throws(() => renderPreviewConfiguration({ ...bindings, meriConversationWorkflowEnabled }), /PREVIEW_MERI_FLAG_INVALID/);
  }
  for (const meriConversationRoutesEnabled of [null, 1, 'true']) {
    assert.throws(() => renderPreviewConfiguration({ ...bindings, meriConversationRoutesEnabled }), /PREVIEW_MERI_ROUTE_FLAG_INVALID/);
  }
});

test('explicit Meri origin and opt-in form one exact, reviewable parameter proposal', () => {
  const optedIn = { ...bindings, ...meriEnabled };
  const p = renderPreviewConfiguration(optedIn);
  assert.equal(p.environment.MERI_API_BASE_URL, optedIn.meriApiBaseUrl);
  assert.equal(p.environment.MERI_CONVERSATION_WORKFLOW_ENABLED, 'true');
  assert.equal(p.environment.CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED, 'true');
  assert.equal(p.environment.CAPIRO_PREVIEW_MERI_RUNTIME_ORIGIN, optedIn.meriApiBaseUrl);
  assert.equal(p.environment.CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE, meriSource);
  assert.equal(p.environment.CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST, meriDigest);
  assert.equal(p.environment.CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION, '0.1.13');
  assert.equal(p.holds.includes('meri'), true);
  assert.match(p.activationStatus, /readiness not established/);
  validatePreviewParameters(p.parameters.toReversed(), optedIn);
  assert.throws(() => validatePreviewParameters(p.parameters, bindings), /PREVIEW_PARAMETER_MISMATCH/);
  const held = renderPreviewConfiguration({ ...bindings, meriApiBaseUrl: optedIn.meriApiBaseUrl });
  assert.equal(held.environment.MERI_CONVERSATION_WORKFLOW_ENABLED, 'false');
  assert.equal(held.holds.includes('meri'), true);
  for (const invalid of [
    { ...bindings, meriApiBaseUrl: optedIn.meriApiBaseUrl, meriConversationWorkflowEnabled: true },
    { ...bindings, meriApiBaseUrl: optedIn.meriApiBaseUrl, meriConversationRoutesEnabled: true },
    { ...optedIn, meriRuntimeSource: '' },
    { ...optedIn, meriRuntimeImageDigest: '' },
    { ...optedIn, meriRuntimeSource: null },
    { ...bindings, meriRuntimeSource: meriSource },
  ]) assert.throws(() => renderPreviewConfiguration(invalid), /PREVIEW_MERI_/);
});

test('Core read and first chat remain held until all exact bindings are supplied together', () => {
  const read = renderPreviewConfiguration({ ...bindings, previewReadEnabled: true });
  assert.equal(read.environment.CAPIRO_PREVIEW_READ_BACKEND_SOURCE, coreReadSource);
  assert.equal(read.environment.CAPIRO_PREVIEW_READ_API_BASE_URL, coreApi);
  assert.equal(read.environment.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED, 'false');
  const active = { ...bindings, ...meriEnabled, previewReadEnabled: true,
    firstChatBootstrapEnabled: true };
  const p = renderPreviewConfiguration(active);
  assert.equal(p.environment.CORE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/api');
  assert.equal(p.environment.CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL, coreApi);
  assert.equal(p.environment.CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE, coreBootstrapSource);
  assert.equal(Object.hasOwn(p.environment, 'MERI_FIRST_CHAT_CLIENT_ID'), false);
  validatePreviewParameters(p.parameters.toReversed(), active);
  for (const invalid of [
    { ...bindings, firstChatBootstrapEnabled: true },
    { ...bindings, previewReadEnabled: true, firstChatBootstrapEnabled: true },
    { ...bindings, previewReadEnabled: 'true' },
  ]) assert.throws(() => renderPreviewConfiguration(invalid), /PREVIEW_FIRST_CHAT_/);
});

test('v2 contract baseline remains distinct from independently verified serving source', () => {
  const active = { ...bindings, ...meriEnabled, previewReadEnabled: true,
    firstChatBootstrapEnabled: true };
  const p = renderPreviewConfiguration(active);
  assert.deepEqual(p.expectedCoreDeployment, {
    contractSource: coreBootstrapSource,
    sourceCommit: coreDeploymentSource,
    imageDigest: coreDeploymentDigest,
  });
  assert.notEqual(coreBootstrapSource, coreDeploymentSource);
  assert.equal(renderPreviewConfiguration(bindings).expectedCoreDeployment, null);
  const runtime = readFileSync('apps/web/src/shared/preview/first-chat-write.server.ts', 'utf8');
  assert.equal(runtime.match(/export const previewGeneralBackendSource =\s*"([a-f0-9]{40})"/)?.[1], coreBootstrapSource);
  assert.match(template, new RegExp(`ContractSource: "${coreBootstrapSource}"`));
  assert.match(template, new RegExp(`ExpectedDeploymentSource: "${coreDeploymentSource}"`));
  assert.match(template, new RegExp(`ExpectedDeploymentImageDigest: "${coreDeploymentDigest}"`));
  assert.match(template, /metadata is not attestation/);
  for (const source of ['c64f0005cf14d69683aabafa11def4964d766832', coreDeploymentSource,
    '16c3122a379481eb19cdee156ceb5d5c8b615beb']) {
    const changed = p.parameters.map(item => item.ParameterKey === 'CapiroPreviewFirstChatBackendSource'
      ? { ...item, ParameterValue: source } : item);
    assert.throws(() => validatePreviewParameters(changed, active), /PREVIEW_PARAMETER_MISMATCH/);
  }
  assert.throws(() => renderPreviewConfiguration({ ...active,
    expectedCoreDeployment: { sourceCommit: coreBootstrapSource } }), /PREVIEW_BINDINGS_SHAPE/);
});

test('current ARM release pins refuse retired runtime and consumer substitutions', () => {
  const active = { ...bindings, ...meriEnabled };
  const p = renderPreviewConfiguration(active);
  for (const [field, value] of [
    ['meriRuntimeSource', '176a8811a9b05d8613282e70bd7a57ebd75ca201'],
    ['meriRuntimeImageDigest', 'sha256:5534edfe5805eec7a5d0bce66b2c85765fe2f957173ddd3ce2726bed67e322d8'],
    ['meriRuntimeImageDigest', 'sha256:' + '0'.repeat(64)],
  ]) assert.throws(() => renderPreviewConfiguration({ ...active, [field]: value }), /PREVIEW_MERI_IMAGE_UNQUALIFIED/);
  const changed = p.parameters.map(item => item.ParameterKey === 'CapiroPreviewMeriContractPackageVersion'
    ? { ...item, ParameterValue: '0.1.10' } : item);
  assert.throws(() => validatePreviewParameters(changed, active), /PREVIEW_PARAMETER_MISMATCH/);
  const runtime = readFileSync('apps/web/src/shared/preview/meri-conversation-route.server.ts', 'utf8');
  assert.equal(runtime.match(/previewMeriContractsPackageVersion = "([^"]+)"/)?.[1],
    p.environment.CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION);
  assert.match(template, /CpuArchitecture: ARM64\n +OperatingSystemFamily: LINUX/);
  assert.doesNotMatch(template, /CpuArchitecture: X86_64/);
});

test('qualified Core roster adds a separate pair without switching first-chat reads or bootstrap', () => {
  const qualified = { ...bindings, previewReadEnabled: true,
    qualifiedCoreClientRosterApiBaseUrl: qualifiedCoreRosterApi };
  const p = renderPreviewConfiguration(qualified);
  assert.equal(p.environment.CAPIRO_PREVIEW_READ_BACKEND_SOURCE, coreReadSource);
  assert.equal(p.environment.CAPIRO_PREVIEW_READ_API_BASE_URL, coreApi);
  assert.equal(p.environment.CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE, qualifiedCoreRosterSource);
  assert.equal(p.environment.CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL, qualifiedCoreRosterApi);
  assert.equal(p.environment.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED, 'false');
  assert.equal(p.environment.CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL, '');
  validatePreviewParameters(p.parameters.toReversed(), qualified);
  assert.throws(() => validatePreviewParameters(p.parameters, { ...bindings, previewReadEnabled: true }), /PREVIEW_PARAMETER_MISMATCH/);
  assert.throws(() => renderPreviewConfiguration({ ...bindings,
    qualifiedCoreClientRosterApiBaseUrl: qualifiedCoreRosterApi }), /PREVIEW_CORE_ROSTER_DEPENDENCY_HELD/);
  assert.throws(() => renderPreviewConfiguration({ ...qualified,
    qualifiedCoreReadApiBaseUrl: qualifiedCoreRosterApi }), /PREVIEW_BINDINGS_SHAPE/);
  const firstChat = { ...qualified, ...meriEnabled,
    firstChatBootstrapEnabled: true };
  const integrated = renderPreviewConfiguration(firstChat);
  assert.equal(integrated.environment.CAPIRO_PREVIEW_READ_BACKEND_SOURCE, coreReadSource);
  assert.equal(integrated.environment.CAPIRO_PREVIEW_READ_API_BASE_URL, coreApi);
  assert.equal(integrated.environment.CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE, coreBootstrapSource);
  assert.equal(integrated.environment.CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL, coreApi);
  assert.equal(integrated.environment.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED, 'true');
  assert.equal(Object.hasOwn(integrated.environment, 'MERI_FIRST_CHAT_CLIENT_ID'), false);
  assert.equal(integrated.environment.CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE, qualifiedCoreRosterSource);
  assert.equal(integrated.environment.CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL, qualifiedCoreRosterApi);
  assert.equal(integrated.status, 'configuration-proposal');
  validatePreviewParameters(integrated.parameters.toReversed(), firstChat);
  for (const target of [null, 1, 'https://qualified-core.example.test/api',
    ' http://core-roster-preview.capiro.ai/api',
    'http://core-roster-preview.capiro.ai/api', 'https://core-roster-preview.capiro.ai/api/',
    'https://core-roster-preview.capiro.ai/api?x=1', 'https://core-roster-preview.capiro.ai/api#fragment',
    'https://user@core-roster-preview.capiro.ai/api', 'https://core-roster-preview.capiro.ai:443/api',
    'https://core-roster-preview.capiro.ai:8443/api', 'https://CORE-ROSTER-PREVIEW.capiro.ai/api',
    'https://127.0.0.1/api', 'https://localhost/api',
    'https://portfolio-preview.app.capiro.ai/api', 'https://os.capiro.ai/api', coreApi,
  ]) assert.throws(() => renderPreviewConfiguration({ ...qualified,
    qualifiedCoreClientRosterApiBaseUrl: target }), /PREVIEW_CORE_ROSTER_ORIGIN_INVALID/);
  assert.throws(() => renderPreviewConfiguration({ ...qualified, ...meriEnabled,
    meriApiBaseUrl: 'https://core-roster-preview.capiro.ai' }), /PREVIEW_MERI_ORIGIN_INVALID/);
});

test('roster pin agrees across runtime and public metadata while deployment remains held', () => {
  const runtime = readFileSync('apps/web/src/shared/preview/read-config.server.ts', 'utf8');
  const metadata = JSON.parse(readFileSync('docs/desktop-integration-20261019/CORE-ROSTER-PIN.json', 'utf8'));
  assert.equal(runtime.match(/export const qualifiedCorePreviewBackendSource =\s*"([a-f0-9]{40})"/)?.[1], qualifiedCoreRosterSource);
  assert.equal(metadata.coreSource, qualifiedCoreRosterSource);
  assert.equal(metadata.status, 'source-reviewed-runtime-held');
  assert.deepEqual(metadata.environmentProposal, {
    CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE: qualifiedCoreRosterSource,
    CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL: qualifiedCoreRosterApi,
  });
  assert.deepEqual(metadata.runtimeEvidence, { releaseSource: null, imageDigest: null });
  const proposed = { ...bindings, previewReadEnabled: true,
    qualifiedCoreClientRosterApiBaseUrl: qualifiedCoreRosterApi };
  const p = renderPreviewConfiguration(proposed);
  for (const retiredOrChangedPin of [metadata.previousCoreSource,
    '50475125275853299798fc40f8cb119f0b865465']) {
    assert.notEqual(retiredOrChangedPin, qualifiedCoreRosterSource);
    const changed = p.parameters.map(item => item.ParameterKey === 'CapiroPreviewClientRosterBackendSource'
      ? { ...item, ParameterValue: retiredOrChangedPin } : item);
    assert.throws(() => validatePreviewParameters(changed, proposed), /PREVIEW_PARAMETER_MISMATCH/);
  }
});

test('preview rejects unknown, missing, credential-valued and mismatched Clerk bindings', () => {
  for (const invalid of [null, [], {}, { ...bindings, extra: 'value' }, { ...bindings, clerkIssuer: 'https://synthetic-preview.clerk.accounts.dev' },
    { ...bindings, clerkSecretArn: 'sk_live_synthetic' }, { ...bindings, clerkSecretArn: bindings.clerkSecretArn.replace('/dev/', '/preview/') },
    { ...bindings, clerkPublishableKeyArn: bindings.clerkSecretArn }, { ...bindings, clerkPublishableKeyArn: bindings.clerkPublishableKeyArn.replace('rAfesC', 'AAAAAA') },
    { ...bindings, clerkKeyArn: bindings.clerkKeyArn.replace('967807252336', '111111111111') },
    { ...bindings, clerkIssuer: `${bindings.clerkIssuer}/` }, { ...bindings, clerkApplicationId: ' app_syntheticpreview' }]) {
    assert.throws(() => renderPreviewConfiguration(invalid), /PREVIEW_BIND/);
  }
  const getter = Object.defineProperty({ ...bindings }, 'meriApiBaseUrl', { get() { throw Error('getter executed'); } });
  assert.throws(() => renderPreviewConfiguration(getter), /PREVIEW_BINDINGS_SHAPE/);
});

test('preview rejects retained or overridden production parameters and ambiguous sets', () => {
  const p = renderPreviewConfiguration(bindings).parameters;
  for (const invalid of [p.slice(1), [...p, p[0]], p.map((v, i) => i ? v : { ParameterKey: v.ParameterKey, UsePreviousValue: true }),
    p.map((v, i) => i ? v : { ...v, ParameterValue: 'https://os.capiro.ai/api' }),
    p.map((v, i) => i ? v : { ...v, UsePreviousValue: false }),
    p.map((v, i) => i ? v : p[1])]) {
    assert.throws(() => validatePreviewParameters(invalid, bindings), /PREVIEW_PARAM/);
  }
});

test('preview template constrains every explicit configuration value and keeps held services blank', () => {
  const p = renderPreviewConfiguration(bindings);
  // The roster parameters exist, but the Core source remains held at blank.
  const heldTemplateParameters = new Set([
    'CapiroPreviewClientRosterBackendSource', 'CapiroPreviewClientRosterApiBaseUrl',
  ]);
  const optionalExact = new Map([
    ['CapiroPreviewReadBackendSource', coreReadSource],
    ['CapiroPreviewReadApiBaseUrl', coreApi],
    ['CapiroPreviewFirstChatBackendSource', coreBootstrapSource],
    ['CapiroPreviewFirstChatApiBaseUrl', coreApi],
    ['CapiroPreviewMeriRuntimeSource', meriSource],
    ['CapiroPreviewMeriRuntimeImageDigest', meriDigest],
    ['CapiroPreviewMeriContractPackageVersion', '0.1.13'],
  ]);
  const optionalBooleans = new Set(['MeriConversationWorkflowEnabled', 'MeriFirstChatBootstrapEnabled',
    'CapiroPreviewMeriConversationRoutesEnabled', 'MeriMemoryOwnerReviewEnabled',
    'CapiroPreviewMemoryOwnerRoutesEnabled']);
  for (const item of p.parameters) {
    const block = template.match(new RegExp(`^  ${item.ParameterKey}:\\n([\\s\\S]*?)(?=^  \\w+:|^Resources:)`, 'm'))?.[1];
    assert.ok(block, item.ParameterKey);
    if (heldTemplateParameters.has(item.ParameterKey)) {
      assert.equal(item.ParameterValue, '');
      assert.match(block, /Default: ""/);
      const allowed = JSON.parse(block.match(/AllowedValues: (\[.*\])/)?.[1] ?? 'null');
      assert.deepEqual(allowed, item.ParameterKey === 'CapiroPreviewClientRosterBackendSource'
        ? [''] : ['', 'https://core-roster-preview.capiro.ai/api']);
    } else if (item.ParameterKey.startsWith('Clerk')) {
      const pattern = JSON.parse(block.match(/AllowedPattern: (".*")/)?.[1] ?? 'null');
      assert.equal(typeof pattern, 'string', item.ParameterKey);
      assert.match(item.ParameterValue, new RegExp(pattern));
      assert.doesNotMatch('sk_live_synthetic', new RegExp(pattern));
    } else if (item.ParameterKey === 'MeriApiBaseUrl' || item.ParameterKey === 'CapiroPreviewMeriRuntimeOrigin') {
      assert.match(block, /Default: ""/);
      const pattern = JSON.parse(block.match(/AllowedPattern: (".*")/)?.[1] ?? 'null');
      assert.match(item.ParameterValue, new RegExp(pattern));
      assert.match('https://meri-preview.example.test', new RegExp(pattern));
      assert.doesNotMatch('http://meri-preview.example.test', new RegExp(pattern));
      assert.doesNotMatch('https://meri-preview.example.test/path', new RegExp(pattern));
      assert.doesNotMatch('https://127.0.0.1', new RegExp(pattern));
    } else if (optionalBooleans.has(item.ParameterKey)) {
      assert.match(block, /Default: "false"/);
      const allowed = JSON.parse(block.match(/AllowedValues: (\[.*\])/)?.[1] ?? 'null');
      assert.deepEqual(allowed, ['false', 'true']);
    } else if (optionalExact.has(item.ParameterKey)) {
      assert.match(block, /Default: ""/);
      const allowed = JSON.parse(block.match(/AllowedValues: (\[.*\])/)?.[1] ?? 'null');
      assert.deepEqual(allowed, ['', optionalExact.get(item.ParameterKey)]);
    } else {
      const allowed = JSON.parse(block.match(/AllowedValues: (\[.*\])/)?.[1] ?? 'null');
      assert.deepEqual(allowed, [item.ParameterValue], item.ParameterKey);
    }
  }
  assert.doesNotMatch(template, /https:\/\/os\.capiro\.ai/);
  for (const [name, value] of Object.entries(p.environment).filter(([name]) => /^(ONBOARD_|MERI_|CAPIRO_PREVIEW_|CAPIRO_REQUEST_ORIGIN)/.test(name))) {
    const parameter = {
      MERI_API_BASE_URL: 'MeriApiBaseUrl', MERI_CONVERSATION_WORKFLOW_ENABLED: 'MeriConversationWorkflowEnabled',
      MERI_FIRST_CHAT_BOOTSTRAP_ENABLED: 'MeriFirstChatBootstrapEnabled',
      CAPIRO_REQUEST_ORIGIN: 'CapiroRequestOrigin', CAPIRO_PREVIEW_READ_ONLY: 'CapiroPreviewReadOnly',
      CAPIRO_PREVIEW_READ_BACKEND_SOURCE: 'CapiroPreviewReadBackendSource', CAPIRO_PREVIEW_READ_API_BASE_URL: 'CapiroPreviewReadApiBaseUrl',
      CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE: 'CapiroPreviewClientRosterBackendSource',
      CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL: 'CapiroPreviewClientRosterApiBaseUrl',
      CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE: 'CapiroPreviewFirstChatBackendSource', CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL: 'CapiroPreviewFirstChatApiBaseUrl',
      MERI_MEMORY_OWNER_REVIEW_ENABLED: 'MeriMemoryOwnerReviewEnabled', CAPIRO_PREVIEW_MEMORY_OWNER_ROUTES_ENABLED: 'CapiroPreviewMemoryOwnerRoutesEnabled',
      CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE: 'CapiroPreviewMemoryCoreBackendSource', CAPIRO_PREVIEW_MEMORY_CORE_API_BASE_URL: 'CapiroPreviewMemoryCoreApiBaseUrl',
      CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED: 'CapiroPreviewMeriConversationRoutesEnabled',
      CAPIRO_PREVIEW_MERI_RUNTIME_ORIGIN: 'CapiroPreviewMeriRuntimeOrigin', CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: 'CapiroPreviewMeriRuntimeSource',
      CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST: 'CapiroPreviewMeriRuntimeImageDigest',
      CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION: 'CapiroPreviewMeriContractPackageVersion',
    }[name];
    assert.match(template, new RegExp(`- Name: ${name}\\n +Value: ${parameter ? `!Ref ${parameter}` : `"${value}"`}`));
  }
  assert.match(template, /MeriConversationRequiresOrigin:\n +RuleCondition: !Equals \[!Ref MeriConversationWorkflowEnabled, "true"\]\n +Assertions:\n +- Assert: !Not \[!Equals \[!Ref MeriApiBaseUrl, ""\]\]/);
  assert.match(template, /FirstChatRequiresCurrentBindings:/);
  assert.match(template, /PreviewReadHeldWithoutSource:/);
  assert.match(template, /PreviewClientRosterRequiresPairedTarget:/);
  assert.match(template, /PreviewClientRosterHeldWithoutSource:/);
  assert.match(template, /MeriRouteHeldWithoutWorkflow:/);
  assert.match(template, /MemoryReviewRequiresQualifiedCore:/);
  assert.match(template, /MemoryReviewHeldWithoutFlag:/);
});

test('roster template rejects an origin until the reviewed Core source is pinned', () => {
  const sourceBlock = template.match(/^  CapiroPreviewClientRosterBackendSource:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];
  assert.ok(sourceBlock);
  assert.deepEqual(JSON.parse(sourceBlock.match(/AllowedValues: (\[.*\])/)?.[1] ?? 'null'), ['']);
  assert.match(sourceBlock, new RegExp(qualifiedCoreRosterSource));
  assert.match(template, /PreviewClientRosterHeldWithoutSource:\n +RuleCondition: !Equals \[!Ref CapiroPreviewClientRosterBackendSource, ""\]\n +Assertions:\n +- Assert: !Equals \[!Ref CapiroPreviewClientRosterApiBaseUrl, ""\]/);
  assert.match(template, /PreviewClientRosterRequiresPairedTarget:\n +RuleCondition: !Not \[!Equals \[!Ref CapiroPreviewClientRosterBackendSource, ""\]\]\n +Assertions:\n +- Assert: !Equals \[!Ref CapiroPreviewClientRosterApiBaseUrl, "https:\/\/core-roster-preview\.capiro\.ai\/api"\]/);
  assert.match(template, /- Assert: !Equals \[!Ref CapiroPreviewReadBackendSource, "6542f5b089656b6d255465edd464d06c2a0b408f"\]\n +AssertDescription: Core roster requires the reviewed preview read source/);
  assert.match(template, /- Assert: !Equals \[!Ref CapiroPreviewReadApiBaseUrl, "https:\/\/first-chat-preview\.app-dev\.capiro\.ai\/api"\]\n +AssertDescription: Core roster requires the reviewed preview read target/);
});

test('PR70 one-shot override covers changed first-chat behavior and exact image/scan gates', () => {
  assert.match(qualification, /31a140cddf798c32b5cc45ad22e7b672312b3ca3/);
  assert.match(qualification, /printf '%s\\n' "\$EXPECTED_SHA" \| cmp -s - source-commit\.txt/);
  assert.match(qualification, /"\$CODEBUILD_SOURCE_VERSION" = "\$EXPECTED_S3_VERSION"/);
  for (const name of ['preview-read-receiving', 'first-chat-intent', 'first-chat-bootstrap',
    'meri-first-chat-core', 'meri-first-chat-preview-policy', 'meri-first-chat-route',
    'meri-first-chat-host', 'meri-conversation-host', 'meri-conversation-route',
    'meri-conversation-proxy', 'meri-history-proxy', 'meri-preview-route-activation',
    'meri-document-proxy', 'preview-backend-containment']) {
    assert.match(qualification, new RegExp(`tests/${name}\\.test\\.ts`), name);
  }
  for (const command of ['node --test scripts/preview-config.test.mjs',
    'npm run typecheck --workspace @capiro/web', 'npm run lint --workspace @capiro/web',
    'npm run architecture', 'npm run build', 'npm run test:production',
    'docker build --pull --platform linux/amd64', 'apps/web/deployment/portfolio/smoke.sh']) {
    assert.ok(qualification.includes(command), command);
  }
  assert.match(qualification, /test "\$REPOSITORY_URI" = "967807252336\.dkr\.ecr\.us-east-1\.amazonaws\.com\/capiro\/portfolio-preview"/);
  assert.match(qualification, /test "\$AWS_DEFAULT_REGION" = "us-east-1"/);
  assert.match(qualification, /describe-images --repository-name capiro\/portfolio-preview --image-ids "imageTag=\$EXPECTED_SHA"/);
  assert.match(qualification, /describe-image-scan-findings --repository-name capiro\/portfolio-preview --image-id "imageDigest=\$digest"/);
  assert.match(qualification, /scan_complete=0/);
  assert.match(qualification, /s!=="COMPLETE"/);
  assert.match(qualification, /n\.HIGH\?\?0/);
  assert.match(qualification, /n\.CRITICAL\?\?0/);
});

test('preview CLI is import-safe, ignores hostile ambient values and never echoes rejected secrets', () => {
  const env = { ...process.env, CORE_API_BASE_URL: 'https://os.capiro.ai/api', CLERK_SECRET_KEY: 'sk_live_do_not_echo', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_do_not_echo' };
  const run = args => spawnSync(process.execPath, args, { encoding: 'utf8', env, timeout: 10000 });
  const imported = run(['--input-type=module', '-e', `await import('./${script}')`]);
  assert.equal(imported.status, 0); assert.equal(imported.stdout, ''); assert.equal(imported.stderr, '');
  assert.equal(run([script, '--help']).status, 0);
  assert.equal(run([script]).status, 2);
  const dir = mkdtempSync(join(tmpdir(), 'capiro-preview-config-'));
  try {
    const input = join(dir, 'bindings.json');
    const alias = join(dir, 'preview-entry.mjs');
    try { symlinkSync(resolve(script), alias); }
    catch (error) {
      if (process.platform !== 'win32' || error?.code !== 'EPERM') throw error;
      copyFileSync(resolve(script), alias); // Windows sandbox can deny symlink creation.
    }
    const aliasHelp = run([alias, '--help']);
    assert.equal(aliasHelp.status, 0); assert.match(aliasHelp.stdout, /Usage:/);
    assert.equal(run([alias]).status, 2);
    writeFileSync(input, JSON.stringify(bindings));
    const good = run([script, '--bindings', input]);
    assert.equal(good.status, 0, good.stderr);
    assert.equal(JSON.parse(good.stdout).environment.CORE_API_BASE_URL, 'https://portfolio-preview.app.capiro.ai/api');
    assert.doesNotMatch(good.stdout, /do_not_echo|os\.capiro\.ai/);
    const aliasGood = run([alias, '--bindings', input]);
    assert.equal(aliasGood.status, 0); assert.equal(aliasGood.stdout, good.stdout);
    writeFileSync(input, JSON.stringify({ ...bindings, ...meriEnabled }));
    const optedIn = run([script, '--bindings', input]);
    assert.equal(optedIn.status, 0, optedIn.stderr);
    assert.equal(JSON.parse(optedIn.stdout).environment.MERI_CONVERSATION_WORKFLOW_ENABLED, 'true');
    writeFileSync(input, JSON.stringify({ ...bindings, meriConversationWorkflowEnabled: true }));
    const missingOrigin = run([script, '--bindings', input]);
    assert.equal(missingOrigin.status, 1); assert.match(missingOrigin.stderr, /PREVIEW_MERI_ORIGIN_REQUIRED/);
    writeFileSync(input, JSON.stringify({ ...bindings, clerkSecretArn: env.CLERK_SECRET_KEY }));
    const bad = run([script, '--bindings', input]);
    assert.equal(bad.status, 1); assert.equal(bad.stdout, ''); assert.doesNotMatch(bad.stderr, /sk_live|do_not_echo/);
    writeFileSync(input, '{"sk_live_do_not_echo":');
    const malformed = run([script, '--bindings', input]);
    assert.equal(malformed.status, 1); assert.equal(malformed.stdout, ''); assert.doesNotMatch(malformed.stderr, /sk_live|do_not_echo/);
    const missing = run([script, '--bindings', join(dir, 'missing.json')]);
    assert.equal(missing.status, 1); assert.equal(missing.stdout, '');
  } finally { rmSync(dir, { recursive: true }); }
});

test('configured-client narrowing is removed from operator input, parameters and environment', () => {
  assert.throws(() => renderPreviewConfiguration({ ...bindings, firstChatClientId: '33333333-3333-4333-8333-333333333333' }), /PREVIEW_BINDINGS_SHAPE/);
  assert.doesNotMatch(template, /MeriFirstChatClientId|MERI_FIRST_CHAT_CLIENT_ID/);
  const p=renderPreviewConfiguration({...bindings,...meriEnabled,previewReadEnabled:true,firstChatBootstrapEnabled:true});
  assert.equal(p.parameters.some(p=>p.ParameterKey==='MeriFirstChatClientId'), false);
  assert.equal(Object.hasOwn(p.environment,'MERI_FIRST_CHAT_CLIENT_ID'), false);
});
