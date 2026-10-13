import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const closure = [
  "newsletter",
  "newsletter-render",
  "newsletter-fonts",
  "newsletter-fonts.catalog",
  "newsletter-social-share",
];
const usage =
  "Usage: node browser-check.mjs NEW_OUTPUT_DIRECTORY | --help\nBundle only governed public newsletter imports and evaluate the immutable corpus in Chromium. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH for a system browser. No service/provider calls. Exit0 pass/help; exit1 qualification failure; exit2 invalid arguments.";

async function bundleConsumer(directory) {
  const { build } = await import("vite");
  const dist = path.dirname(
    createRequire(import.meta.url).resolve("@capiro/shared/newsletter"),
  );
  const allowed = new Set([
    ...closure.map((name) => path.join(dist, `${name}.js`)),
    path.join(here, "browser-entry.mjs"),
    path.join(here, "fixed-clock.mjs"),
    path.join(here, "fixtures/renderer-characterizations.cjs"),
  ]);
  let graph;
  await build({
    configFile: false,
    root: here,
    logLevel: "silent",
    build: {
      outDir: path.join(directory, "bundle"),
      emptyOutDir: false,
      sourcemap: true,
      lib: {
        entry: path.join(here, "browser-entry.mjs"),
        name: "CapiroNewsletterQualification",
        formats: ["iife"],
        fileName: () => "newsletter.js",
      },
    },
    plugins: [
      {
        name: "record-public-newsletter-closure",
        generateBundle() {
          graph = [...this.getModuleIds()].map((id) => ({
            id,
            external: this.getModuleInfo(id).isExternal,
            imports: this.getModuleInfo(id).importedIds,
          }));
        },
      },
    ],
  });
  writeFileSync(
    path.join(directory, "browser-module-graph.json"),
    JSON.stringify(graph, null, 2),
    { flag: "wx" },
  );
  assert.ok(graph?.length, "The actual bundler graph must be recorded");
  assert.ok(
    graph.every((item) => !item.external),
    "No external or Node module may enter the browser bundle",
  );
  const real = graph
    .filter((item) => !item.id.startsWith("\0"))
    .map((item) => item.id);
  assert.deepEqual(
    new Set(real),
    allowed,
    "Bundle only five packed modules and the three consumer fixtures",
  );
  return path.join(directory, "bundle/newsletter.js");
}

async function evaluateBrowser(bundle, directory) {
  const { chromium } = await import("@playwright/test");
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--disable-dev-shm-usage"],
  });
  const requests = [],
    pageErrors = [];
  try {
    const page = await browser.newPage();
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("**/*", (route) => route.abort());
    await page.addScriptTag({ path: bundle });
    const actual = await page.evaluate(() =>
      globalThis.CapiroNewsletterQualification.characterizePackedNewsletter(),
    );
    writeFileSync(
      path.join(directory, "browser-renderer-results.json"),
      JSON.stringify(actual, null, 2),
      { flag: "wx" },
    );
    const expected = JSON.parse(
      readFileSync(path.join(here, "fixtures/original-C-renderer-golden.json")),
    );
    assert.equal(expected.length, 116);
    assert.deepEqual(actual, expected);
    assert.deepEqual(requests, []);
    assert.deepEqual(pageErrors, []);
    const result = {
      passedCharacterizations: actual.length,
      browserVersion: browser.version(),
      executablePath: executablePath ?? "Playwright-managed Chromium",
      requests,
      pageErrors,
      scope:
        "Actual Chromium execution of packed pure public imports; no full editor, backend, visual or native acceptance",
    };
    writeFileSync(
      path.join(directory, "browser-results.json"),
      JSON.stringify(result, null, 2),
      { flag: "wx" },
    );
    return result;
  } finally {
    await browser.close();
  }
}

export async function qualifyBrowser(directory) {
  mkdirSync(directory);
  return evaluateBrowser(await bundleConsumer(directory), directory);
}

async function main(argv) {
  if (argv.length === 1 && argv[0] === "--help") {
    console.log(usage);
    return;
  }
  if (argv.length !== 1 || !argv[0] || argv[0].startsWith("-")) {
    console.error(usage);
    process.exitCode = 2;
    return;
  }
  console.log(JSON.stringify(await qualifyBrowser(path.resolve(argv[0]))));
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
