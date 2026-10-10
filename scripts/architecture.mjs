import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const extensions = ['', '.ts', '.tsx', '.mjs', '.mts', '.css', '.json', '/index.ts', '/index.tsx'];
const slash = value => value.split(path.sep).join('/');

/** Inspect authored application sources, never execute application/vendor code. */
export function inspectSources(files, publicExports = new Set(['@capiro/ui/button', '@capiro/ui/prompt-input'])) {
  const errors = [], signals = [], graph = new Map();
  const feature = name => name.match(/\/features\/([^/]+)\//)?.[1];
  for (const [name, source] of files) {
    if (!/\.(ts|tsx|mjs|mts)$/.test(name)) continue;
    if (/\/features\/(portfolio|modules|settings)\//.test(name)) errors.push(`${name}: future feature implementation not allocated`);
    const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
    const edges = [];
    const nonblank = source.split(/\r?\n/).filter(line => line.trim()).length;
    if (nonblank > 400) signals.push(`${name}: ${nonblank} nonblank lines require review`);
    const imports = [];
    const visit = node => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) imports.push(node.moduleSpecifier);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) imports.push(node.arguments[0]);
      if (ts.isFunctionLike(node) && node.body) {
        const count = source.slice(node.body.pos, node.body.end).split(/\r?\n/).filter(line => line.trim()).length;
        if (count > 80) signals.push(`${name}: function over80 nonblank lines requires review`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    for (const node of imports) {
      if (!node || !ts.isStringLiteralLike(node)) { errors.push(`${name}: computed import forbidden`); continue; }
      const specifier = node.text;
      if (/meri-greenfield|capirov2|^https?:|^node:/.test(specifier)) errors.push(`${name}: restricted runtime/repository import ${specifier}`);
      if (specifier.startsWith('@capiro/') && !publicExports.has(specifier)) errors.push(`${name}: non-public package import ${specifier}`);
      if (!specifier.startsWith('.')) continue;
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(name), specifier));
      const resolved = extensions.map(extension => base + extension).find(candidate => files.has(candidate));
      if (!resolved) { errors.push(`${name}: unresolved or outside-app import ${specifier}`); continue; }
      if (feature(name) && feature(resolved) && feature(name) !== feature(resolved)) errors.push(`${name}: private cross-feature import ${resolved}`);
      edges.push(resolved);
    }
    graph.set(name, edges);
  }
  const active = new Set(), done = new Set();
  function visit(name, trail) {
    if (active.has(name)) { errors.push(`Import cycle: ${[...trail, name].join(' -> ')}`); return; }
    if (done.has(name)) return;
    active.add(name);
    for (const next of graph.get(name) ?? []) visit(next, [...trail, name]);
    active.delete(name); done.add(name);
  }
  for (const name of graph.keys()) visit(name, []);
  const routes = [...files.keys()].filter(name => /\/app\/(?:.*\/)?(?:page|layout|route)\.(ts|tsx)$/.test(name)).sort();
  if (routes.some(name => /\/route\./.test(name))) errors.push('No backend route handler is allocated');
  return { errors, signals, routes, graph: Object.fromEntries(graph) };
}

export function discover(root) {
  const files = new Map();
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Source symlink refused: ${absolute}`);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(ts|tsx|mjs|mts|css|json)$/.test(entry.name)) files.set(slash(path.relative(root, absolute)), readFileSync(absolute, 'utf8'));
    }
  }
  walk(path.join(root, 'apps/web/src'));
  return files;
}

function main() {
  if (process.argv.length === 3 && process.argv[2] === '--help') { console.log('Usage: node scripts/architecture.mjs\nExit0: no violations; exit1: boundary/review signal; exit2: setup failure.'); return; }
  if (process.argv.length !== 2) { console.error('Usage: node scripts/architecture.mjs\nExit0: no violations; exit1: boundary/review signal; exit2: setup failure.'); process.exitCode = 2; return; }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = inspectSources(discover(root));
  if (!result.routes.includes('apps/web/src/app/page.tsx') || !result.routes.includes('apps/web/src/app/layout.tsx')) result.errors.push('Missing canonical Next entrypoints');
  const ui = JSON.parse(readFileSync(path.join(root, 'packages/ui/package.json'), 'utf8'));
  for (const name of ['button', 'prompt-input']) if (!ui.exports?.[`./${name}`]) result.errors.push(`Missing canonical @capiro/ui/${name} export`);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length || result.signals.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : 'Architecture setup failure'); process.exitCode = 2; }
}
