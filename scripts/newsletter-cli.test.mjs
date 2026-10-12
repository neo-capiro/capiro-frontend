import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(args, expected) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, expected, result.stderr);
  return result;
}

for (const name of ["declarations", "browser-check"]) {
  const script = `packages/qualification-newsletter/${name}.mjs`;
  test(`newsletter ${name} import/help and invalid arguments allocate no qualification resources`, () => {
    const imported = run(
      ["--input-type=module", "-e", `await import('./${script}')`],
      0,
    );
    assert.equal(imported.stdout, "");
    assert.equal(imported.stderr, "");
    assert.match(run([script, "--help"], 0).stdout, /exit2 invalid arguments/);
    for (const args of [["--unknown"], ["one", "two"], [""]])
      run([script, ...args], 2);
    if (name === "browser-check") run([script], 2);
    const directory = mkdtempSync(
      path.join(tmpdir(), "newsletter-cli-refusal-"),
    );
    try {
      assert.match(run([script, directory], 1).stderr, /EEXIST/);
      assert.deepEqual(readdirSync(directory), []);
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
}
