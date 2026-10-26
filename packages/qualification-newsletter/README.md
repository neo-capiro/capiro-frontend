# Packed newsletter consumer qualification

This workspace consumes the active immutable vendor artifact through public
`@capiro/shared/newsletter` and `@capiro/shared/newsletter-render` exports. Producer
code owns parsing; this workspace owns synthetic public import, declaration and
browser compatibility checks. No frontend runtime imports this test workspace.

The active input is `capiro-shared-0.0.0-3b4937ad-40ac9d745261.tgz`, built once by
Release from Core `3b4937ad2f5d15b85ea1c4474ed48b4a39e2f0ac`, SHA256
`40ac9d74526123da69c321a537a8ec842960ee226acb53e41c0c8d5d65563598`, 696,105 bytes.
`PUBLIC-ENTRY-BINDINGS.json` binds its twelve active JavaScript/declaration files
and preserves the complete previous artifact binding under `previousBinding`.
Vendor manifests retain all older tarballs and their immutable provenance.

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
qualified the prior d680 artifact's six-module newsletter graph,116renderer
and130receiving cases in actual Chromium. Those exact module bytes are unchanged
in this artifact, so Release reuses that evidence without a browser rerun.
The original Windows graph guard failed on path separators; Release
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
[adoption brief](../../docs/wave3-ws13-distribution-20261026/BRIEF.md).

## WS13 saved Newsletter projection continuation

The Core3b4937 artifact adds the accepted saved Newsletter plaintext-v2 projection
in the existing public Workspace saved-revision owner. Its package manifest and
exports are unchanged. Only that module's source/JS/declaration/maps differ from
d680; the twelve WS15 newsletter JS/declaration files and accepted consumer source
remain unchanged. Release qualifies13 WS13 public runtime cases,15 WS15 preview
cases and public declarations in NodeNext/Bundler; prior six-module browser
evidence is reused by byte identity, not rerun. The initial12/13 runtime probe
failed on Node synthetic ESM __esModule metadata; Release corrected only that
probe and retained the failure. No package/source rebuild followed.

The Workspace HTTP producer supplies projectionVersion and projectionHash for
the selected saved revision. Library owns the separate basic staging consumer
that must display and retain that exact identity; no frontend serializer/hash or
private import is introduced here. Existing public fixtures and hash assertions
remain intact, with active artifact metadata advanced and prior bindings retained.
Ordinary-role PostgreSQL, paired staging, whole application and deployment
acceptance remain open. The broad-root node:crypto stub caveat still applies.
