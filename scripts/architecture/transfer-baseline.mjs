import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { scanModule, sourceExtension } from './scan.mjs';

export const transferCommit = '02c02d95bdf3949662b9123f425271c6491ffdab';
export const transferSourceRoot = 'apps/portfolio-web/src/';

export function transferPath(original) {
  if (!original.startsWith(transferSourceRoot)) return null;
  const suffix = original.slice(transferSourceRoot.length);
  if (suffix.startsWith('features/portfolio/')) return `apps/web/src/features/portfolio/index/${suffix.slice('features/portfolio/'.length)}`;
  if (suffix.startsWith('features/')) return `apps/web/src/features/portfolio/${suffix.slice('features/'.length)}`;
  if (suffix.startsWith('shared/')) return `apps/web/src/shared/portfolio/${suffix.slice('shared/'.length)}`;
  return `apps/web/src/${suffix}`;
}

function transferSpecifier(specifier) {
  if (specifier.startsWith('@/features/portfolio/')) return specifier.replace('@/features/portfolio/', '@/features/portfolio/index/');
  if (specifier.startsWith('@/features/')) return specifier.replace('@/features/', '@/features/portfolio/');
  if (specifier.startsWith('@/shared/')) return specifier.replace('@/shared/', '@/shared/portfolio/');
  return specifier;
}

/** Normalize only module-path changes from the agreed mechanical relocation. */
export function canonicalTransferSource(file, source) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const replacements = [];
  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      const parent = node.parent;
      const modulePath = ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node)
        || (ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword && parent.arguments[0] === node)
        || ts.isExternalModuleReference(parent)
        || (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent));
      const moved = modulePath ? transferSpecifier(node.text) : node.text;
      if (moved !== node.text) replacements.push({ start: node.getStart(ast) + 1, end: node.end - 1, text: moved });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) source = source.slice(0, replacement.start) + replacement.text + source.slice(replacement.end);
  return source;
}

/** Reproduce provenance from the immutable transfer tree, never from working code. */
export function createTransferBaseline(root) {
  const originals = execFileSync('git', ['ls-tree', '-r', '--name-only', transferCommit, '--', transferSourceRoot], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(file => sourceExtension.test(file));
  const findings = [];
  for (const originalFile of originals) {
    const source = execFileSync('git', ['show', `${transferCommit}:${originalFile}`], { cwd: root, encoding: 'utf8', maxBuffer: 10_000_000 });
    const file = transferPath(originalFile);
    for (const finding of scanModule(file, canonicalTransferSource(originalFile, source)).sizeFindings) findings.push({ ...finding, originalFile });
  }
  return {
    version: 1,
    commit: transferCommit,
    sourceRoot: transferSourceRoot,
    purpose: 'Exact unchanged transferred size findings remain visible and unreviewed. This inventory is provenance, not a cohesion approval.',
    findings,
  };
}

function main() {
  const usage = 'Usage: node scripts/architecture/transfer-baseline.mjs\nPrint the pinned read-only transfer inventory as JSON.\nExit 0: success; exit 2: arguments or pinned Git tree unavailable.';
  if (process.argv.length === 3 && process.argv[2] === '--help') { console.log(usage); return; }
  if (process.argv.length !== 2) { console.error(usage); process.exitCode = 2; return; }
  console.log(JSON.stringify(createTransferBaseline(fileURLToPath(new URL('../../', import.meta.url))), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : 'Transfer baseline setup failure'); process.exitCode = 2; }
}
