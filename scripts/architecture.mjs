import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findCycles, inspectDependencies, isPortfolioSource, publicExports } from './architecture/dependencies.mjs';
import { assessSizeFindings, reviewedSizeFindings } from './architecture/reviews.mjs';
import { reviewSizeSignals } from './architecture-reviews.mjs';
import { scanModule, sizeMessage, sourceExtension } from './architecture/scan.mjs';

const slash = value => value.split(path.sep).join('/');

/** Inspect authored application sources, never execute application/vendor code. */
export function inspectSources(files, approvedExports = publicExports, reviewOptions = {}) {
  const errors = [], findings = [], graph = new Map();
  for (const [name, source] of files) {
    if (!sourceExtension.test(name) && !name.endsWith('.css')) continue;
    const module = scanModule(name, source);
    const dependencies = inspectDependencies(name, module, files, approvedExports);
    errors.push(...dependencies.errors);
    findings.push(...module.sizeFindings);
    if (isPortfolioSource(name)) {
      for (const line of module.anyLines) errors.push(`${name}:${line}: untyped any`);
      for (const line of module.remoteOriginLines) errors.push(`${name}:${line}: hardcoded remote origin`);
    }
    graph.set(name, dependencies.edges);
  }
  errors.push(...findCycles(graph));
  const { moduleRecords = [], evidenceExists = () => false, ...portfolioOptions } = reviewOptions;
  const legacySignal = finding => finding.kind === 'file'
    ? `${finding.file}: ${finding.nonblank} nonblank lines require review`
    : `${finding.file}: function over80 nonblank lines requires review`;
  const moduleReview = reviewSizeSignals(files, findings.map(legacySignal), moduleRecords, evidenceExists);
  const accepted = new Set(moduleReview.reviewed);
  const importedReviews = findings.filter(finding => accepted.has(legacySignal(finding))).map(finding => ({
    ...finding, reason: moduleRecords.find(record => record.path === finding.file).rationale,
    reviewedBy: moduleRecords.find(record => record.path === finding.file).reviewer,
    reviewedOn: moduleRecords.find(record => record.path === finding.file).reviewedAt,
  }));
  const { reviewErrors, ...review } = assessSizeFindings(findings, {
    ...portfolioOptions, reviews: [...(portfolioOptions.reviews ?? []), ...importedReviews],
  });
  errors.push(...moduleReview.errors);
  errors.push(...reviewErrors);
  const routes = [...files.keys()].filter(name => /\/app\/(?:.*\/)?(?:page|layout|route)\.[jt]sx?$/.test(name)).sort();
  return { errors, signals: findings.map(finding => finding.file.endsWith('.css') ? legacySignal(finding) : sizeMessage(finding)), ...review, routes, graph: Object.fromEntries(graph) };
}

export function discover(root) {
  const files = new Map();
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Source symlink refused: ${absolute}`);
      if (entry.isDirectory()) walk(absolute);
      else if (sourceExtension.test(entry.name) || /\.(css|json)$/.test(entry.name)) files.set(slash(path.relative(root, absolute)), readFileSync(absolute, 'utf8'));
    }
  }
  walk(path.join(root, 'apps/web/src'));
  walk(path.join(root, 'packages/meri-client/src'));
  return files;
}

function main() {
  const usage = 'Usage: node scripts/architecture.mjs\nExit 0: no violations or new/changed unreviewed size findings; exit 1: boundary/review failure; exit 2: setup failure.\nAll size signals are reported. Exact pinned transfer matches remain inherited and unreviewed.';
  if (process.argv.length === 3 && process.argv[2] === '--help') { console.log(usage); return; }
  if (process.argv.length !== 2) { console.error(usage); process.exitCode = 2; return; }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const baseline = JSON.parse(readFileSync(new URL('./architecture/portfolio-transfer-size-baseline.json', import.meta.url), 'utf8'));
  const result = inspectSources(discover(root), publicExports, {
    baseline, reviews: reviewedSizeFindings,
    moduleRecords: JSON.parse(readFileSync(path.join(root, 'docs/architecture-size-reviews.json'), 'utf8')),
    evidenceExists: reference => {
      const [name, anchor] = reference.split('#');
      if (!name.startsWith('docs/') || name.includes('..') || !name.endsWith('.md')) return false;
      try { const evidence = readFileSync(path.join(root, name), 'utf8'); return !anchor || evidence.includes(`id="${anchor}"`); }
      catch { return false; }
    },
  });
  if (!result.routes.includes('apps/web/src/app/page.tsx') || !result.routes.includes('apps/web/src/app/layout.tsx')) result.errors.push('Missing canonical Next entrypoints');
  const ui = JSON.parse(readFileSync(path.join(root, 'packages/ui/package.json'), 'utf8'));
  for (const name of ['button', 'prompt-input', 'dialog']) if (!ui.exports?.[`./${name}`]) result.errors.push(`Missing canonical @capiro/ui/${name} export`);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length || result.sizeSummary.blocking) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : 'Architecture setup failure'); process.exitCode = 2; }
}
