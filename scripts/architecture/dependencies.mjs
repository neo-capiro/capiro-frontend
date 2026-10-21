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
const previewOwner = `${appSource}shared/preview/`;
const previewReadProxy = `${previewOwner}read-proxy.server.ts`;
const previewReadConfig = `${previewOwner}read-config.server.ts`;
const previewUiPages = new Set([
  `${appSource}app/(portfolio)/(product)/portfolio/page.tsx`,
  `${appSource}app/modules/page.tsx`,
]);
const objectiveSnapshotOwner = `${appSource}shared/capiro/operations/objective-workspace-receiving.ts`;
function approvedSnapshotImport(file, entry) {
  return file === objectiveSnapshotOwner && entry.kind === 'named' && entry.names.length === 1 && entry.names[0] === 'canonicalWorkspaceSnapshot';
}

function approvedPricingImport(file, module, entry) {
  return file === pricingOwner && entry.specifier === '@capiro/shared'
    && entry.kind === 'named' && entry.names.length === 2
    && ['PRICE_LOCK_COPY', 'PRICE_CHANGE_COPY'].every(name => entry.names.includes(name))
    && module.imports.some(item => item.specifier === 'server-only' && item.kind === 'side-effect')
    && !module.directives.includes('use client');
}

export const publicExports = new Set([
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
  '@capiro/meri-contracts/conversation-input',
  '@capiro/meri-contracts/conversation-initial-input',
  '@capiro/meri-client/conversation',
  '@capiro/meri-client/task-commands',
  '@capiro/meri-client/intents',
  '@capiro/meri-contracts/document-application', '@capiro/meri-contracts/document-application/schema',
  '@capiro/meri-contracts/metadata', '@capiro/meri-ui-stream/protocol',
  '@capiro/shared/newsletter', '@capiro/shared/newsletter-render',
]);

export const serverAdapters = new Map([
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

function edgeViolation(from, to, entry) {
  if (to.startsWith(previewOwner) && !from.startsWith(previewOwner)
      && !(previewUiPages.has(from) && to === previewReadConfig
        && entry.kind === 'named' && entry.names.length === 1
        && entry.names[0] === 'isQualifiedCorePreviewReadEnabled')
      && !(to === previewPolicy && from === `${appSource}proxy.ts`)
      && !serverAdapters.get(from)?.has(to)) return `${from}: preview policy and receiving code are allocated only to reviewed backend server entries`;
  if (to === pricingOwner && from !== pricingEntry) return `${from}: public pricing projection is allocated only to the Onboard server entry`;
  if (!owner(from) || owner(from) !== owner(to)) return `${from}: private cross-owner import ${to}; use an approved public package export`;
  if (from.startsWith(`${appSource}shared/`) && /^apps\/web\/src\/(?:features|app)\//.test(to)) return `${from}: foundations import ${to}`;
  if (feature(from) && to.startsWith(`${appSource}app/`)) return `${from}: feature imports app composition ${to}`;
  if (feature(from) && feature(to) && feature(from) !== feature(to)) return `${from}: private cross-feature import ${to}`;
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
    if (specifier === '@capiro/shared' ? !(approvedPricingImport(file, module, entry) || approvedSnapshotImport(file, entry)) : specifier.startsWith('@capiro/') && !approvedExports.has(specifier)) errors.push(`${file}: non-public package import ${specifier}`);
    const { local, resolved } = resolveImport(file, specifier, files);
    if (serverAdapters.has(file) && !serverAdapters.get(file).has(resolved ?? specifier)) errors.push(`${file}: server adapter dependency is not allocated: ${specifier}`);
    if (!local) continue;
    if (!resolved) { errors.push(`${file}: unresolved or outside-app import ${specifier}`); continue; }
    const violation = edgeViolation(file, resolved, entry);
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
