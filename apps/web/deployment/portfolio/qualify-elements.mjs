// Build-only preparation of the official pinned SSR tool and fresh qualification.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  buildSSR,
  selectSSRTool,
} from "../../../../packages/qualification-elements/ssr-build.mjs";

const repository = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const packageRoot = join(repository, "packages/qualification-elements");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const usage =
  "Usage: node qualify-elements.mjs NEW_ABSOLUTE_WORK_ROOT\n" +
  "Downloads only the official hash-pinned esbuild artifacts, prepares a fresh SSR receipt,\n" +
  "and runs the preserved UI provenance tests. Root must not exist or be inside the checkout.\n" +
  "Exit 0: qualified; 1: preparation/qualification failed; 2: invalid arguments.\n";

async function download(url, bytes, hash, destination) {
  assert.equal(new URL(url).origin, "https://registry.npmjs.org");
  // curl honors the execution environment's existing proxy configuration. No
  // redirects, custom curlrc, credentials or unpinned alternate host are used.
  const response = spawnSync(
    "curl",
    [
      "-q",
      "--fail",
      "--silent",
      "--show-error",
      "--proto",
      "=https",
      "--connect-timeout",
      "10",
      "--max-time",
      "60",
      "--max-filesize",
      String(bytes),
      url,
    ],
    { timeout: 65_000, maxBuffer: bytes + 1024 },
  );
  assert.equal(response.error, undefined, "official artifact download failed");
  assert.equal(response.status, 0, "official artifact download failed");
  const data = response.stdout;
  assert.equal(data.length, bytes, "artifact size differs from pin");
  assert.equal(sha256(data), hash, "artifact hash differs from pin");
  writeFileSync(destination, data, { flag: "wx", mode: 0o600 });
  return data;
}

function extractPinned(archive, member, target, hash, bytes) {
  // Extract one fixed member to stdout only, after the entire archive is verified.
  const result = spawnSync("tar", ["-xOzf", archive, member], {
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.error, undefined, "tar failed");
  assert.equal(result.status, 0, "pinned archive member unavailable");
  if (bytes !== undefined) assert.equal(result.stdout.length, bytes);
  assert.equal(
    sha256(result.stdout),
    hash,
    "extracted artifact differs from pin",
  );
  writeFileSync(target, result.stdout, { flag: "wx", mode: 0o600 });
}

async function prepareTool(work) {
  const pins = JSON.parse(
    readFileSync(join(packageRoot, "toolchain-pins.json"), "utf8"),
  );
  const pin = selectSSRTool(pins);
  const toolRoot = join(work, "tool");
  const tool = join(toolRoot, pin.platform);
  mkdirSync(tool, { recursive: true });
  await download(
    pin.metadataUrl,
    pin.metadataBytes,
    pin.metadataSha256,
    join(tool, "metadata.json"),
  );
  const archivePath = join(tool, "archive.tgz");
  const archive = await download(
    pin.archiveUrl,
    pin.archiveBytes,
    pin.archiveSha256,
    archivePath,
  );
  assert.equal(
    "sha512-" + createHash("sha512").update(archive).digest("base64"),
    pin.archiveIntegrity,
  );
  extractPinned(
    archivePath,
    "package/package.json",
    join(tool, "package.json"),
    pin.packageJsonSha256,
  );
  extractPinned(
    archivePath,
    "package/bin/esbuild",
    join(tool, pin.binaryName),
    pin.binarySha256,
    pin.binaryBytes,
  );
  chmodSync(join(tool, pin.binaryName), 0o700);
  return toolRoot;
}

export async function qualifyElements(workRoot) {
  assert.ok(isAbsolute(workRoot), "work root must be absolute");
  const absolute = resolve(workRoot);
  const work = join(realpathSync(dirname(absolute)), basename(absolute));
  assert.ok(
    work !== repository && !work.startsWith(repository + sep),
    "work root must be outside checkout",
  );
  // Validate output ownership on every host before any tool preparation.
  // mkdir remains exclusive; unsupported platforms must not allocate it.
  assert.ok(
    process.platform === "linux" && ["x64", "arm64"].includes(process.arch),
    "shipping tool platform",
  );
  mkdirSync(work); // Exclusive, no reuse of an old tool, output or receipt.
  const toolRoot = await prepareTool(work);
  const receipt = buildSSR({
    toolRoot,
    outputRoot: join(work, "ssr"),
    packageRoot,
  });
  const result = spawnSync("npm", ["run", "check:elements"], {
    cwd: repository,
    env: {
      ...process.env,
      MERI_ELEMENTS_SSR_RECEIPT: receipt.receiptPath,
      MERI_ELEMENTS_SSR_RECEIPT_SHA256: receipt.expectedSha256,
      MERI_ELEMENTS_SSR_CAPTURE_ROOT: join(work, "runtime"),
    },
    stdio: "inherit",
    timeout: 180_000,
  });
  assert.equal(result.error, undefined, "UI qualification process failed");
  assert.equal(result.status, 0, "UI qualification refused the fresh receipt");
  writeFileSync(
    join(work, "qualification.json"),
    JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" },
  );
  console.log(JSON.stringify({ qualified: true, ...receipt }));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv.length === 3 && process.argv[2] === "--help") {
    process.stdout.write(usage);
  } else if (process.argv.length !== 3 || !isAbsolute(process.argv[2])) {
    process.stderr.write(usage);
    process.exitCode = 2;
  } else {
    try {
      await qualifyElements(process.argv[2]);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
