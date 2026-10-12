# Packed newsletter consumer qualification

This private test workspace consumes the immutable vendor package through its two reviewed public exports. It owns compatibility verification only; Modules Workspace and Engagement remain the future rich-editor and record-routing owners. No frontend runtime imports this qualification package.

`qualification.test.mjs` compares all116 unchanged producer characterizations against the frozen original-C golden, checks actual CommonJS/ESM public exports, refuses private paths and checks all10 installed JS/declaration entry hashes. `declarations.mjs` compiles the byte-exact producer positive and negative fixtures in NodeNext and browser Bundler modes. Each negative must have exactly two TS2345 and one TS2322 diagnostic for the intended invalid block/platform/stage cases. `browser-check.mjs` records the actual Vite graph, requires exactly five packed modules plus the three test inputs, and evaluates the corpus in real Chromium while refusing page requests. It preserves failed output rather than rewriting expectations.

Run after the canonical root install:

```sh
npm run test:newsletter
npm run test:newsletter:browser -- /tmp/new-newsletter-browser-proof
```

The browser output directory must be new. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium, or use the existing Playwright browser installation. No browser download occurs in these commands. Declaration evidence defaults to a new temporary directory; pass a new directory directly to `declarations.mjs` to retain a chosen destination. Both CLIs support `--help` and are import-safe. Exit0 means success/help, exit1 a qualification/environment failure, exit2 invalid arguments. Root `scripts/*.test.mjs` discovery includes their CLI smoke checks.

The original four fixture files must remain byte-exact. Their source, hashes and scope are recorded in [package consumption](../../docs/newsletter-port-20261012/PACKED-CONSUMER.md). The deterministic clock/random helper is for synchronous synthetic characterization only. Do not run the historical backend runner to regenerate a golden from the candidate package. This suite does not qualify an editor, authenticated backend, provider, deployment, visual parity or accessibility.
