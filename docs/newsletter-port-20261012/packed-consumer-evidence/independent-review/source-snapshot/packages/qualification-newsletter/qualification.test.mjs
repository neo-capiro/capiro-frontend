import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import * as newsletter from "@capiro/shared/newsletter";
import * as renderer from "@capiro/shared/newsletter-render";
import corpus from "./fixtures/renderer-characterizations.cjs";
import { withFixedClock } from "./fixed-clock.mjs";

const expected = JSON.parse(
  readFileSync(
    new URL("./fixtures/original-C-renderer-golden.json", import.meta.url),
  ),
);
const require = createRequire(import.meta.url);
const commonNewsletter = require("@capiro/shared/newsletter");
const commonRenderer = require("@capiro/shared/newsletter-render");
const actual = withFixedClock(() =>
  corpus.characterize(commonNewsletter, commonRenderer),
);

test("the complete immutable producer corpus survives packed frontend consumption", () => {
  assert.equal(expected.length, 116);
  assert.equal(actual.length, expected.length);
  assert.deepEqual(
    actual.map((item) => item.name),
    expected.map((item) => item.name),
  );
});
for (const [index, item] of expected.entries()) {
  test(`packed renderer: ${item.name}`, () =>
    assert.deepEqual(actual[index], item));
}

test("CommonJS and ESM consumers resolve the same public contract and renderer", () => {
  for (const [esm, common] of [
    [newsletter, commonNewsletter],
    [renderer, commonRenderer],
  ]) {
    assert.deepEqual(
      Object.keys(esm).sort(),
      [
        ...Object.keys(common),
        "__esModule",
        "default",
        "module.exports",
      ].sort(),
    );
    assert.equal(esm.default, common);
    assert.equal(esm["module.exports"], common);
    assert.equal(esm.__esModule, true);
    for (const name of Object.keys(common))
      assert.equal(esm[name], common[name], name);
  }
  assert.equal(newsletter.NEWSLETTER_TEMPLATE_ID, "bp_weekly_newsletter");
});

test("private source, output and undeclared subpath imports remain refused", () => {
  for (const subpath of [
    "src/newsletter.ts",
    "dist/newsletter.js",
    "newsletter-fonts",
  ]) {
    assert.throws(() => require.resolve(`@capiro/shared/${subpath}`), {
      code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
    });
  }
});

test("the installed public entries retain the producer JavaScript and declaration bytes", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("./fixtures/PUBLIC-ENTRY-BINDINGS.json", import.meta.url),
    ),
  );
  for (const entry of manifest.entries) {
    const filename = new URL(
      entry.relativeToNewsletterEntry,
      pathToFileURL(require.resolve("@capiro/shared/newsletter")),
    );
    const bytes = readFileSync(filename);
    assert.equal(bytes.length, entry.bytes, entry.path);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
      entry.path,
    );
  }
});
