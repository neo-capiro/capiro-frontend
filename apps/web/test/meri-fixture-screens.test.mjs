import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const directory = new URL(
  "../src/features/meri/fixtures/screens/",
  import.meta.url,
);
const featureRoot = new URL("../src/features/meri/", import.meta.url);
const audit = readFileSync(
  new URL("../../../docs/meri-figma-34-20261015/AUDIT.md", import.meta.url),
  "utf8",
);
const areaFiles = readdirSync(directory).filter((name) =>
  name.endsWith(".tsx"),
);
const entries = areaFiles.flatMap((name) => {
  const source = readFileSync(new URL(name, directory), "utf8");
  return [
    ...source.matchAll(
      /slug: "([^"]+)",\s*figmaId: "([^"]+)",\s*figmaNode: "([^"]+)"/g,
    ),
  ].map(([, slug, figmaId, figmaNode]) => ({ name, slug, figmaId, figmaNode }));
});
const walk = (url) =>
  readdirSync(url, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(new URL(`${entry.name}/`, url))
      : /\.tsx?$/.test(entry.name)
        ? [readFileSync(new URL(entry.name, url), "utf8")]
        : [],
  );

test("every registered fixture screen is a distinct audited Figma 3.4 frame", () => {
  assert.ok(entries.length >= 3);
  assert.equal(
    new Set(entries.map((entry) => entry.slug)).size,
    entries.length,
  );
  assert.equal(
    new Set(entries.map((entry) => entry.figmaNode)).size,
    entries.length,
  );
  for (const entry of entries) {
    assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(
      audit.includes(`| ${entry.figmaId} |`) &&
        audit.includes(`| ${entry.figmaNode} |`),
      `${entry.figmaId} ${entry.figmaNode} is in the audit table`,
    );
  }
});

test("each area file is registered and fixture links only target registered screens", () => {
  const registry = readFileSync(new URL("registry.ts", directory), "utf8");
  for (const name of areaFiles)
    assert.ok(
      registry.includes(`from "./${name.replace(/\.tsx$/, "")}"`),
      name,
    );
  const slugs = new Set(entries.map((entry) => entry.slug));
  for (const source of walk(featureRoot))
    for (const [, slug] of source.matchAll(/fixtureHref\("([^"]+)"\)/g))
      assert.ok(slugs.has(slug), `fixture link target ${slug} is registered`);
});

test("every decision-outcome approval count names a registered fixture screen", () => {
  const source = readFileSync(new URL("approval-counts.ts", directory), "utf8");
  const slugs = [...source.matchAll(/^ {2}"([^"]+)",$/gm)].map(
    ([, slug]) => slug,
  );
  assert.ok(slugs.length > 0);
  const registered = new Set(entries.map((entry) => entry.slug));
  for (const slug of slugs) assert.ok(registered.has(slug), slug);
});
