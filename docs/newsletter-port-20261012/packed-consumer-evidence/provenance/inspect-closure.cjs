// Parses candidate files as data. Never imports/executes candidate package code.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('/workspace/capiro-remaining/node_modules/typescript');
const root = __dirname;
const pkg = path.join(root, 'unpacked/package');
const metadata = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8'));
const queue = ['./newsletter', './newsletter-render'].map(key => metadata.exports[key].default.slice(2));
const seen = new Set();
const runtime = [];
const external = [];
const dynamic = [];
const globals = [];
const localShadows = [];
const forbidden = new Set(['process', 'Buffer', 'fetch', 'XMLHttpRequest', 'WebSocket', 'global', '__dirname', '__filename', 'eval']);
function scan(relative, declaration) {
  const text = fs.readFileSync(path.join(pkg, relative), 'utf8');
  const tree = ts.createSourceFile(relative, text, ts.ScriptTarget.Latest, true, declaration ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  if (tree.parseDiagnostics.length) throw new Error(`Parse failed: ${relative}`);
  const references = [];
  const exports = [];
  function localBinding(identifier) {
    for (let owner = identifier.parent; owner; owner = owner.parent) {
      if (ts.isBlock(owner) || ts.isSourceFile(owner)) {
        for (const statement of owner.statements) {
          if (!ts.isVariableStatement(statement)) continue;
          const match = statement.declarationList.declarations.find(declaration => ts.isIdentifier(declaration.name) && declaration.name.text === identifier.text);
          if (match) return tree.getLineAndCharacterOfPosition(match.getStart()).line + 1;
        }
      }
      if (ts.isFunctionLike(owner)) {
        const match = owner.parameters.find(parameter => ts.isIdentifier(parameter.name) && parameter.name.text === identifier.text);
        if (match) return tree.getLineAndCharacterOfPosition(match.getStart()).line + 1;
      }
    }
    return null;
  }
  function record(value) {
    if (typeof value !== 'string') return dynamic.push({file: relative, reason: 'non-literal module reference'});
    references.push(value);
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) record(ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null);
    }
    if (ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text === 'require') || node.expression.kind === ts.SyntaxKind.ImportKeyword)) {
      const argument = node.arguments[0];
      record(argument && ts.isStringLiteral(argument) ? argument.text : null);
    }
    if (!declaration && ts.isIdentifier(node) && forbidden.has(node.text)) {
      const localDeclarationLine = localBinding(node);
      const record = {file: relative, identifier: node.text, line: tree.getLineAndCharacterOfPosition(node.getStart()).line + 1};
      if (localDeclarationLine) localShadows.push({...record, localDeclarationLine});
      else globals.push(record);
    }
    if (declaration && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) && node.name && ts.isIdentifier(node.name)) exports.push({name: node.name.text, kind: ts.SyntaxKind[node.kind]});
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return {file: relative, references: [...new Set(references)], exports};
}
while (queue.length) {
  const relative = queue.shift();
  if (seen.has(relative)) continue;
  seen.add(relative);
  const result = scan(relative, false);
  runtime.push(result);
  for (const reference of result.references) {
    if (!reference.startsWith('.')) external.push({file: relative, reference});
    else {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), reference));
      if (!resolved.startsWith('dist/') || !fs.existsSync(path.join(pkg, resolved))) throw new Error(`Invalid reference ${resolved}`);
      queue.push(resolved);
    }
  }
}
function allFiles(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? allFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const declarations = allFiles(path.join(pkg, 'dist')).filter(file => file.endsWith('.d.ts')).map(file => scan(path.relative(pkg, file), true));
const expected = ['newsletter', 'newsletter-render', 'newsletter-fonts', 'newsletter-fonts.catalog', 'newsletter-social-share'].map(name => `dist/${name}.js`).sort();
const actual = [...seen].sort();
if (JSON.stringify(actual) !== JSON.stringify(expected) || external.length || dynamic.length || globals.length || declarations.length !== 36) throw new Error(JSON.stringify({actual, external, dynamic, globals}));
const result = {status: 'PASS_STATIC_AST_ONLY', tool: {name: 'TypeScript parser', version: ts.version}, runtimeModules: actual, graph: runtime, externalImports: external, dynamicModuleReferences: dynamic, forbiddenGlobalReferences: globals, localShadows, parsedDeclarations: declarations.length, declarationExports: declarations.filter(row => ['dist/newsletter.d.ts', 'dist/newsletter-render.d.ts'].includes(row.file)), packageCodeExecuted: false, installBuildTypecheckRuntimePerformed: false};
fs.writeFileSync(path.join(root, 'BROWSER-CLOSURE-STATIC.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({status: result.status, modules: actual.length, declarations: declarations.length, external: external.length, dynamic: dynamic.length, forbiddenGlobals: globals.length}));
