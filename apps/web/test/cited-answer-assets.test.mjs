import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";

test("all22 cited-answer Figma assets retain their exact local bytes and intrinsic geometry", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../design/cited-answer-assets.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.figmaFile, "Zc2dEN5aLU47dVdsewDmiJ");
  assert.equal(manifest.nodeId, "442:81682");
  assert.deepEqual(manifest.target, { width: 1440, height: 1040 });
  assert.equal(manifest.assets.length, 22);
  const directory = new URL("../public/design/cited-answer/", import.meta.url);
  assert.deepEqual(
    readdirSync(directory).sort(),
    manifest.assets.map((asset) => asset.file).sort(),
  );
  for (const asset of manifest.assets) {
    assert.match(asset.file, /^[a-z-]+\.(svg|png)$/);
    const file = new URL(asset.file, directory);
    assert.ok(lstatSync(file).isFile());
    assert.ok(!lstatSync(file).isSymbolicLink());
    const body = readFileSync(file);
    assert.ok(body.length > 0);
    assert.equal(body.length, asset.bytes);
    assert.equal(createHash("sha256").update(body).digest("hex"), asset.sha256);
    if (asset.file.endsWith(".svg")) {
      const root = body
        .subarray(0, 2048)
        .toString()
        .match(/<svg\b[^>]*>/)?.[0];
      assert.ok(root);
      const dimension = asset.file === "profile.svg" ? 32 : 16;
      assert.ok(root.includes(`width="${dimension}"`));
      assert.ok(root.includes(`height="${dimension}"`));
    } else {
      assert.equal(body.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(body.readUInt32BE(16), 124);
      assert.equal(body.readUInt32BE(20), 40);
    }
  }
});

test("cited-answer source and styling use local assets without screenshot implementation imagery", () => {
  for (const relative of [
    "features/meri/MeriCitedAnswer.tsx",
    "features/meri/cited-answer.module.css",
    "app/meri/fixture/cited-answer/page.tsx",
  ]) {
    const source = readFileSync(
      new URL(`../src/${relative}`, import.meta.url),
      "utf8",
    );
    assert.ok(!source.includes("figma.com/api/mcp/asset/"));
    assert.ok(!source.includes("figma-reference.png"));
  }
  const styles = readFileSync(
    new URL("../src/features/meri/cited-answer.module.css", import.meta.url),
    "utf8",
  );
  assert.match(styles, /url\(["']\/design\/cited-answer\/meri-ink\.png["']\)/);
});
