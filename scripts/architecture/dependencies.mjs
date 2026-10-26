import path from 'node:path';

const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.cts', '.css', '.json', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
const appSource = 'apps/web/src/';
const owner = name => name.match(/^(?:apps|packages)\/[^/]+(?=\/)/)?.[0];
const feature = name => name.match(/\/features\/([^/]+)\//)?.[1];
const portfolioArea = name => name.match(/\/features\/portfolio\/([^/]+)\//)?.[1] ?? '<portfolio>';
const publicEntry = name => /\/(?:public|[^/]+-public)\.ts$/.test(name);
const pricingOwner = `${appSource}shared/capiro/onboard-pricing.server.ts`;
const pricingEntry = `${appSource}app/_onboard/OnboardEntry.tsx`;
const previewPolicy = `${appSource}shared/preview/backend-policy.server.ts`;
const meriCapabilityReader = `${appSource}shared/meri-resources/capabilities.server.ts`;
const coreSessionAuthentication = `${appSource}shared/preview/core-session-authentication.ts`;
const coreSessionReaders = new Set([
  `${appSource}shared/capiro/gateway.ts`,
  `${appSource}shared/portfolio/api/proxy.ts`,
]);
const previewOwner = `${appSource}shared/preview/`;
const previewReadProxy = `${previewOwner}read-proxy.server.ts`;
const previewReadConfig = `${previewOwner}read-config.server.ts`;
const previewUiPages = new Set([
  `${appSource}app/(portfolio)/(product)/portfolio/page.tsx`,
  `${appSource}app/modules/page.tsx`,
]);
const previewMemoryOwnerRoute = `${previewOwner}memory-owner-route.server.ts`;
const memoryOwnerProxy = `${appSource}features/meri/memory-review/owner-review-proxy.server.ts`;
const objectiveSnapshotOwner = `${appSource}shared/capiro/operations/objective-workspace-receiving.ts`;
const clientBriefCopyOwner = `${appSource}features/portfolio/prospects/brief/client-copy/`;
const prospectActionsEntry = `${appSource}features/modules/workspace/prospect-actions-public.ts`;
const taskDestinationEntry = `${appSource}features/modules/workspace/task-destination-public.ts`;
const taskDestinationReaders = new Set([
  `${appSource}features/meri/actions/ProposalPanel.tsx`,
  `${appSource}features/meri/conversation/intents/ConversationIntents.tsx`,
  `${appSource}features/meri/task-updates/TaskUpdateProposal.tsx`,
]);
function approvedTaskDestinationImport(from, to, entry) {
  return to === taskDestinationEntry && taskDestinationReaders.has(from)
    && entry.kind === 'named' && entry.names.length === 1
    && entry.names[0] === 'workspaceTaskHref';
}
const clientBriefAuthorityImports = new Map([
  [`${clientBriefCopyOwner}authority.ts`, new Set(['verifyProspectWriter', 'ProspectWriter'])],
  [`${clientBriefCopyOwner}command.ts`, new Set(['prospectIntentScope', 'ProspectWriter'])],
  [`${clientBriefCopyOwner}ClientBriefCopy.tsx`, new Set(['ProspectWriter'])],
  [`${clientBriefCopyOwner}useClientBriefCopy.ts`, new Set(['ProspectWriter'])],
  [`${clientBriefCopyOwner}recovery.ts`, new Set(['ProspectWriter'])],
]);
function approvedClientBriefAuthorityImport(from, to, entry) {
  const allowed = clientBriefAuthorityImports.get(from);
  // The scanner marks whole-clause import type as other, retaining only its explicit named bindings.
  return to === prospectActionsEntry && allowed && ['named', 'other'].includes(entry.kind)
    && entry.names.length > 0 && entry.names.every(name => allowed.has(name));
}
const newsletterDeliveryOwner = `${appSource}features/modules/engagement/newsletter-delivery/`;
const newsletterRelationshipImports = new Map([
  [`${newsletterDeliveryOwner}delivery-api.ts`, new Set(['sendingMailboxesSchema', 'SendingMailbox'])],
  [`${newsletterDeliveryOwner}DestinationPicker.tsx`, new Set(['personSchema'])],
  ...['NewsletterDestinations.tsx', 'NewsletterPrepared.tsx', 'useNewsletterDelivery.ts'].map(file =>
    [`${newsletterDeliveryOwner}${file}`, new Set(['SendingMailbox'])]),
]);
function approvedNewsletterRelationshipImport(from, to, entry) {
  const allowed = newsletterRelationshipImports.get(from);
  return to === `${appSource}features/portfolio/relationships/public.ts` && allowed
    && ['named', 'other'].includes(entry.kind) && entry.names.length > 0
    && entry.names.every(name => allowed.has(name));
}

function approvedSnapshotImport(file, entry) {
  return (file === objectiveSnapshotOwner || file === `${clientBriefCopyOwner}command.ts`
    || file === `${appSource}features/modules/workspace/ordinary-save/ordinary-save.ts`)
    && entry.kind === 'named' && entry.names.length === 1 && entry.names[0] === 'canonicalWorkspaceSnapshot';
}

function approvedNewsletterProjectionTypeImport(file, entry) {
  // Only whole-clause import type retains named bindings with kind other.
  return file === `${appSource}shared/capiro/operations/workspace-newsletter-staging.ts`
    && entry.specifier === '@capiro/shared' && entry.kind === 'other'
    && entry.names.length === 1 && entry.names[0] === 'workspaceSavedOutreachRevisionWithinTx';
}

function approvedPricingImport(file, module, entry) {
  return file === pricingOwner && entry.specifier === '@capiro/shared'
    && entry.kind === 'named' && entry.names.length === 2
    && ['PRICE_LOCK_COPY', 'PRICE_CHANGE_COPY'].every(name => entry.names.includes(name))
    && module.imports.some(item => item.specifier === 'server-only' && item.kind === 'side-effect')
    && !module.directives.includes('use client');
}

export const publicExports = new Set([
  '@capiro/ui/cascader',
  '@capiro/ui/motion',
  '@capiro/ui/sonner',
  '@capiro/meri-client/user-preferences',
  '@capiro/ui/button', '@capiro/ui/markdown', '@capiro/ui/dialog', '@capiro/ui/tooltip', '@capiro/ui/prompt-input',
  '@capiro/ui/input', '@capiro/ui/textarea', '@capiro/ui/select', '@capiro/ui/dropdown-menu',
  '@capiro/ui/conversation', '@capiro/ui/message', '@capiro/meri-client/projection',
  '@capiro/ui/tool', '@capiro/ui/artifact', '@capiro/ui/attachments', '@capiro/ui/confirmation',
  '@capiro/ui/plan', '@capiro/ui/sources', '@capiro/ui/queue', '@capiro/ui/checkpoint', '@capiro/ui/file-tree',
  '@capiro/ui/task', '@capiro/ui/web-preview', '@capiro/ui/badge', '@capiro/ui/collapsible', '@capiro/ui/alert',
  '@capiro/ui/card', '@capiro/ui/scroll-area',
  '@capiro/meri-contracts', '@capiro/meri-contracts/browser',
  '@capiro/meri-contracts/action-application', '@capiro/meri-contracts/conversation-application',
  '@capiro/meri-contracts/conversation-history',
  '@capiro/meri-contracts/conversation-lifecycle',
  '@capiro/meri-contracts/conversation-input',
  '@capiro/meri-contracts/conversation-initial-input',
  '@capiro/meri-contracts/conversation-session',
  '@capiro/meri-contracts/conversation-sources',
  '@capiro/meri-contracts/conversation-usage',
  '@capiro/meri-contracts/document-access-application',
  '@capiro/meri-contracts/intents-application',
  '@capiro/meri-contracts/routines-application',
  '@capiro/meri-contracts/objective-generation',
  '@capiro/meri-contracts/task-command-application',
  '@capiro/meri-contracts/user-preferences-application',
  '@capiro/meri-client/conversation',
  '@capiro/meri-client/task-commands',
  '@capiro/meri-client/intents',
  '@capiro/meri-client/document-access',
  '@capiro/meri-contracts/document-application', '@capiro/meri-contracts/document-application/schema',
  '@capiro/meri-contracts/metadata', '@capiro/meri-ui-stream/protocol',
  '@capiro/shared/newsletter', '@capiro/shared/newsletter-render',
  '@capiro/shared/workspace-template-studio',
]);

export const serverAdapters = new Map([
  [`${appSource}app/api/memory/owner/candidates/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', `${appSource}features/meri/memory-review/owner-inbox-proxy.server.ts`,
  ])],
  [`${appSource}app/api/memory/owner/candidates/[id]/status/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', `${appSource}features/meri/memory-review/owner-inbox-proxy.server.ts`,
  ])],
  [`${appSource}app/api/memory/owner/candidates/[id]/decision/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', memoryOwnerProxy,
  ])],
  [`${appSource}app/api/memory/owner/candidates/[id]/version-decision/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', memoryOwnerProxy,
  ])],
  [`${appSource}app/api/memory/owner/items/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', memoryOwnerProxy,
  ])],
  [`${appSource}app/api/memory/owner/items/[id]/corrections/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', memoryOwnerProxy,
  ])],
  [`${appSource}app/api/task-commands/[operation]/route.ts`, new Set([
    previewPolicy,
    '@clerk/nextjs/server', `${appSource}shared/meri-task-commands/config.ts`, `${appSource}shared/meri-task-commands/proxy.ts`,
  ])],
  [`${appSource}app/api/conversations/intents/[operation]/route.ts`, new Set([
    previewPolicy,
    '@clerk/nextjs/server', `${appSource}shared/meri-intents/config.ts`, `${appSource}shared/meri-intents/proxy.ts`,
  ])],
  [`${appSource}app/api/settings/user/[operation]/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', `${appSource}shared/meri-user-preferences/config.ts`, `${appSource}shared/meri-user-preferences/proxy.ts`,
  ])],
  [`${appSource}app/api/settings/tenant/[operation]/route.ts`, new Set([
    previewPolicy, '@clerk/nextjs/server', `${appSource}shared/meri-tenant-settings/proxy.ts`,
  ])],
  [`${appSource}app/api/conversations/[...path]/route.ts`, new Set([
    previewPolicy,
    '@clerk/nextjs/server', `${appSource}shared/meri-conversations/config.ts`, `${appSource}shared/meri-conversations/proxy.ts`,
    `${appSource}shared/meri-conversations/history-proxy.ts`,
  ])],
  [`${appSource}app/api/documents/[operation]/route.ts`, new Set([
    previewPolicy,
    '@clerk/nextjs/server', `${appSource}shared/meri-documents/config.ts`, `${appSource}shared/meri-documents/proxy.ts`,
  ])],
  [`${appSource}app/api/documents/links/[action]/route.ts`, new Set([
    previewPolicy,
    '@clerk/nextjs/server', `${appSource}shared/meri-documents/config.ts`, `${appSource}shared/meri-documents/link-proxy.ts`,
  ])],
  [`${appSource}app/api/action-followthrough/[operation]/route.ts`, new Set([
    previewPolicy,
    '@clerk/nextjs/server', `${appSource}shared/meri-actions/config.ts`, `${appSource}shared/meri-actions/proxy.ts`, `${appSource}shared/meri-actions/connection-config.ts`,
    `${appSource}shared/meri-actions/identity-token.server.ts`,
    `${appSource}shared/meri-routines/routes.ts`,
  ])],
  [`${appSource}app/api/capiro/[operation]/route.ts`, new Set([
    previewPolicy, previewReadProxy,
    '@clerk/nextjs/server', `${appSource}shared/capiro/config.ts`, `${appSource}shared/capiro/gateway.ts`, `${previewOwner}first-chat-gateway.server.ts`,
  ])],
  [`${appSource}app/api/backend/[service]/[...path]/route.ts`, new Set([
    previewPolicy, previewReadProxy,
    '@clerk/nextjs/server', `${appSource}shared/portfolio/config/config.ts`, `${appSource}shared/portfolio/api/proxy.ts`,
  ])],
  [`${appSource}app/healthz/route.ts`, new Set()],
  [`${appSource}app/favicon.ico/route.ts`, new Set([
    `${appSource}shared/response-headers.ts`,
  ])],
]);

export const isPortfolioSource = name => /^apps\/web\/src\/(?:features\/portfolio\/|shared\/portfolio\/|app\/\(portfolio\)\/)/.test(name) || serverAdapters.has(name) || name === `${appSource}proxy.ts`;

function resolveImport(from, specifier, files) {
  const local = specifier.startsWith('.') || specifier.startsWith('@/');
  if (!local) return { local: false };
  const base = path.posix.normalize(specifier.startsWith('@/')
    ? path.posix.join(appSource, specifier.slice(2))
    : path.posix.join(path.posix.dirname(from), specifier));
  const candidates = [base, base.replace(/\.js$/, ''), base.replace(/\.mjs$/, '.mts')];
  return { local, resolved: candidates.flatMap(candidate => extensions.map(extension => candidate + extension)).find(candidate => files.has(candidate)) };
}

function edgeViolation(from, to, entry, module) {
  if (to.startsWith(previewOwner) && !from.startsWith(previewOwner)
      && !(previewUiPages.has(from) && to === previewReadConfig
        && entry.kind === 'named' && entry.names.length === 1
        && entry.names[0] === 'isQualifiedCorePreviewReadEnabled')
      && !(from === meriCapabilityReader && to === previewPolicy
        && entry.kind === 'named' && entry.names.length === 1
        && entry.names[0] === 'previewBackendRejection'
        && !module.directives.includes('use client'))
      && !(coreSessionReaders.has(from) && to === coreSessionAuthentication
        && entry.kind === 'named' && entry.names.length === 1
        && entry.names[0] === 'coreSessionAuthentication'
        && !module.directives.includes('use client'))
      && !(to === previewPolicy && from === `${appSource}proxy.ts`)
      && !(to === previewMemoryOwnerRoute && from === memoryOwnerProxy)
      && !serverAdapters.get(from)?.has(to)) return `${from}: preview policy and receiving code are allocated only to reviewed backend server entries`;
  if (to === pricingOwner && from !== pricingEntry) return `${from}: public pricing projection is allocated only to the Onboard server entry`;
  if (!owner(from) || owner(from) !== owner(to)) return `${from}: private cross-owner import ${to}; use an approved public package export`;
  if (from.startsWith(`${appSource}shared/`) && /^apps\/web\/src\/(?:features|app)\//.test(to)) return `${from}: foundations import ${to}`;
  if (feature(from) && to.startsWith(`${appSource}app/`)) return `${from}: feature imports app composition ${to}`;
  if (feature(from) && feature(to) && feature(from) !== feature(to) && !approvedClientBriefAuthorityImport(from, to, entry) && !approvedNewsletterRelationshipImport(from, to, entry) && !approvedTaskDestinationImport(from, to, entry)) return `${from}: private cross-feature import ${to}`;
  if (feature(from) === 'portfolio' && feature(to) === 'portfolio' && portfolioArea(from) !== portfolioArea(to) && !publicEntry(to)) return `${from}: private Portfolio domain import ${to}; use public.ts or a named *-public.ts entry`;
  return undefined;
}

export function inspectDependencies(file, module, files, approvedExports = publicExports) {
  const errors = [], edges = [];
  const isRoute = /\/app\/(?:.*\/)?route\.[jt]sx?$/.test(file);
  if (isRoute && !serverAdapters.has(file)) errors.push(`${file}: backend route handler is not allocated`);
  if (serverAdapters.has(file) && module.nonblank > 80) errors.push(`${file}: server adapter must stay thin (at most 80 nonblank lines)`);
  for (const entry of module.imports) {
    const { specifier } = entry;
    if (specifier === null) { errors.push(`${file}: computed import forbidden`); continue; }
    if (/meri-greenfield|capirov2|apps\/api|^https?:|^node:/.test(specifier)) errors.push(`${file}: restricted runtime/repository import ${specifier}`);
    if (specifier === '@capiro/shared' ? !(approvedPricingImport(file, module, entry) || approvedSnapshotImport(file, entry) || approvedNewsletterProjectionTypeImport(file, entry)) : specifier.startsWith('@capiro/') && !approvedExports.has(specifier)) errors.push(`${file}: non-public package import ${specifier}`);
    const { local, resolved } = resolveImport(file, specifier, files);
    if (serverAdapters.has(file) && !serverAdapters.get(file).has(resolved ?? specifier)) errors.push(`${file}: server adapter dependency is not allocated: ${specifier}`);
    if (!local) continue;
    if (!resolved) { errors.push(`${file}: unresolved or outside-app import ${specifier}`); continue; }
    const violation = edgeViolation(file, resolved, entry, module);
    if (violation) errors.push(violation);
    edges.push(resolved);
  }
  return { errors, edges };
}

export function findCycles(graph) {
  const errors = [], active = new Set(), done = new Set();
  function visit(name, trail) {
    if (active.has(name)) { errors.push(`Import cycle: ${[...trail, name].join(' -> ')}`); return; }
    if (done.has(name)) return;
    active.add(name);
    for (const next of graph.get(name) ?? []) visit(next, [...trail, name]);
    active.delete(name);
    done.add(name);
  }
  for (const name of graph.keys()) visit(name, []);
  return errors;
}
