import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";
import { fileURLToPath } from "node:url";

// Documentation inventory only. This does not change routes, permissions or UI.
const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const core = process.argv[2] && path.resolve(process.argv[2]);
if (!core || !fs.existsSync(path.join(core, "apps/api/src")))
  throw Error("Pass the canonical Core checkout as the only argument.");
const slash = (value) => value.replaceAll("\\", "/");
const relative = (root, file) => slash(path.relative(root, file));
const sha = (root) =>
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
const capability = JSON.parse(
  fs.readFileSync(
    path.join(frontend, "docs/admin-capability-disposition.json"),
    "utf8",
  ),
);
const seen = new Set();
for (const item of [...capability.capabilities, ...capability.utilities]) {
  if (
    seen.has(item.id) ||
    !["app-supported", "intentionally-api-only", "externally-managed"].includes(
      item.disposition,
    )
  )
    throw Error("Invalid capability disposition: " + item.id);
  seen.add(item.id);
  const [owner, file] = item.source.split(":");
  if (!fs.existsSync(path.join(owner === "core" ? core : frontend, file)))
    throw Error("Missing capability owner: " + item.source);
}
function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const literal = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
const properties = (node) =>
  new Map(
    node.properties
      .filter(ts.isPropertyAssignment)
      .map((p) => [literal(p.name) ?? p.name.getText(), p.initializer]),
  );
function decorators(node) {
  return (ts.getDecorators(node) ?? [])
    .filter((d) => ts.isCallExpression(d.expression))
    .map((d) => ({
      name: d.expression.expression.getText(),
      args: d.expression.arguments,
    }));
}
function roles(decs) {
  const role = decs.find((d) => d.name === "Roles");
  return role ? role.args.map(literal) : undefined;
}
const route = (...parts) =>
  "/" +
  parts
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
const ops = [];
for (const file of files(
  path.join(frontend, "apps/web/src/shared/capiro/operations"),
).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isCallExpression(node.initializer) &&
      node.initializer.expression.getText() === "defineOperation" &&
      node.initializer.arguments[0] &&
      ts.isObjectLiteralExpression(node.initializer.arguments[0])
    ) {
      const values = properties(node.initializer.arguments[0]);
      const key = literal(node.name),
        service = literal(values.get("service"));
      const method = literal(values.get("method")),
        endpoint = literal(values.get("path"));
      if (key && service && method && endpoint)
        ops.push({
          key,
          service,
          method,
          path: route(endpoint),
          contract: relative(frontend, file),
        });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const uiFiles = files(path.join(frontend, "apps/web/src")).filter(
  (f) =>
    /\.(ts|tsx)$/.test(f) &&
    !/\.(test|spec)\./.test(f) &&
    !slash(f).includes("/shared/capiro/") &&
    !slash(f).includes("/app/api/"),
);
const textByFile = uiFiles.map((file) => ({
  file: relative(frontend, file),
  text: fs.readFileSync(file, "utf8"),
}));
for (const op of ops)
  op.consumers = textByFile
    .filter(
      ({ text }) =>
        text.includes('"' + op.key + '"') || text.includes("'" + op.key + "'"),
    )
    .map(({ file }) => file);
for (const binding of capability.dynamicConsumers) {
  for (const file of [binding.contract, binding.consumer])
    if (!fs.existsSync(path.join(frontend, file)))
      throw Error("Missing dynamic binding owner: " + file);
  ops.push({
    ...binding,
    key: binding.operation,
    consumers: [binding.consumer],
  });
}

const endpoints = [];
const settingsOwners = [
  "capiro-admin/",
  "tenant-admin/",
  "branding/",
  "ai-usage/",
  "admin-broadcasts/",
  "help/support-requests/",
  "meri/site-workflows/",
  "program-element/",
  "acquisition-personnel/",
  "intelligence/",
  "memory/",
  "billing/",
  "meri/meri-policy-pack.controller.ts",
];
for (const [service, directory] of [
  ["core", "apps/api/src"],
  ["onboard", "apps/onboard-api/src"],
]) {
  for (const file of files(path.join(core, directory)).filter((f) =>
    f.endsWith(".controller.ts"),
  )) {
    const domain = relative(path.join(core, directory), file);
    if (
      service === "core" &&
      !settingsOwners.some((owner) => domain.startsWith(owner))
    )
      continue;
    if (service === "onboard" && !domain.startsWith("billing/")) continue;
    const text = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    for (const node of source.statements.filter(ts.isClassDeclaration)) {
      const decs = decorators(node),
        controller = decs.find((d) => d.name === "Controller");
      if (!controller) continue;
      const prefix = controller.args.length ? literal(controller.args[0]) : "";
      const classRoles = roles(decs);
      for (const member of node.members.filter(ts.isMethodDeclaration)) {
        const methodDecs = decorators(member),
          required = roles(methodDecs) ?? classRoles;
        if (
          !required?.length ||
          !required.every((r) => ["user_admin", "capiro_admin"].includes(r))
        )
          continue;
        const method = methodDecs.find((d) =>
          ["Get", "Post", "Put", "Patch", "Delete"].includes(d.name),
        );
        if (!method) continue;
        const suffix = method.args.length ? literal(method.args[0]) : "";
        if (prefix === undefined || suffix === undefined)
          throw Error(
            "Resolve nonliteral administrator route in " + relative(core, file),
          );
        const endpoint = route(prefix, suffix),
          verb = method.name.toUpperCase();
        const contracts = ops.filter(
          (op) =>
            op.service === service &&
            op.method === verb &&
            op.path === endpoint,
        );
        const consumers = [
          ...new Set(contracts.flatMap((op) => op.consumers)),
        ].sort();
        endpoints.push({
          service,
          method: verb,
          path: endpoint,
          disposition: consumers.length
            ? "app-supported"
            : "intentionally-api-only",
          requiredRoles: required,
          owner: relative(core, file),
          handler: member.name.getText(),
          sourceSha256: createHash("sha256").update(text).digest("hex"),
          operations: contracts.map((op) => op.key),
          contracts: [...new Set(contracts.map((op) => op.contract))],
          consumers,
          note: consumers.length
            ? "Existing application consumer; canonical backend authorization still applies."
            : "No selected application consumer. Retain the existing API and its authorization; no additional UI is promised.",
        });
      }
    }
  }
}
endpoints.sort((a, b) =>
  (a.service + a.path + a.method).localeCompare(b.service + b.path + b.method),
);
const inventory = {
  schemaVersion: 1,
  scope:
    "Settings/HQ administration controllers and Onboard billing: literal routes with an explicit tenant-admin/HQ minimum role. The companion capability disposition covers externally managed and service-authorized Settings features.",
  controllerDomains: settingsOwners,
  generatedFrom: { core: sha(core), frontend: sha(frontend) },
  classification: {
    "app-supported":
      "An existing application consumer is present. This is source coverage, not deployment or live qualification.",
    "intentionally-api-only":
      "Preserve the existing authorized API. A backend utility alone does not select a new product screen.",
    "externally-managed":
      "The named external owner retains the operation; the app may link to it or display state.",
  },
  limitations: [
    "Endpoint enumeration covers literal HTTP routes with an explicit minimum Roles requirement of user_admin or capiro_admin. Service-authorized and internal machine routes are represented by the Settings/utility capability records, not inferred as additional product scope.",
    "Static consumer discovery records direct operation keys. It does not prove browser behavior or provider availability.",
    "Objective Questions/Automation, Objective-to-Strategy-to-Planner workflow, and hub formulas remain deferred by the user.",
    "No new administrative UI was selected by B14. Tenant audit viewing remains API-only. B12 managed-import delivery is a separate pending requirement.",
  ],
  endpoints,
};
const out = path.join(frontend, "docs/admin-endpoint-disposition.json");
fs.writeFileSync(out, JSON.stringify(inventory, null, 2) + "\n");
process.stdout.write(
  JSON.stringify({
    endpoints: endpoints.length,
    appSupported: endpoints.filter((e) => e.disposition === "app-supported")
      .length,
    apiOnly: endpoints.filter((e) => e.disposition === "intentionally-api-only")
      .length,
    output: relative(frontend, out),
  }) + "\n",
);
