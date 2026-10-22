/** Local source-only negative checks. Restores every target byte-for-byte, even on failure. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = resolve(root, "apps/web/work/m2-history-mutations");
mkdirSync(output, { recursive: true });
const unit = (test) => ({
  cwd: resolve(root, "apps/web"),
  args: [
    resolve(root, "node_modules/vitest/vitest.mjs"),
    "run",
    test,
    "--reporter=json",
  ],
  kind: "unit",
});
const browser = (grep) => ({
  cwd: root,
  args: [
    resolve(root, "node_modules/@playwright/test/cli.js"),
    "test",
    "--config",
    "apps/web/test/browser/playwright.config.ts",
    "apps/web/test/browser/meri-conversation-list.spec.ts",
    "--grep",
    grep,
    "--reporter=json",
  ],
  kind: "browser",
});
const admission =
  "apps/web/src/features/meri/conversations/MeriConversationList.tsx";
const cases = [
  {
    name: "bypass-feature-gate",
    path: admission,
    from: 'props.enabled && capabilities.conversations.status === "on"',
    to: "true",
    checks: [unit("tests/meri-conversation-list.test.ts")],
  },
  {
    name: "use-refetching-identity",
    path: admission,
    from: "identity.isSuccess && !identity.isFetching && !identity.error",
    to: "identity.isSuccess && !identity.error",
    checks: [unit("tests/meri-conversation-list.test.ts")],
  },
  {
    name: "admit-archived-client",
    path: admission,
    from: 'client.status === "archived"',
    to: "false",
    checks: [unit("tests/meri-conversation-list.test.ts")],
  },
  {
    name: "lose-list-client-route",
    path: "apps/web/src/features/meri/MeriClientSelector.tsx",
    from: "scopedHref(destination, client.id)",
    to: 'scopedHref("/meri", client.id)',
    checks: [
      unit("tests/meri-conversation-list.test.ts"),
      browser("client switching retires"),
    ],
  },
  {
    name: "old-capability-destination",
    path: "apps/web/src/shared/meri-resources/capabilities.ts",
    from: 'ordinaryRoute: "/meri/conversations"',
    to: 'ordinaryRoute: "/meri"',
    checks: [unit("tests/meri-capabilities.test.ts")],
  },
  {
    name: "lose-conversation-selector",
    path: "apps/web/src/shared/meri-conversations/conversation-navigation.ts",
    from: "new URLSearchParams({ clientId, conversationId })",
    to: "new URLSearchParams({ clientId })",
    checks: [browser("loaded-page filtering")],
  },
  {
    name: "hide-history-error",
    path: "apps/web/src/features/meri/conversations/ConversationList.tsx",
    from: ") : unavailable ? (",
    to: ") : false ? (",
    checks: [browser("list failure hides cached")],
  },
  {
    name: "ignore-foreign-owner",
    path: "apps/web/src/shared/meri-conversations/history-pages.ts",
    from: "conversation.owner.actorId !== account.actorId",
    to: "false",
    checks: [browser("mixed-client discovery")],
  },
  {
    name: "freeze-prior-actor",
    path: admission,
    from: "actorId: current.user.id",
    to: 'actorId: "10000000-0000-4000-8000-000000000001"',
    checks: [browser("a delayed list response")],
  },
  {
    name: "drop-stored-draft",
    path: "apps/web/src/features/meri/conversation/initial-draft.ts",
    from: "this.state = this.record.read() ?? empty();",
    to: "this.state = empty();",
    checks: [browser("visiting the list")],
  },
];

const results = [];
for (const mutation of cases) {
  const path = resolve(root, mutation.path);
  const original = readFileSync(path, "utf8");
  if (original.split(mutation.from).length !== 2)
    throw new Error(`Expected one mutation site: ${mutation.name}`);
  try {
    writeFileSync(path, original.replace(mutation.from, mutation.to));
    for (const [index, check] of mutation.checks.entries()) {
      const result = spawnSync(process.execPath, check.args, {
        cwd: check.cwd,
        encoding: "utf8",
        timeout: 120_000,
        env: { ...process.env, CAPIRO_BROWSER_TEST_PORT: "5198" },
        maxBuffer: 20 * 1024 * 1024,
      });
      writeFileSync(
        resolve(output, `${mutation.name}-${index}.stdout.log`),
        result.stdout ?? "",
      );
      writeFileSync(
        resolve(output, `${mutation.name}-${index}.stderr.log`),
        result.stderr ?? "",
      );
      let report;
      try {
        report = JSON.parse(result.stdout);
      } catch {
        /* Infrastructure failure is not a kill. */
      }
      const failed =
        check.kind === "unit"
          ? report?.numFailedTests
          : report?.stats?.unexpected;
      const errors =
        check.kind === "unit"
          ? report?.testResults?.flatMap((suite) =>
              suite.assertionResults
                .filter((test) => test.status === "failed")
                .flatMap((test) => test.failureMessages),
            )
          : report?.suites?.flatMap((suite) =>
              suite.specs.flatMap((spec) =>
                spec.tests.flatMap((test) =>
                  test.results.flatMap((result) =>
                    result.errors.map((error) => error.message),
                  ),
                ),
              ),
            );
      const assertionFailure = errors?.some((message) =>
        /AssertionError|expect\(/.test(message),
      );
      const killed = result.status === 1 && failed > 0 && assertionFailure;
      const entry = {
        name: mutation.name,
        check: check.kind,
        exit: result.status,
        failedTests: failed ?? null,
        assertionFailure: !!assertionFailure,
        killed,
      };
      results.push(entry);
      console.log(JSON.stringify(entry));
      if (!killed)
        throw new Error(
          `Mutant survived or infrastructure failed: ${mutation.name}`,
        );
    }
  } finally {
    writeFileSync(path, original);
    if (readFileSync(path, "utf8") !== original)
      throw new Error(`Restoration failed: ${mutation.path}`);
  }
}
writeFileSync(
  resolve(output, "results.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  `Killed ${cases.length} controlled mutants in ${results.length} checks; all source bytes restored.`,
);
