# Packed newsletter consumer qualification

This workspace consumes the active immutable vendor artifact through public
`@capiro/shared/newsletter` and `@capiro/shared/newsletter-render` exports. Producer
code owns parsing; this workspace owns synthetic public import, declaration and
browser compatibility checks. No frontend runtime imports this test workspace.

The active input is `capiro-shared-0.0.0-d68024dc-e92d6c6129f7.tgz`, built once by
Release from Core `d68024dc62edddb0784f79b4e5ca50335dd1ca89`, SHA256
`e92d6c6129f7c82b62b71086b81cbba6e0f57b786b41ba023017ca77b1c5c72e`, 693,445 bytes.
`PUBLIC-ENTRY-BINDINGS.json` binds its twelve active JavaScript/declaration files
and preserves the complete previous artifact binding under `previousBinding`.
Vendor manifests retain both older tarballs and their immutable provenance.

`fixtures/receiving-positive.ts` is an active frontend adaptation: the bound
preview supplies expected document and saved revision; unbound content cannot
claim a pinned receipt, and partial expectations are rejected at compile time.
`RECEIVING-FIXTURE-BINDINGS.json` records its new bytes and original published
binding under `adaptedFrom`. No archived source fixture was changed. The other
receiving fixtures, original four fixtures,116-case renderer golden and130-case
receiving corpus remain byte-exact. Do not regenerate their expectations from
the candidate package. Their historical source remains recorded in
[package consumption](../../docs/newsletter-port-20261012/PACKED-CONSUMER.md).

`qualification.test.mjs` preserves the116 original renderer characterizations,
130 receiving cases per CJS/ESM, complete49-export namespace, private-import
refusals, fixture bindings and twelve installed entry hashes. The original
38-export projection keeps the immutable namespace golden meaningful; separate
checks enforce the complete current namespace. `declarations.mjs` compiles the
original and receiving fixtures in NodeNext/Bundler modes. The original negative
fixture expects two TS2345 and one TS2322; the unchanged receiving negative
expects two TS2345, three TS2322 and one TS2353. Positive fixtures also check the
expected compile errors for unbound-as-pinned and partial preview expectations.

Run after the canonical root install:

```sh
npm run test:newsletter
npm run test:newsletter:browser -- /tmp/new-newsletter-browser-proof
```

Both existing CLIs support `--help`, require a new evidence output directory and
preserve failures. Browser execution needs Root's separate allocation. Release
already qualified this exact artifact's six-module newsletter graph,116renderer
and130receiving cases in actual Chromium; reuse that evidence for unchanged
closures. The original Windows graph guard failed on path separators; Release
evaluated the same built bundle after normalized graph inspection, without a
rebuild. Do not label the broad root import pure: its snapshot path includes the
Vite node:crypto stub through internal-service-secret, outside this newsletter
closure.

Successful parsing does not grant tenant/client/actor authority, establish prior
write causation, prove HTML safety or authorize delivery. Unbound results can
retain valid metadata at runtime despite their content-only type. The real
consumer must bind identity from its submitted saved request and preserve
sanitation, sandbox and request lifetime. Integration's affected declaration and
byte checks do not establish the Library consumer, authenticated operation,
frontend image or deployment acceptance. See the current
[adoption brief](../../docs/wave3-ws15-distribution-20261026/BRIEF.md).
