# Packed newsletter consumer qualification

## Receiving qualification outline

The consumer runner will adopt the immutable `38fec5c8` receiving package through
the existing public `@capiro/shared/newsletter` export. Producer code continues
to own parsing; this workspace owns synthetic expectations, public import
boundaries and declaration/browser compatibility. No parser implementation or
backend action belongs here. The original 116-case corpus and four producer
fixtures remain byte-exact: an explicit original-export projection preserves
their historical namespace expectation, while separate checks assert the entire
new namespace. New receiving cases will cover owner envelopes, resource and
revision mismatches, historical test-version rollover and invalid/accessor input
without network effects. Both CJS and ESM run those cases; the browser runner
will include the sixth packed receiving module and run the same cases under its
existing zero-request policy. New declaration fixtures supplement the unchanged
original positive/negative fixtures in both NodeNext and Bundler modes. Root
owns package manifests, vendor inputs and install; checks start only after that
install, and browser execution requires its separate lease.

This private test workspace consumes the immutable vendor package through its two reviewed public exports. It owns compatibility verification only; Modules Workspace and Engagement remain the future rich-editor and record-routing owners. No frontend runtime imports this qualification package.

`qualification.test.mjs` compares all116 unchanged producer characterizations, through the explicit original-export projection, against the frozen original-C golden, checks actual CommonJS/ESM public exports, refuses private paths and checks all12 installed JS/declaration entry hashes. `declarations.mjs` compiles the byte-exact producer positive and negative fixtures in NodeNext and browser Bundler modes. Each original negative must have exactly two TS2345 and one TS2322 diagnostic for the intended invalid block/platform/stage cases. The separate receiving fixtures add strict public parser/type coverage; their negatives require exactly two TS2345, three TS2322 and one TS2353 diagnostic, including wrong revision, HTML type and resource binding. All eight NodeNext/Bundler compilations run. `browser-check.mjs` records the actual Vite graph, requires exactly six packed modules plus five declared test inputs, and evaluates the corpus in real Chromium while refusing page requests. It preserves failed output rather than rewriting expectations.

Run after the canonical root install:

```sh
npm run test:newsletter
npm run test:newsletter:browser -- /tmp/new-newsletter-browser-proof
```

The browser output directory must be new. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium, or use the existing Playwright browser installation. No browser download occurs in these commands. Declaration evidence defaults to a new temporary directory; pass a new directory directly to `declarations.mjs` to retain a chosen destination. Both CLIs support `--help` and are import-safe. Exit0 means success/help, exit1 a qualification/environment failure, exit2 invalid arguments. Root `scripts/*.test.mjs` discovery includes their CLI smoke checks.

The original four fixture files must remain byte-exact. Their source, hashes and scope are recorded in [package consumption](../../docs/newsletter-port-20261012/PACKED-CONSUMER.md). The deterministic clock/random helper is for synchronous synthetic characterization only. Do not run the historical backend runner to regenerate a golden from the candidate package. This suite does not qualify an editor, authenticated backend, provider, deployment, visual parity or accessibility.

## Receiving input and preservation

The current artifact is `@capiro/shared@0.0.0` from source
`38fec5c83585850ed75a7d3693b3b90d517e70af`, distribution
`9ffab390ef444d7ea0bf4eb0d68224f810245e25`, SHA256
`3e435f280fac8fd301eb753e9fc7ead93691cf979fc1641792fedd88e1bfd6d5`
(532,178 bytes). `PUBLIC-ENTRY-BINDINGS.json` checks its twelve JavaScript and
declaration entries, including the two receiving entries. Previous entry bindings
and the old vendor artifact remain preserved in Git and the original packet.

`fixtures/newsletter-receiving-corpus.cjs`, `receiving-positive.ts` and
`receiving-negative.ts` reuse the producer's public qualification inputs at that
distribution's `docs/shared-newsletter-receiving-packed-distribution-20261013/qualified-38fec5c8/evidence/`.
`RECEIVING-FIXTURE-BINDINGS.json` records their exact published bytes and the four
unchanged original fixtures. The retrieval tool appended one LF to each new
input; only that LF was removed, and each result had to match the published
length and SHA256 before copying. Raw retrieved inputs remain in the external
evidence. No fixture body or original golden was regenerated or formatted.

The receiving corpus exercises all ten public parsers with 130 cases per CJS,
ESM and actual browser execution. It includes direct campaign/list/preview/check
envelopes, stage receipt versus stage read, expected resource/revision/client
refusals, reserved metadata routing, immutable JSON copying, non-finite/cyclic/
accessor input, bounded collections and historical tests after current-version
rollover. Historical tests remain data, not approval. A successful parse grants
no actor, tenant, sender, current-client or delivery authority; HTML remains
untrusted and parsing performs no native operation. The consumer imports only
the two governed public paths, and private receiving subpaths stay refused.

The original namespace-only case is intentionally evaluated with the 38 names
recorded in its unchanged golden. `public-namespace.mjs` declares that projection
and the eleven receiving additions. Separate checks require all 49 current
named exports in CJS, ESM and the browser, so the compatibility projection cannot
hide missing or extra current exports. All other 115 legacy outputs remain
unchanged. The browser graph requires six packed modules and five local test
inputs, with no external or Node imports, no page requests and no page errors.

The imported receiving corpus is retained as one immutable upstream fixture;
its large function is qualification data/procedures, not a production owner or
a new validator. Its exact-byte identity and all case names/counts are checked.
Authored runners keep namespace projection, declarations and browser resource
lifetime separate, reuse the existing synchronous synthetic clock, and do not
change application behavior. Source-size review details and actual run receipts
are recorded in the receiving consumer evidence packet. This package does not
claim the producer's native methods, original43 runtime UI facets,37 historical
frontend tests, deployment or full application acceptance.
