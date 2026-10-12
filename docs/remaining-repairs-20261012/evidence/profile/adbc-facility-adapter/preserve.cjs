const fs = require("node:fs");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const ts = require("/workspace/capiro-remaining-profile/node_modules/typescript");
const owner = "/workspace/capiro-remaining-profile";
const output = __dirname;
const base = "4ed4b56aaa1660e7f7abdccd94208c17aa38f21b";
const qualification = "adbc84b2251fe6b06cb7f75030026fba5b4ff498";
const path = "apps/web/tests/browser/portfolio.spec.ts";
const readGit = (pin, file) => cp.execFileSync("git", ["show", `${pin}:${file}`], { cwd: owner, encoding: "utf8" });
const hash = (text) => crypto.createHash("sha256").update(text).digest("hex");
const before = readGit(base, path);
const after = fs.readFileSync(`${owner}/${path}`, "utf8");
const parse = (text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const oldTree = parse(before);
const newTree = parse(after);
const tests = (tree) => tree.statements.filter((node) => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(tree) === "test").map((node) => ({ name: node.expression.arguments[0].text, node }));
const originalTests = tests(oldTree);
const currentTests = tests(newTree);
const facilityName = "facility creation uses the selected client's endpoint and refreshes the map list";
const original = originalTests.find((entry) => entry.name === facilityName).node;
const current = currentTests.find((entry) => entry.name === facilityName).node;
const assertions = (node, tree) => {
  const found = [];
  function visit(child) {
    if (ts.isExpressionStatement(child)) {
      let expression = child.expression;
      if (ts.isAwaitExpression(expression)) expression = expression.expression;
      if (expression.getText(tree).startsWith("expect(")) found.push(expression.getText(tree));
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return found;
};
const oldAssertions = assertions(oldTree, oldTree);
const newAssertions = assertions(newTree, newTree);
const unused = [...newAssertions];
const missing = oldAssertions.filter((assertion) => {
  const index = unused.indexOf(assertion);
  if (index < 0) return true;
  unused.splice(index, 1);
  return false;
});
const route = (node, tree) => {
  const body = node.expression.arguments[1].body;
  return body.statements.find((statement) => statement.getText(tree).startsWith("await page.route(")).getText(tree);
};
const unchangedTests = originalTests.filter((entry) => entry.name !== facilityName).map((entry) => {
  const next = currentTests.find((candidate) => candidate.name === entry.name);
  return { name: entry.name, unchanged: entry.node.getText(oldTree) === next.node.getText(newTree), sha256: hash(entry.node.getText(oldTree)) };
});
const sourcePaths = ["FacilitiesCard.tsx", "FacilitiesManager.tsx", "FacilityEditor.tsx", "FacilityFields.tsx", "useFacilityWriter.ts", "facility-map-model.ts"].map((name) => `apps/web/src/features/portfolio/client-profile/${name}`);
const sources = sourcePaths.map((file) => {
  const local = fs.readFileSync(`${owner}/${file}`, "utf8");
  return { path: file, sha256: hash(local), matchesFrozenQualification: local === readGit(qualification, file), unchangedFromOwnerBase: local === readGit(base, file) };
});
const failurePath = "/tmp/capiro-remaining-qualification/final-adbc84b/portfolio-browser-artifacts/portfolio-facility-creatio-0023f--and-refreshes-the-map-list/error-context.md";
const result = {
  capturedAt: new Date().toISOString(),
  ownerBase: base,
  frozenQualificationSource: qualification,
  source: path,
  beforeSha256: hash(before),
  afterSha256: hash(after),
  qualificationTestMatchesBefore: readGit(qualification, path) === before,
  parseDiagnostics: [...oldTree.parseDiagnostics, ...newTree.parseDiagnostics].map((diagnostic) => String(diagnostic.messageText)),
  testNamesUnchanged: JSON.stringify(originalTests.map((entry) => entry.name)) === JSON.stringify(currentTests.map((entry) => entry.name)),
  unchangedTests,
  facilityRouteAndPayloadHandlerByteIdentical: route(original, oldTree) === route(current, newTree),
  originalAssertionCount: oldAssertions.length,
  currentAssertionCount: newAssertions.length,
  missingOriginalAssertions: missing,
  addedAssertions: unused,
  productionSources: sources,
  originalFailure: { path: failurePath, sha256: hash(fs.readFileSync(failurePath)) },
  runtimeTestsBuildTypecheckRun: false,
  browserLease: "not granted; root owns integrated replay",
};
if (result.parseDiagnostics.length || !result.testNamesUnchanged || !result.qualificationTestMatchesBefore || !result.facilityRouteAndPayloadHandlerByteIdentical || missing.length || unchangedTests.some((test) => !test.unchanged) || sources.some((source) => !source.matchesFrozenQualification || !source.unchangedFromOwnerBase)) throw new Error("Preservation check failed");
fs.writeFileSync(`${output}/before-portfolio.spec.ts.txt`, before);
fs.writeFileSync(`${output}/SOURCE-AST-PRESERVATION.json`, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ originalAssertions: oldAssertions.length, currentAssertions: newAssertions.length, unchangedOtherTests: unchangedTests.length, preservedHandler: true, changedProductionSources: 0, runtimeExecuted: false }));
