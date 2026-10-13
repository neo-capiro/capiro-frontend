import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, cp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyRuntimeConfig } from "./verify-runtime-config.mjs";

const usage = `Usage: npm run test:production -- [output-directory]
Requires a completed root npm run build and an installed Playwright Chromium.
Runs a credential-free Next standalone server on 127.0.0.1:5188.
Exit 0: all checks pass; exit 1: qualification failure; exit 2: invalid arguments or missing build.`;
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
  process.exit(0);
}
if (args.length > 1 || args[0]?.startsWith("-")) {
  console.error(usage);
  process.exit(2);
}

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const app = join(root, "apps/web");
const standalone = join(app, ".next/standalone/apps/web");
const serverFile = join(standalone, "server.js");
const probeFile = fileURLToPath(
  new URL("./verify-standalone.mjs", import.meta.url),
);
const output = resolve(
  root,
  args[0] ?? "apps/web/test-results/production-standalone",
);

try {
  await access(serverFile);
} catch {
  console.error("Next standalone output is missing. Run npm run build first.");
  process.exit(2);
}
await mkdir(output, { recursive: true });
await verifyRuntimeConfig(app);
// The installed Next output guide requires these assets alongside server.js.
// Match the existing Docker image assembly without changing authored files.
await cp(join(app, "public"), join(standalone, "public"), { recursive: true });
await cp(join(app, ".next/static"), join(standalone, ".next/static"), {
  recursive: true,
});

function serverEnvironment(product) {
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: "5188",
    HOSTNAME: "127.0.0.1",
    NEXT_TELEMETRY_DISABLED: "1",
    CAPIRO_DEFAULT_PRODUCT: product,
  };
  // This qualification deliberately exercises an unconfigured local server.
  // Empty values also prevent an ignored local dotenv file from supplying keys.
  for (const name of [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "TRACKER_BACKEND",
    "CORE_API_BASE_URL",
    "STRATEGY_API_BASE_URL",
    "WORKSPACE_API_BASE_URL",
    "INTELLIGENCE_API_BASE_URL",
    "MERI_API_BASE_URL",
    "CAPIRO_EXISTING_APP_URL",
    "CAPIRO_MERI_URL",
    "CAPIRO_MODULES_URL",
    "CAPIRO_WORKSPACE_URL",
  ])
    env[name] = "";
  return env;
}

async function stopProcess(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null)
    return;
  const stopped = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
  try {
    await stopped;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyBrowser() {
  const probe = spawn(process.execPath, [probeFile, output], {
    cwd: root,
    stdio: "inherit",
  });
  let timer;
  try {
    const [code] = await Promise.race([
      once(probe, "exit"),
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error("Production browser checks exceeded 120 seconds."),
            ),
          120_000,
        );
      }),
    ]);
    assert.equal(code, 0, "Actual Next browser/runtime checks");
  } finally {
    clearTimeout(timer);
    await stopProcess(probe);
  }
}

async function withServer(product, verify) {
  const server = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: serverEnvironment(product),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  server.stdout.on("data", (chunk) => {
    log += chunk;
  });
  server.stderr.on("data", (chunk) => {
    log += chunk;
  });
  try {
    await new Promise((resolveReady, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Standalone server did not become ready.")),
        30_000,
      );
      server.stdout.on("data", () => {
        if (log.includes("Ready")) {
          clearTimeout(timer);
          resolveReady();
        }
      });
      server.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      server.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Standalone server exited before readiness: ${code}`));
      });
    });
    await verify();
  } finally {
    await stopProcess(server);
    await writeFile(
      join(output, `standalone-${product || "default"}.log`),
      log,
    );
  }
}

await withServer("", verifyBrowser);

await withServer("portfolio", async () => {
  const response = await fetch("http://127.0.0.1:5188/", {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
  const redirected = await fetch("http://127.0.0.1:5188/", {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(redirected.status, 200);
  assert.ok((await redirected.text()).includes("Portfolio setup required"));
  const result = {
    defaultProduct: "portfolio",
    rootStatus: response.status,
    location: "/",
    followedSetup: true,
  };
  await writeFile(
    join(output, "preview-root-smoke.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
});
