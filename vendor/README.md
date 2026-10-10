# Public backend package inputs

These immutable npm artifacts come from deliberate public exports in the separate Meri backend. `meri-public-packages.json` binds producing commits, regular-entry counts, exact bytes and SHA256. They contain no credentials or private source data. Do not point a frontend dependency at a backend checkout, copy an editable schema/DTO or fetch an unpinned replacement from a private registry.

The0.1.0 distributions passed distinct independent source and packed-consumer review and are accepted for this offline migration. [Owner acceptance](../docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md) records the scope and review bindings. Updating them requires a reviewed producing commit, actual pack/entry/consumer verification and explicit metadata/lock updates. Wire contracts remain backend-owned. Existing0.1.0 schema bytes are unchanged; this work adds public distribution and trusted stream packaging, not new wire fields.

The contract validator is qualified for wire JSON parsed in the validator's own JavaScript realm. Arbitrary foreign-realm/prototype objects are not accepted as a supported integration boundary. No public package supplies server authorization or an authenticated endpoint.
