# Public backend package inputs

## Active web Strategy intake distribution

The web workspace now pins `capiro-shared-0.0.0-intake-20d1482b-caf21b735806.tgz`.
`strategy-intake-public-package.json` records its exact bytes and composition from
the prior procurement artifact. The standalone browser-safe `strategy-intake.ts`
is copied exactly from Core commit `20d1482b90a700de87484cd6dce1d5ef5df99d51`
and strictly compiled with TypeScript 5.9.3, including declarations. Its public
`@capiro/shared/strategy-intake` export and `typesVersions` match that producer.
All 291 other predecessor entries remain byte-identical; the package manifest
adds only this subpath, and three source/runtime/declaration files are added.
This composed artifact is not a full distribution of the Core commit.

The existing procurement verifier remains authoritative for the historical
predecessor. The active check verifies that chain, the new emission, every
installed entry, and the web manifest plus nested lock binding. Root/newsletter
Shared pins retain their existing separate distribution. Run
`node scripts/strategy-intake-public-package.mjs` after installation and
`node --test scripts/strategy-intake-public-package.test.mjs scripts/procurement-public-package.test.mjs`.
The active verifier also runs through `npm run check:packages` and the previous
procurement CLI. Packed CJS/ESM imports, NodeNext/Bundler declarations and the
Objective consumer tests qualify this source binding. Product builds, browser,
provider, database and deployed acceptance remain separate gates.

These immutable npm artifacts come from deliberate public exports in the separate Meri backend. `meri-public-packages.json` binds producing commits, regular-entry counts, exact bytes and SHA256. They contain no credentials or private source data. Do not point a frontend dependency at a backend checkout, copy an editable schema/DTO or fetch an unpinned replacement from a private registry.

The0.1.0 distributions passed distinct independent source and packed-consumer review and are accepted for this offline migration. [Owner acceptance](../docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md) records the scope and review bindings. Updating them requires a reviewed producing commit, actual pack/entry/consumer verification and explicit metadata/lock updates. Wire contracts remain backend-owned. Existing0.1.0 schema bytes are unchanged; this work adds public distribution and trusted stream packaging, not new wire fields.

The contract validator is qualified for wire JSON parsed in the validator's own JavaScript realm. Arbitrary foreign-realm/prototype objects are not accepted as a supported integration boundary. No public package supplies server authorization or an authenticated endpoint.

## Current Shared distribution

`newsletter-public-packages.json` and `onboard-public-packages.json` bind the active
`capiro-shared-0.0.0-3b4937ad-40ac9d745261.tgz` input. Both application and newsletter
qualification pins resolve this exact artifact from accepted Core source
`3b4937ad2f5d15b85ea1c4474ed48b4a39e2f0ac`, tree
`122b0c926a6a6f864c9aed36d8f5be465064976e`. It is 696,105 bytes with 288 regular
entries; SHA256 is `40ac9d74526123da69c321a537a8ec842960ee226acb53e41c0c8d5d65563598`.
The manifests and npm-generated lock bind its exact SHA512 integrity. Unchanged
version0.0.0 identifies the package convention, not the immutable distribution.

Release built and packed this source once and qualified the actual public
declarations, CJS/ESM imports and targeted saved-revision runtime behavior. Browser
and snapshot evidence is reused from the prior artifact for unchanged bytes.
Integration adopts those bytes without rebuilding. The three older
artifacts and their original provenance records remain unchanged historical
inputs. No registry publication or private source checkout is required.

Newsletter browser imports remain `@capiro/shared/newsletter` and
`@capiro/shared/newsletter-render`, closing over the same six packed newsletter
modules. A bound preview supplies both expected saved document and revision to
the public parser. The one-argument result is content-only in the type system;
it can retain valid supplied metadata at runtime, so field presence cannot prove
expected identity. HTML still requires the existing sanitation and isolation.
The accepted rich-newsletter consumer remains paired with these unchanged newsletter modules.

The broad root export also serves existing exact snapshot import exceptions and
server-only Onboard pricing. Its Vite graph includes a `node:crypto` browser stub
through `internal-service-secret`; the working snapshot invocation does not make
that root the pure six-module newsletter closure. No root-wide browser import
permission is granted by this artifact adoption. Onboard's two pricing strings
match the previous artifact; its server-only owner still serializes those strings
to clients. Preserve final client-chunk exclusion and the scoped import policy.

The existing qualification workspace binds twelve active JS/declaration entries
to the new artifact and retains prior bindings as historical metadata. Its active
positive receiving fixture now distinguishes bound receipts and unbound content;
original producer corpora, goldens and other fixtures remain byte-exact. See
[adoption and limits](../docs/wave3-ws13-distribution-20261026/BRIEF.md).

## Onboard provider inputs

Onboard's supported Stripe SDK inputs retain the exact native source-lock versions: `@stripe/stripe-js@5.10.0` and `@stripe/react-stripe-js@3.10.0`, both MIT. The root lock pins their public registry integrity. The public `/pure` entry delays provider initialization until an explicitly prepared payment intent is displayed. Provider confirmation remains an explicit user action; offline qualification sends no provider requests.

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
