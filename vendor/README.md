# Public backend package inputs

These immutable npm artifacts come from deliberate public exports in the separate Meri backend. `meri-public-packages.json` binds producing commits, regular-entry counts, exact bytes and SHA256. They contain no credentials or private source data. Do not point a frontend dependency at a backend checkout, copy an editable schema/DTO or fetch an unpinned replacement from a private registry.

The0.1.0 distributions passed distinct independent source and packed-consumer review and are accepted for this offline migration. [Owner acceptance](../docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md) records the scope and review bindings. Updating them requires a reviewed producing commit, actual pack/entry/consumer verification and explicit metadata/lock updates. Wire contracts remain backend-owned. Existing0.1.0 schema bytes are unchanged; this work adds public distribution and trusted stream packaging, not new wire fields.

The contract validator is qualified for wire JSON parsed in the validator's own JavaScript realm. Arbitrary foreign-realm/prototype objects are not accepted as a supported integration boundary. No public package supplies server authorization or an authenticated endpoint.

## Current Shared distribution

`newsletter-public-packages.json` and `onboard-public-packages.json` bind the active
`capiro-shared-0.0.0-d68024dc-e92d6c6129f7.tgz` input. Both application and newsletter
qualification pins resolve this exact artifact from accepted Core source
`d68024dc62edddb0784f79b4e5ca50335dd1ca89`, tree
`0051653db4eb1bbd4b8f8e742cc22b11d25126bf`. It is 693,445 bytes with 288 regular
entries; SHA256 is `e92d6c6129f7c82b62b71086b81cbba6e0f57b786b41ba023017ca77b1c5c72e`.
The manifests and npm-generated lock bind its exact SHA512 integrity. Unchanged
version0.0.0 identifies the package convention, not the immutable distribution.

Release built and packed this source once and qualified the actual public
declarations, CJS/ESM imports, newsletter browser closure and targeted snapshot
invocation. Integration adopts those bytes without rebuilding. The two older
artifacts and their original provenance records remain unchanged historical
inputs. No registry publication or private source checkout is required.

Newsletter browser imports remain `@capiro/shared/newsletter` and
`@capiro/shared/newsletter-render`, closing over the same six packed newsletter
modules. A bound preview supplies both expected saved document and revision to
the public parser. The one-argument result is content-only in the type system;
it can retain valid supplied metadata at runtime, so field presence cannot prove
expected identity. HTML still requires the existing sanitation and isolation.
The actual rich-newsletter consumer is a separate paired change owned by Library.

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
[adoption and limits](../docs/wave3-ws15-distribution-20261026/BRIEF.md).

## Onboard provider inputs

Onboard's supported Stripe SDK inputs retain the exact native source-lock versions: `@stripe/stripe-js@5.10.0` and `@stripe/react-stripe-js@3.10.0`, both MIT. The root lock pins their public registry integrity. The public `/pure` entry delays provider initialization until an explicitly prepared payment intent is displayed. Provider confirmation remains an explicit user action; offline qualification sends no provider requests.
