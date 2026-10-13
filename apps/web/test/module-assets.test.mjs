import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("Modules shared assets retain exact native export bytes and intrinsic SVG roots", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../design/modules-shared-assets.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.nodeId, "411:93787");
  assert.equal(manifest.assets.length, 25);
  for (const asset of manifest.assets) {
    const bytes = readFileSync(
      new URL(`../public/design/modules/shared/${asset.file}`, import.meta.url),
    );
    assert.equal(bytes.length, asset.bytes);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    if (asset.svgRoot) {
      const root = bytes
        .subarray(0, 2000)
        .toString()
        .match(/<svg\b[^>]*>/)?.[0];
      assert.ok(root);
      for (const [key, value] of Object.entries(asset.svgRoot))
        assert.ok(root.includes(`${key}="${value}"`));
    }
  }
});
