# Public backend package inputs

These immutable npm artifacts come from deliberate public exports in the separate Meri backend. `meri-public-packages.json` binds producing commits, regular-entry counts, exact bytes and SHA256. They contain no credentials or private source data. Do not point a frontend dependency at a backend checkout, copy an editable schema/DTO or fetch an unpinned replacement from a private registry.

The initial distribution candidates are exercised offline and await distinct independent review/integration acceptance. Updating them requires a reviewed producing commit, actual pack/entry/consumer verification and explicit metadata/lock updates. Wire contracts remain backend-owned. Existing0.1.0 schema bytes are unchanged; this work adds public distribution and trusted stream packaging, not new wire fields.
