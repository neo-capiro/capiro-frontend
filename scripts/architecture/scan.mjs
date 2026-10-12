import { createHash } from 'node:crypto';
import ts from 'typescript';

export const sourceExtension = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const nonblank = source => source.split(/\r?\n/).filter(line => line.trim()).length;
export const fingerprint = source => createHash('sha256').update(source.replaceAll('\r\n', '\n').trim()).digest('hex');

function importSpecifier(node) {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) return node.moduleSpecifier;
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) return node.moduleReference.expression;
  if (ts.isImportTypeNode(node)) return ts.isLiteralTypeNode(node.argument) ? node.argument.literal : node.argument;
  if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) return node.arguments[0] ?? node;
  return undefined;
}

function functionName(node, ast) {
  if (node.name) return node.name.getText(ast);
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if ((ts.isVariableDeclaration(node.parent) || ts.isPropertyAssignment(node.parent) || ts.isPropertyDeclaration(node.parent)) && node.parent.name) return node.parent.name.getText(ast);
  return '<anonymous>';
}

function remoteOrigin(text) {
  if (!/^https?:\/\//.test(text)) return false;
  try {
    const url = new URL(text);
    return !['localhost', '127.0.0.1'].includes(url.hostname) || Boolean(url.username || url.password);
  } catch {
    return true;
  }
}

/** Parse source only. No application imports, configuration or runtime is executed. */
export function scanModule(file, source) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports = [], anyLines = [], remoteOriginLines = [], sizeFindings = [];
  const occurrences = new Map();
  const count = nonblank(source);
  if (count > 400) sizeFindings.push({ file, kind: 'file', symbol: '<module>', line: 1, nonblank: count, fingerprint: fingerprint(source) });
  function visit(node, ancestors = []) {
    const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
    const specifier = importSpecifier(node);
    if (specifier) imports.push({ specifier: ts.isStringLiteralLike(specifier) ? specifier.text : null, line });
    if (node.kind === ts.SyntaxKind.AnyKeyword) anyLines.push(line);
    if (ts.isStringLiteralLike(node) && remoteOrigin(node.text)) remoteOriginLines.push(line);
    // A literal template authority is just as fixed as a quoted URL. A bare
    // scheme such as `https://${userInput}` does not hardcode an origin.
    if (ts.isTemplateHead(node) && /^https?:\/\/[^/?#]+/.test(node.text) && remoteOrigin(node.text)) remoteOriginLines.push(line);
    let scope = ancestors;
    if (ts.isFunctionLike(node) && node.body) {
      const label = [...ancestors, functionName(node, ast)].join(' > ');
      const occurrence = (occurrences.get(label) ?? 0) + 1;
      occurrences.set(label, occurrence);
      const symbol = occurrence === 1 ? label : `${label} #${occurrence}`;
      const lines = nonblank(source.slice(node.body.pos, node.body.end));
      if (lines > 80) sizeFindings.push({ file, kind: 'function', symbol, line, nonblank: lines, fingerprint: fingerprint(node.getText(ast)) });
      scope = [...ancestors, functionName(node, ast)];
    }
    ts.forEachChild(node, child => visit(child, scope));
  }
  visit(ast);
  return { imports, anyLines, remoteOriginLines, sizeFindings, nonblank: count };
}

export function sizeMessage(finding) {
  const subject = finding.kind === 'file' ? 'file' : `function ${finding.symbol}`;
  return `${finding.file}:${finding.line}: ${subject} has ${finding.nonblank} nonblank lines; review required (>${finding.kind === 'file' ? 400 : 80})`;
}
