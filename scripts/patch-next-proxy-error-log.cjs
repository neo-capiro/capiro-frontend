#!/usr/bin/env node
/**
 * Upstream proxy error-log correction for the pinned Next server runtime.
 *
 * Next 16.4.1's proxy-request.js logs the full proxied target (pathname + query, which
 * carries provider callback codes, invitation/hashtag tokens and capability path tokens)
 * and then rejects the raw upstream Error, which the router logs a second time. There is
 * no supported configuration switch for that sink, so this script rewrites exactly that
 * one block in the installed package file.
 *
 * It is deterministic and fail-closed:
 *   - the package must be Next 16.4.1 and the file must hash to the exact expected original;
 *   - the replaced text must occur exactly once;
 *   - the result must hash to the exact expected patched value before anything is written;
 *   - an already-corrected file is a no-op success, so the build step stays idempotent.
 *
 * Usage:
 *   node scripts/patch-next-proxy-error-log.cjs [--package <next package dir>]
 *   node scripts/patch-next-proxy-error-log.cjs --verify <proxy-request.js>
 *   node scripts/patch-next-proxy-error-log.cjs --verify-standalone <dir>
 */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_NAME = "next";
const PACKAGE_VERSION = "16.4.1";
const TARGET_RELATIVE = "dist/server/lib/router-utils/proxy-request.js";
const ORIGINAL_SHA256 =
  "1e94224e114299f6c136df556c7899e3a6c0cbc7fa7c1a6d85dd17fa8d1765ae";
const PATCHED_SHA256 =
  "95716a2223984bc0ba687473440126b5c9e78d5271da2917da0fcbc4c55a4317";

const ORIGINAL_BLOCK =
  "    const onProxyError = (err)=>{\n" +
  "        if (!finished) {\n" +
  "            finished = true;\n" +
  "            console.error(`Failed to proxy ${target}`, err);\n" +
  "            detached.reject(err);\n" +
  "            if (!res.destroyed) {\n" +
  "                if (!(res instanceof _stream.Duplex)) {\n" +
  "                    res.statusCode = 500;\n" +
  "                }\n" +
  "                res.end('Internal Server Error');\n" +
  "            }\n" +
  "        }\n" +
  "    };\n";

// Fixed label, fixed upstream origin and a bounded error code. Nothing derived from the
// target path, query, hash, headers or the raw error is emitted, and the rejected error
// carries no cause, message or stack from the upstream failure.
const PATCHED_BLOCK =
  "    const upstreamOrigin = target.origin;\n" +
  "    const safeProxyErrorCode = (cause)=>{\n" +
  "        const code = cause && typeof cause === \"object\" ? cause.code : undefined;\n" +
  "        return typeof code === \"string\" && /^(?:[A-Z][A-Z0-9_]{2,31})$/.test(code) ? code : \"PROXY_UPSTREAM_FAILURE\";\n" +
  "    };\n" +
  "    const onProxyError = (err)=>{\n" +
  "        if (!finished) {\n" +
  "            finished = true;\n" +
  "            const safeError = new Error(\"Upstream proxy request failed\");\n" +
  "            safeError.name = \"ProxyUpstreamError\";\n" +
  "            safeError.code = safeProxyErrorCode(err);\n" +
  "            console.error(`Failed to proxy ${upstreamOrigin}`, safeError.name, safeError.code);\n" +
  "            detached.reject(safeError);\n" +
  "            if (!res.destroyed) {\n" +
  "                if (!(res instanceof _stream.Duplex)) {\n" +
  "                    res.statusCode = 500;\n" +
  "                }\n" +
  "                res.end('Internal Server Error');\n" +
  "            }\n" +
  "        }\n" +
  "    };\n";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fail = (message) => {
  console.error(`[patch-next-proxy-error-log] ${message}`);
  process.exit(1);
};

function packageRoot(explicit) {
  if (explicit) return path.resolve(explicit);
  try {
    return path.dirname(require.resolve("next/package.json", { paths: [process.cwd()] }));
  } catch {
    return fail(`cannot resolve ${PACKAGE_NAME} from ${process.cwd()}`);
  }
}

function targetFile(root) {
  const manifestPath = path.join(root, "package.json");
  if (!fs.existsSync(manifestPath)) fail(`no package.json at ${root}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.name !== PACKAGE_NAME || manifest.version !== PACKAGE_VERSION)
    fail(
      `unexpected package ${manifest.name}@${manifest.version}; this correction is bound to ${PACKAGE_NAME}@${PACKAGE_VERSION}`,
    );
  return { manifest, file: path.join(root, TARGET_RELATIVE) };
}

function patchedBytes(original) {
  const text = original.toString("utf8");
  const occurrences = text.split(ORIGINAL_BLOCK).length - 1;
  if (occurrences !== 1)
    fail(`expected exactly one proxy error block, found ${occurrences}; refusing to edit`);
  const next = Buffer.from(text.replace(ORIGINAL_BLOCK, PATCHED_BLOCK), "utf8");
  if (sha256(next) !== PATCHED_SHA256)
    fail(`patched result hashes ${sha256(next)}, expected ${PATCHED_SHA256}`);
  return next;
}

function main(argv) {
  const args = argv.slice(2);
  const flag = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1];
  };

  if (args.includes("--emit-hash")) {
    const { file } = targetFile(packageRoot(flag("--package")));
    console.log(sha256(patchedBytes(fs.readFileSync(file))));
    return 0;
  }

  if (args.includes("--verify")) {
    const file = flag("--verify");
    if (!file) fail("--verify needs a file");
    const actual = sha256(fs.readFileSync(path.resolve(file)));
    if (actual !== PATCHED_SHA256)
      fail(`${file} hashes ${actual}, expected the corrected ${PATCHED_SHA256}`);
    console.log(`[patch-next-proxy-error-log] verified ${file} ${actual}`);
    return 0;
  }

  if (args.includes("--verify-standalone")) {
    const root = flag("--verify-standalone");
    if (!root) fail("--verify-standalone needs the standalone output directory");
    const file = path.join(path.resolve(root), "node_modules", PACKAGE_NAME, TARGET_RELATIVE);
    if (!fs.existsSync(file))
      fail(`the standalone output does not contain ${file}; the corrected file was not packaged`);
    const actual = sha256(fs.readFileSync(file));
    if (actual !== PATCHED_SHA256)
      fail(`${file} hashes ${actual}, expected the corrected ${PATCHED_SHA256}`);
    console.log(`[patch-next-proxy-error-log] standalone carries ${actual} at ${file}`);
    return 0;
  }

  const root = packageRoot(flag("--package"));
  const { file } = targetFile(root);
  if (!fs.existsSync(file)) fail(`missing ${file}`);
  const current = fs.readFileSync(file);
  const currentSha = sha256(current);

  if (currentSha === PATCHED_SHA256) {
    console.log(`[patch-next-proxy-error-log] already corrected ${file} ${currentSha}`);
    return 0;
  }
  if (currentSha !== ORIGINAL_SHA256)
    fail(
      `${file} hashes ${currentSha}, expected the pinned original ${ORIGINAL_SHA256}; refusing to edit an unexpected file`,
    );

  const next = patchedBytes(current);
  // Replace the file instead of truncating it: an installed package is often hardlinked into a
  // task-owned copy, and writing through the shared inode would edit both.
  fs.rmSync(file, { force: true });
  fs.writeFileSync(file, next);
  const written = sha256(fs.readFileSync(file));
  if (written !== PATCHED_SHA256) fail(`write verification failed for ${file}`);
  console.log(`[patch-next-proxy-error-log] corrected ${file} ${written}`);
  return 0;
}

process.exitCode = main(process.argv);
