import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  assertPublicReexport,
  checkInstalledPublicExport,
} from "./installed-public-export.mjs";

for (const name of ["intents", "user-preferences", "document-access"]) {
  test(`${name} SDK exports the actual installed canonical receiver`, async () => {
    const checked = checkInstalledPublicExport(name, `${name}-application`);
    assert.equal(checked.packageVersion, "0.1.20");
    assert.equal(checked.records.length, 4);
    const require = createRequire(
      new URL("../packages/meri-client/package.json", import.meta.url),
    );
    const sdk = await import(
      pathToFileURL(require.resolve(`@capiro/meri-client/${name}`)).href
    );
    const canonical = await import(
      pathToFileURL(require.resolve(checked.publicExport)).href
    );
    assert.deepEqual(Object.keys(sdk), Object.keys(canonical));
    for (const key of Object.keys(canonical))
      assert.equal(sdk[key], canonical[key]);
  });
}
test("canonical re-export refuses old copied/private exports, added logic and type drift", () => {
  const client = {
    exports: {
      "./intents": {
        types: "./dist/intents.d.ts",
        default: "./dist/intents.js",
      },
    },
    files: ["dist"],
  };
  const statement =
    'export * from "@capiro/meri-contracts/intents-application";';
  assertPublicReexport(
    client,
    "intents",
    "intents-application",
    statement,
    statement,
    statement,
  );
  for (const changed of [
    statement.replace("intents-application", "src/intents"),
    statement + "\nexport const bypass = true;",
    statement.replace("*", "{receiveIntentsResponse}"),
  ])
    for (const index of [0, 1, 2]) {
      const inputs = [statement, statement, statement];
      inputs[index] = changed;
      assert.throws(
        () =>
          assertPublicReexport(
            client,
            "intents",
            "intents-application",
            ...inputs,
          ),
        /drift/,
      );
    }
  assert.throws(
    () =>
      assertPublicReexport(
        {
          ...client,
          exports: {
            "./intents": {
              types: "./vendor/intents.d.ts",
              default: "./vendor/intents.mjs",
            },
          },
        },
        "intents",
        "intents-application",
        statement,
        statement,
        statement,
      ),
    /drift/,
  );
});
