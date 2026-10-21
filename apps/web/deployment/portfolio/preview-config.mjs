import { readFileSync, statSync } from 'node:fs';

const origin = 'https://portfolio-preview.app.capiro.ai';
const corePreviewApi = 'https://first-chat-preview.app-dev.capiro.ai/api';
const coreReadSource = '6542f5b089656b6d255465edd464d06c2a0b408f';
// Reviewed roster source only. The template keeps this pair undeployable until
// the composed Core image and serving RELEASE_SHA are independently qualified.
const qualifiedCoreRosterSource = '50475125275853299798fc40f8cb119f0b865464';
const coreRosterPreviewOrigin = 'https://core-roster-preview.capiro.ai';
const coreRosterPreviewApi = `${coreRosterPreviewOrigin}/api`;
const coreBootstrapSource = 'c64f0005cf14d69683aabafa11def4964d766832';
// This pair qualifies image bytes only. Meri serving and later source remain separate gates.
const meriImageSource = '176a8811a9b05d8613282e70bd7a57ebd75ca201';
const meriImageDigest = 'sha256:5534edfe5805eec7a5d0bce66b2c85765fe2f957173ddd3ce2726bed67e322d8';
const meriConsumerVersion = '0.1.10';
const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const nonMeriHosts = new Set([
  'capiro.ai', 'app.capiro.ai', 'os.capiro.ai', 'api.capiro.ai',
  'portfolio-preview.app.capiro.ai', 'first-chat-preview.app-dev.capiro.ai',
  'core-roster-preview.capiro.ai',
]);
const fixedParameters = Object.freeze({
  CoreApiBaseUrl: `${origin}/api`,
  StrategyApiBaseUrl: '',
  WorkspaceApiBaseUrl: `${origin}/workspace-api`,
  IntelligenceApiBaseUrl: `${origin}/intel-api`,
  ExistingAppUrl: origin,
  TrackerBackend: 'intelligence',
});
const meriOriginPattern = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const optionalBindings = [
  'previewReadEnabled', 'firstChatBootstrapEnabled', 'firstChatClientId',
  'qualifiedCoreClientRosterApiBaseUrl',
  'meriApiBaseUrl', 'meriConversationWorkflowEnabled', 'meriConversationRoutesEnabled',
  'meriRuntimeSource', 'meriRuntimeImageDigest',
];
const patterns = Object.freeze({
  clerkIssuer: /^https:\/\/clerk\.app\.capiro\.ai$/,
  clerkApplicationId: /^app_[A-Za-z0-9]{8,80}$/,
  clerkPublishableKeyArn: /^arn:aws:secretsmanager:us-east-1:967807252336:secret:\/capiro\/dev\/clerk\/publishable-key-rAfesC$/,
  clerkSecretArn: /^arn:aws:secretsmanager:us-east-1:967807252336:secret:\/capiro\/dev\/clerk\/secret-key-FT67tM$/,
  clerkKeyArn: /^arn:aws:kms:us-east-1:967807252336:key\/f47b4c53-b9c0-4d91-ad57-4d882f87767e$/,
});

function closedRecord(input, keys, code, optionalKeys = []) {
  const ownKeys = input && typeof input === 'object' ? Reflect.ownKeys(input) : [];
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.getPrototypeOf(input) !== Object.prototype
      || keys.some(key => !Object.hasOwn(input, key))
      || ownKeys.some(key => typeof key !== 'string' || (!keys.includes(key) && !optionalKeys.includes(key)))
      || ownKeys.some(key => !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key), 'value'))) {
    throw Error(code);
  }
}

function readMeriConfiguration(bindings) {
  const baseUrl = Object.hasOwn(bindings, 'meriApiBaseUrl') ? bindings.meriApiBaseUrl : '';
  const enabled = Object.hasOwn(bindings, 'meriConversationWorkflowEnabled')
    ? bindings.meriConversationWorkflowEnabled : false;
  if (typeof baseUrl !== 'string' || baseUrl.length > 512
      || (baseUrl !== '' && !meriOriginPattern.test(baseUrl))) throw Error('PREVIEW_MERI_ORIGIN_INVALID');
  if (baseUrl) {
    try {
      const url = new URL(baseUrl);
      if (url.origin !== baseUrl || nonMeriHosts.has(url.hostname)) throw Error();
    } catch { throw Error('PREVIEW_MERI_ORIGIN_INVALID'); }
  }
  if (typeof enabled !== 'boolean') throw Error('PREVIEW_MERI_FLAG_INVALID');
  if (enabled && !baseUrl) throw Error('PREVIEW_MERI_ORIGIN_REQUIRED');
  const routesEnabled = Object.hasOwn(bindings, 'meriConversationRoutesEnabled')
    ? bindings.meriConversationRoutesEnabled : false;
  if (typeof routesEnabled !== 'boolean' || routesEnabled !== enabled)
    throw Error('PREVIEW_MERI_ROUTE_FLAG_INVALID');
  const runtimeSource = Object.hasOwn(bindings, 'meriRuntimeSource')
    ? bindings.meriRuntimeSource : '';
  const runtimeDigest = Object.hasOwn(bindings, 'meriRuntimeImageDigest')
    ? bindings.meriRuntimeImageDigest : '';
  if (typeof runtimeSource !== 'string' || typeof runtimeDigest !== 'string')
    throw Error('PREVIEW_MERI_IMAGE_UNQUALIFIED');
  if (routesEnabled) {
    if (runtimeSource !== meriImageSource || runtimeDigest !== meriImageDigest)
      throw Error('PREVIEW_MERI_IMAGE_UNQUALIFIED');
  } else if (runtimeSource !== '' || runtimeDigest !== '') {
    throw Error('PREVIEW_MERI_IMAGE_WITHOUT_ROUTE');
  }
  return { baseUrl, enabled, routesEnabled, runtimeSource, runtimeDigest };
}

function readFirstChatConfiguration(bindings, meri) {
  const readEnabled = Object.hasOwn(bindings, 'previewReadEnabled')
    ? bindings.previewReadEnabled : false;
  const bootstrapEnabled = Object.hasOwn(bindings, 'firstChatBootstrapEnabled')
    ? bindings.firstChatBootstrapEnabled : false;
  const clientId = Object.hasOwn(bindings, 'firstChatClientId')
    ? bindings.firstChatClientId : '';
  if (typeof readEnabled !== 'boolean' || typeof bootstrapEnabled !== 'boolean')
    throw Error('PREVIEW_FIRST_CHAT_FLAG_INVALID');
  if (typeof clientId !== 'string') throw Error('PREVIEW_FIRST_CHAT_CLIENT_INVALID');
  if (bootstrapEnabled) {
    if (!readEnabled || !meri.routesEnabled) throw Error('PREVIEW_FIRST_CHAT_DEPENDENCY_HELD');
    if (typeof clientId !== 'string' || !canonicalUuid.test(clientId))
      throw Error('PREVIEW_FIRST_CHAT_CLIENT_INVALID');
  } else if (clientId !== '') {
    throw Error('PREVIEW_FIRST_CHAT_CLIENT_WITHOUT_BOOTSTRAP');
  }
  return { readEnabled, bootstrapEnabled, clientId };
}

function readQualifiedCoreRosterApi(bindings, firstChat, meri) {
  const target = Object.hasOwn(bindings, 'qualifiedCoreClientRosterApiBaseUrl')
    ? bindings.qualifiedCoreClientRosterApiBaseUrl : '';
  if (typeof target !== 'string' || (target !== '' && target !== coreRosterPreviewApi))
    throw Error('PREVIEW_CORE_ROSTER_ORIGIN_INVALID');
  if (!target) return '';
  if (meri.baseUrl === coreRosterPreviewOrigin) throw Error('PREVIEW_CORE_ROSTER_ORIGIN_INVALID');
  // Selected-client verification and Meri keep the original reviewed read pair.
  if (!firstChat.readEnabled) throw Error('PREVIEW_CORE_ROSTER_DEPENDENCY_HELD');
  return target;
}

/** Public metadata only. This does not read credentials or establish application authority. */
export function renderPreviewConfiguration(bindings) {
  closedRecord(bindings, Object.keys(patterns), 'PREVIEW_BINDINGS_SHAPE', optionalBindings);
  for (const [name, pattern] of Object.entries(patterns)) {
    const value = bindings[name];
    if (typeof value !== 'string' || value.length > 1024
        || /[\u0000-\u0020\u007f]/.test(value) || !pattern.test(value)) {
      throw Error(`PREVIEW_BINDING_INVALID:${name}`);
    }
  }
  const meri = readMeriConfiguration(bindings);
  const firstChat = readFirstChatConfiguration(bindings, meri);
  const qualifiedCoreRosterApi = readQualifiedCoreRosterApi(bindings, firstChat, meri);
  const values = {
    ...fixedParameters,
    CapiroRequestOrigin: origin,
    CapiroPreviewReadOnly: 'true',
    CapiroPreviewReadBackendSource: firstChat.readEnabled ? coreReadSource : '',
    CapiroPreviewReadApiBaseUrl: firstChat.readEnabled ? corePreviewApi : '',
    CapiroPreviewClientRosterBackendSource: qualifiedCoreRosterApi ? qualifiedCoreRosterSource : '',
    CapiroPreviewClientRosterApiBaseUrl: qualifiedCoreRosterApi,
    MeriFirstChatBootstrapEnabled: String(firstChat.bootstrapEnabled),
    MeriFirstChatClientId: firstChat.clientId,
    CapiroPreviewFirstChatBackendSource: firstChat.bootstrapEnabled ? coreBootstrapSource : '',
    CapiroPreviewFirstChatApiBaseUrl: firstChat.bootstrapEnabled ? corePreviewApi : '',
    MeriApiBaseUrl: meri.baseUrl,
    MeriConversationWorkflowEnabled: String(meri.enabled),
    CapiroPreviewMeriConversationRoutesEnabled: String(meri.routesEnabled),
    CapiroPreviewMeriRuntimeOrigin: meri.routesEnabled ? meri.baseUrl : '',
    CapiroPreviewMeriRuntimeSource: meri.runtimeSource,
    CapiroPreviewMeriRuntimeImageDigest: meri.runtimeDigest,
    CapiroPreviewMeriContractPackageVersion: meri.routesEnabled ? meriConsumerVersion : '',
    ClerkPublishableKeySecretArn: bindings.clerkPublishableKeyArn,
    ClerkSecretKeySecretArn: bindings.clerkSecretArn,
    ClerkKmsKeyArn: bindings.clerkKeyArn,
  };
  return {
    schemaVersion: 1,
    status: 'configuration-proposal',
    profile: 'portfolio-preview',
    backendSource: '0f1e663d5c23ed3f6f02bde801da8f5bb3f8ccba',
    parameters: Object.entries(values).map(([ParameterKey, ParameterValue]) => ({ ParameterKey, ParameterValue })),
    environment: {
      CORE_API_BASE_URL: fixedParameters.CoreApiBaseUrl,
      STRATEGY_API_BASE_URL: '',
      WORKSPACE_API_BASE_URL: fixedParameters.WorkspaceApiBaseUrl,
      INTELLIGENCE_API_BASE_URL: fixedParameters.IntelligenceApiBaseUrl,
      CAPIRO_EXISTING_APP_URL: origin,
      TRACKER_BACKEND: 'intelligence',
      ONBOARD_API_BASE_URL: '',
      MERI_API_BASE_URL: meri.baseUrl,
      MERI_CONVERSATION_WORKFLOW_ENABLED: String(meri.enabled),
      MERI_ACTION_WORKFLOW_ENABLED: 'false',
      MERI_DOCUMENT_WORKFLOW_ENABLED: 'false',
      MERI_DOCUMENT_OPERATION: '',
      CAPIRO_REQUEST_ORIGIN: origin,
      CAPIRO_PREVIEW_READ_ONLY: 'true',
      CAPIRO_PREVIEW_READ_BACKEND_SOURCE: values.CapiroPreviewReadBackendSource,
      CAPIRO_PREVIEW_READ_API_BASE_URL: values.CapiroPreviewReadApiBaseUrl,
      CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE: values.CapiroPreviewClientRosterBackendSource,
      CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL: values.CapiroPreviewClientRosterApiBaseUrl,
      MERI_FIRST_CHAT_BOOTSTRAP_ENABLED: values.MeriFirstChatBootstrapEnabled,
      MERI_FIRST_CHAT_CLIENT_ID: values.MeriFirstChatClientId,
      CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE: values.CapiroPreviewFirstChatBackendSource,
      CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL: values.CapiroPreviewFirstChatApiBaseUrl,
      CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED: values.CapiroPreviewMeriConversationRoutesEnabled,
      CAPIRO_PREVIEW_MERI_RUNTIME_ORIGIN: values.CapiroPreviewMeriRuntimeOrigin,
      CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: values.CapiroPreviewMeriRuntimeSource,
      CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST: values.CapiroPreviewMeriRuntimeImageDigest,
      CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION: values.CapiroPreviewMeriContractPackageVersion,
    },
    secretReferences: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: bindings.clerkPublishableKeyArn,
      CLERK_SECRET_KEY: bindings.clerkSecretArn,
    },
    clerkMetadata: {
      issuer: bindings.clerkIssuer,
      applicationId: bindings.clerkApplicationId,
      requiredEnvironment: 'configured-core-issuer-unverified',
    },
    holds: ['strategy', 'onboard', 'meri'],
    activationStatus: meri.enabled
      ? 'unverified; Meri service and model readiness not established; not a complete apply request'
      : 'unverified; all backend services held at zero; not a complete apply request',
  };
}

/** Refuse inherited values, omissions and overrides before a shipping owner combines resource parameters. */
export function validatePreviewParameters(parameters, bindings) {
  const proposal = renderPreviewConfiguration(bindings);
  const expected = new Map(proposal.parameters.map(p => [p.ParameterKey, p.ParameterValue]));
  if (!Array.isArray(parameters) || parameters.length !== expected.size) throw Error('PREVIEW_PARAMETERS_SHAPE');
  const seen = new Set();
  for (const item of parameters) {
    closedRecord(item, ['ParameterKey', 'ParameterValue'], 'PREVIEW_PARAMETER_SHAPE');
    if (!expected.has(item.ParameterKey) || seen.has(item.ParameterKey)
        || item.ParameterValue !== expected.get(item.ParameterKey)) throw Error('PREVIEW_PARAMETER_MISMATCH');
    seen.add(item.ParameterKey);
  }
}

function readMetadata(path) {
  if (statSync(path).size > 32768) throw Error('PREVIEW_METADATA_TOO_LARGE');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main(args) {
  const usage = 'Usage: node apps/web/deployment/portfolio/preview-config.mjs --bindings FILE [--parameters FILE]\nLocal public-metadata validation only; JSON proposal on stdout. No environment fallback, network, AWS or secret reads.\nExit 0: proposal/help; exit 1: missing or invalid metadata; exit 2: invalid usage.';
  if (args.length === 1 && args[0] === '--help') { console.log(usage); return; }
  if (![2, 4].includes(args.length) || args[0] !== '--bindings' || !args[1]
      || args[1].startsWith('--') || (args.length === 4 && (args[2] !== '--parameters' || !args[3] || args[3].startsWith('--')))) {
    console.error(usage); process.exitCode = 2; return;
  }
  try {
    const bindings = readMetadata(args[1]);
    const proposal = renderPreviewConfiguration(bindings);
    if (args.length === 4) validatePreviewParameters(readMetadata(args[3]), bindings);
    console.log(JSON.stringify(proposal, null, 2));
  } catch (error) {
    const message = error instanceof Error && /^PREVIEW_[A-Z_]+(?::[A-Za-z]+)?$/.test(error.message)
      ? error.message : 'PREVIEW_METADATA_UNAVAILABLE_OR_INVALID';
    console.error(message); process.exitCode = 1;
  }
}

// Native Node24 entry detection also handles worktree and executable symlinks.
if (import.meta.main) main(process.argv.slice(2));
