import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function verifyRuntimeConfig(app) {
  const manifest = JSON.parse(
    await readFile(join(app, ".next/prerender-manifest.json"), "utf8"),
  );
  const sharedEntries = [
    "/",
    "/portfolio",
    "/meri",
    "/meri/fixture/home",
    "/meri/fixture/cited-answer",
    "/meri/fixture/run-activity",
    "/modules",
    "/settings",
    "/settings/personal",
    "/sign-in",
  ];
  const cached = sharedEntries.filter((route) =>
    Object.hasOwn(manifest.routes, route),
  );
  assert.deepEqual(
    cached,
    [],
    "Shared session entries must resolve runtime configuration per request.",
  );
  // Never emit the manifest: it also contains generated Next preview secrets.
  console.log(JSON.stringify({ runtimeConfigEntries: sharedEntries, cached }));
}
