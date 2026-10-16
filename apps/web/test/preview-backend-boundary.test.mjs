import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name)],
  );
}
function parse(path) {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
}
const apiRoutes = files(join(source, "app/api")).filter((path) =>
  path.endsWith("/route.ts"),
);

test("every API handler applies preview admission before any route work", () => {
  assert.deepEqual(
    apiRoutes.map((path) => relative(source, path)).sort(),
    [
      "app/api/action-followthrough/[operation]/route.ts",
      "app/api/backend/[service]/[...path]/route.ts",
      "app/api/capiro/[operation]/route.ts",
      "app/api/conversations/[...path]/route.ts",
      "app/api/documents/[operation]/route.ts",
      "app/api/documents/links/[action]/route.ts",
    ],
    "Review newly introduced API surfaces explicitly",
  );
  for (const path of apiRoutes) {
    const ast = parse(path);
    const functions = new Map(
      ast.statements
        .filter(ts.isFunctionDeclaration)
        .map((node) => [node.name?.text, node]),
    );
    const exported = new Set();
    for (const node of ast.statements) {
      if (
        ts.isFunctionDeclaration(node) &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      )
        exported.add(node.name.text);
      if (ts.isExportDeclaration(node)) {
        assert.ok(
          !node.moduleSpecifier &&
            node.exportClause &&
            ts.isNamedExports(node.exportClause),
          "No bypass re-export",
        );
        for (const item of node.exportClause.elements)
          exported.add((item.propertyName ?? item.name).text);
      }
      if (ts.isVariableStatement(node))
        assert.ok(
          !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
          "Review alternate handler exports",
        );
    }
    assert.ok(exported.size, path);
    assert.ok(
      ast.statements.some(
        (node) =>
          ts.isImportDeclaration(node) &&
          node.moduleSpecifier.text.endsWith(
            "/preview/backend-policy.server",
          ) &&
          node.importClause?.namedBindings?.elements?.some(
            (item) => item.name.text === "previewBackendRejection",
          ),
      ),
      path,
    );
    for (const name of exported) {
      const body = functions.get(name)?.body;
      assert.ok(body, `${path}: ${name} must be a reviewed local handler`);
      const [first, second] = body.statements;
      assert.ok(first && ts.isVariableStatement(first), path);
      const declaration = first.declarationList.declarations[0];
      assert.equal(first.declarationList.declarations.length, 1);
      assert.ok(
        declaration?.initializer &&
          ts.isCallExpression(declaration.initializer),
        path,
      );
      assert.equal(
        declaration.initializer.expression.getText(ast),
        "previewBackendRejection",
      );
      const receivesReads = /\/api\/(?:backend|capiro)\//.test(path);
      assert.deepEqual(
        declaration.initializer.arguments.map((arg) => arg.getText(ast)),
        receivesReads ? ["process.env", "request"] : ["process.env"],
      );
      assert.ok(
        second &&
          ts.isIfStatement(second) &&
          ts.isReturnStatement(second.thenStatement),
        path,
      );
      assert.equal(
        second.expression.getText(ast),
        declaration.name.getText(ast),
      );
      assert.equal(
        second.thenStatement.expression?.getText(ast),
        declaration.name.getText(ast),
      );
      assert.equal(second.elseStatement, undefined);
      if (receivesReads) {
        const previewBranch = body.statements.find(
          (node) =>
            ts.isIfStatement(node) &&
            node.expression.getText(ast) ===
              'process.env.CAPIRO_PREVIEW_READ_ONLY === "true"',
        );
        assert.ok(
          previewBranch && ts.isReturnStatement(previewBranch.thenStatement),
          "Preview branch must return before ordinary service dispatch",
        );
        assert.equal(
          previewBranch.thenStatement.expression.expression.getText(ast),
          "proxyPreviewRead",
        );
        const branchIndex = body.statements.indexOf(previewBranch);
        assert.ok(
          body.statements
            .slice(0, branchIndex)
            .every(
              (node) =>
                !/readConfig\(|readCapiroConfig\(|proxyRequest\(|handleCapiroRequest\(/.test(
                  node.getText(ast),
                ),
            ),
        );
      }
    }
  }
});

test("preview policy stays in server entry points with no request-derived configuration", () => {
  const allowed = new Set([...apiRoutes, join(source, "proxy.ts")]);
  for (const path of files(source).filter((path) => /\.tsx?$/.test(path))) {
    const ast = parse(path);
    for (const node of ast.statements.filter(ts.isImportDeclaration)) {
      if (node.moduleSpecifier.text.includes("preview/backend-policy.server"))
        assert.ok(
          allowed.has(path),
          `Unexpected preview policy consumer: ${relative(source, path)}`,
        );
    }
  }
  const policy = readFileSync(
    join(source, "shared/preview/backend-policy.server.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    policy,
    /NEXT_PUBLIC_|fetch\s*\(|headers\s*\(|cookies\s*\(/,
  );
});
