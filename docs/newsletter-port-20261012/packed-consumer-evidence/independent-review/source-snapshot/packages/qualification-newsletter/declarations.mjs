import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const usage =
  "Usage: node declarations.mjs [NEW_OUTPUT_DIRECTORY | --help]\nVerify packed declarations in NodeNext and browser Bundler modes. No network or native operations. Exit0 pass/help; exit1 qualification failure; exit2 invalid arguments.";

export function qualifyDeclarations(directory) {
  const compiler = createRequire(import.meta.url).resolve("typescript/bin/tsc");
  const common = {
    target: "ES2022",
    strict: true,
    noUncheckedIndexedAccess: true,
    noEmit: true,
    skipLibCheck: false,
    types: [],
    lib: ["ES2022", "DOM"],
  };
  const records = [];
  for (const [kind, module, moduleResolution] of [
    ["node", "NodeNext", "NodeNext"],
    ["browser", "ESNext", "Bundler"],
  ]) {
    for (const negative of [false, true]) {
      const name = `${kind}-${negative ? "negative" : "positive"}`;
      const filename = path.join(directory, `${name}.json`);
      writeFileSync(
        filename,
        JSON.stringify(
          {
            compilerOptions: { ...common, module, moduleResolution },
            files: [
              fileURLToPath(
                new URL(
                  `./fixtures/consumer-${negative ? "negative" : "positive"}.ts`,
                  import.meta.url,
                ),
              ),
            ],
          },
          null,
          2,
        ),
        { flag: "wx" },
      );
      const command = [process.execPath, compiler, "-p", filename];
      const result = spawnSync(command[0], command.slice(1), {
        encoding: "utf8",
        timeout: 120000,
      });
      const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
      writeFileSync(path.join(directory, `${name}.log`), output, {
        flag: "wx",
      });
      const record = {
        name,
        command,
        exitCode: result.status,
        signal: result.signal,
        spawnError: result.error ? String(result.error) : null,
        expectedExit: negative ? 2 : 0,
      };
      writeFileSync(
        path.join(directory, `${name}-exit.json`),
        JSON.stringify(record, null, 2),
        { flag: "wx" },
      );
      assert.equal(result.status, record.expectedExit, `${name}: ${output}`);
      if (negative) {
        assert.equal((output.match(/error TS/g) ?? []).length, 3);
        assert.equal((output.match(/error TS2345/g) ?? []).length, 2);
        assert.equal((output.match(/error TS2322/g) ?? []).length, 1);
        assert.match(output, /invented-kind/);
        assert.match(output, /invented-platform/);
        assert.match(output, /number.*not assignable to type 'string'/);
      }
      records.push({ ...record, pass: true });
    }
  }
  writeFileSync(
    path.join(directory, "declaration-results.json"),
    JSON.stringify({ records }, null, 2),
    { flag: "wx" },
  );
  return { directory, passed: records.length };
}

function main(argv) {
  if (argv.length === 1 && argv[0] === "--help") {
    console.log(usage);
    return;
  }
  if (
    argv.length > 1 ||
    argv.some((value) => !value || value.startsWith("-"))
  ) {
    console.error(usage);
    process.exitCode = 2;
    return;
  }
  const directory = argv.length
    ? path.resolve(argv[0])
    : mkdtempSync(path.join(tmpdir(), "capiro-newsletter-types-"));
  if (argv.length) mkdirSync(directory);
  console.log(JSON.stringify(qualifyDeclarations(directory)));
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
