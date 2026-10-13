# Public backend package inputs

These immutable npm artifacts come from deliberate public exports in the separate Meri backend. `meri-public-packages.json` binds producing commits, regular-entry counts, exact bytes and SHA256. They contain no credentials or private source data. Do not point a frontend dependency at a backend checkout, copy an editable schema/DTO or fetch an unpinned replacement from a private registry.

The0.1.0 distributions passed distinct independent source and packed-consumer review and are accepted for this offline migration. [Owner acceptance](../docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md) records the scope and review bindings. Updating them requires a reviewed producing commit, actual pack/entry/consumer verification and explicit metadata/lock updates. Wire contracts remain backend-owned. Existing0.1.0 schema bytes are unchanged; this work adds public distribution and trusted stream packaging, not new wire fields.

The contract validator is qualified for wire JSON parsed in the validator's own JavaScript realm. Arbitrary foreign-realm/prototype objects are not accepted as a supported integration boundary. No public package supplies server authorization or an authenticated endpoint.

## Newsletter distribution

`newsletter-public-packages.json` binds the separate Capiro backend's private `@capiro/shared@0.0.0` artifact, built from `fe50dc1c2de1660a036e338cf81acdcf0f2fb26a` and distributed at `62d057b4a17b2c038920f10b93e83e51e46239bc`. Identify this input by its immutable SHA256/SHA512 and producing commits, not its unrevised version string. It is 510,772 bytes with 182 regular entries; SHA256 is `697d826647e88e7f8559da386be7de1ae6408dc61c73877b86c2e17275fd63ab`.

Only `@capiro/shared/newsletter` and `@capiro/shared/newsletter-render` are approved browser imports. They close over five pure packed modules; the artifact's other exports remain outside the frontend allowlist. The qualification workspace consumes these actual public entries. No application dependency or native operation is enabled by this addition. See [bounded consumer qualification](../docs/newsletter-port-20261012/PACKED-CONSUMER.md). Rich newsletter stage identities remain distinct from saved document-version identities.


The receiving continuation adds `capiro-shared-0.0.0-38fec5c8.tgz`,532,178bytes/SHA256 `3e435f280fac8fd301eb753e9fc7ead93691cf979fc1641792fedd88e1bfd6d5`, from source `38fec5c83585850ed75a7d3693b3b90d517e70af` and distribution `9ffab390ef444d7ea0bf4eb0d68224f810245e25`. It adds the producer's receiving parsers through the same public newsletter export and one internal packed receiving module. The former artifact remains byte-exact and separately bound. The manifest's `activeFile` identifies the current consumer input; neither unchanged version0.0.0 nor successful parsing grants runtime authority.
