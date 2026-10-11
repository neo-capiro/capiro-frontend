# Capiro 3.1 Portfolio row reconciliation

Updated 2026-10-11T18:58:39Z. The Portfolio frontend is merged in [PR #4](https://github.com/neo-capiro/meri-greenfield/pull/4) at `abb4c72ee5775f64fca78341e067834d604fdc2f`; its isolated preview service is healthy with image `sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c`. Clerk subdomain, traffic DNS and signed-in acceptance are pending. **No row has final acceptance.** The row-level deltas below were recorded on the earlier code checkpoint and are not a new full re-audit.

The [complete 345-row ledger](./Portfolio-345-Row-Reconciliation-2026-10-11.json) preserves each phase-map and implementation-matrix row verbatim and adds a separate continuation delta, evidence scope, and acceptance state. Rows without a delta are the packet snapshot carried forward, not a fresh live re-audit.

| Phase | Rows |
| --- | ---: |
| P0 | 7 |
| P1 | 50 |
| P2 | 54 |
| P3 | 95 |
| P4 | 32 |
| P5 | 17 |
| P6 | 90 |

Packet snapshot states: 265 partial frontend checkpoints; 72 without current frontend implementation; one inactive backend billing candidate; seven packet exclusions. Current disposition: 337 open, seven packet exclusions pending scope reconciliation, one additional user exclusion (`CORE-018` CSV import), zero accepted complete.

## Continuation deltas

| Audit ID | Evidence kind | Current checkpoint |
| --- | --- | --- |
| `CORE-018` | user scope decision | The user confirmed on 2026-10-11 that CSV import is not required. The existing harness-only importer is not a release or acceptance requirement and receives no new UI entry. |
| `CORE-002` | local frontend slice | Search and filtering now use stored intake city/state and all ordered intake sectors; human-readable sector labels display on cards/list. The row remains partial. |
| `CORE-078` | local frontend slice | Authorized Manage billing link reaches configured existing-app /settings/billing from the billing disclosure. Provider portal and billing activation were not verified. |
| `ENG-prep_sender_select` | contract review only | Current single-mail send lacks senderConnectionId and picks latest connected mailbox; exact sender choice needs an owner contract. |
| `CORE-049` | contract review only | Activity API can store a basic commitment kind/dueAt, but does not represent the full Quick log commitment and follow-up flow. |
| `CORE-096` | contract review only | Quick log plus follow-up task has no approved atomic or durable partial-result contract. |
| `ENG-tasks_create` | contract review only | Current separate Planner task APIs do not prove a canonical one-submit Quick log follow-up task. |
| `PROS-019` | contract review only | Current attachment APIs have no authoritative prospectId for prospect Files listing/search/open. |
| `PROS-020` | contract review only | Current attachment APIs have no authoritative prospectId for prospect upload. |
| `PROS-021` | contract review only | Workspace drafts currently bind only a free-text client label, not a prospect identity. |
| `CORE-099` | contract review only | Core stores one account owner plus an unranked team; an atomic, versioned Primary–Quaternary contract and migration need backend owner agreement. |
| `OBJ-26` | contract review only | Client Calendar/Files routes exist, but no objective-bound destination identifiers or verified native Strategy objective URL contract exist. |

The two frontend slices are now in merged source. The nine contract reviews are read-only. `CORE-018` was excluded by the user's direct scope decision; no new CSV entry is required. The exact merged source passed 728 unit cases, 459 browser cases and its production image build; signed-in native behavior, integrated Figma parity, owner contracts, provider scope and P7 acceptance remain open where applicable.

No packet state or baseline blocker was silently overwritten. The current blocker for a changed row is recorded in `continuation_delta.remaining_gate` beside the original blocker.
