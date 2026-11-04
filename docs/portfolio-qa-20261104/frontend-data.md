# Portfolio QA: client data and overview

Base: `36359c4868ce95cddd48439f2524555b4cfd004f`. Navigation depends on the separate prospect return-context helper change. No package, lockfile, schema migration, generation, or objective workflow changes are introduced in this frontend change.

## Ownership and behavior

- F02: existing typed opportunity/program query owners use a 25-second browser deadline and explicit source-specific retry. No automatic retry extends the wait. Explicit permission/session responses remain intact; loading/failure never becomes a zero count. Backend source performance and live integration remain separately owned.
- F04: saved structured evidence is checked for missing fact references and populated `no_evidence` sections. Defects get a visible review notice even for a saved approved record. Ordinary free-form limitations are labeled for review, not automatically declared contradictory. Every saved limitation and statement remains visible. Historical narrative cleanup requires authoritative source review; this change cannot infer which saved prose is superseded. PDF/generation behavior remains under its existing owner.
- F07: official action dates use one civil-date presentation in tracker table and drawer, including timestamps used by APIs to carry midnight date values. Tracked-at and hearing timestamps retain their timestamp semantics.
- F08: facility district presentation and evidence lookup normalization agree on Census delegate code 98 → 00 only for DC/AS/GU/MP/PR/VI. Unresolved sentinel/invalid districts are no longer labeled resolved. This establishes identifier identity, never current roster or access authority. Backend independently normalizes its facility consumers; award sentinel meanings are unchanged.
- F09: the investigation identified two authoritative tracker stores: Core `tracked_bill` and Intelligence `intel_tracked_bill`. Pulse passes the configured tracker owner, separates its cache and requires the same owner in the response before showing counts. Backend selects the corresponding table with the same active-client/wall population. Labels explain targeting topics alone do not count. Live deployment verification remains required. The separately owned Meri product-definition copy needs the same terminology when that repository is updated.
- F14: access/capacity in flight is shown as checking; confirmed restrictions remain separate. Layout GET uses its authenticated Core receipt and scope key instead of a mutation lifetime guard that may not yet be mounted. Save/reconciliation retains its current actor, receipt, revision and catalog checks.
- F15/F16/F17/F21: null historical client types use the canonical client/prospect classifier; search says profiles; prospect context hides client-only pulse, attention, customization, objective entry and reorder guidance; empty client result tables disappear.
- F18: pulse/source observation timestamps use local presentation, preparation source kinds are readable, and email source links do not expose opaque IDs. Free-form historical generated prose is preserved rather than heuristically rewritten.
- F19: accept backend `not_computed`; uncomputed/failed states never display a zero fit count. Confirmed computed empty results still show zero.
- F20 integration: overview prospect card/list and pipeline links carry validated filter context and remember the document scroll surface using the prospect owner's public helpers.
- Data gaps: client identity exposes a compact checklist of missing saved description, website, sector, primary contact, engagement date and funding priorities, linked to the existing administrator intake editor. No saved text is overwritten or judged truncated from appearance alone.

Small domain presentation helpers remain in their existing owners: opportunity reads, preparation review and bill date formatting. No general-purpose retry service or second authorization layer was added. Existing large UI containers were changed only in their existing composition responsibility; exact-head architecture review remains a root integration gate.

## Validation

Node 24.22.1; npm 11.9.0. Touched TypeScript/TSX ESLint: exit 0.

Targeted Vitest: 9 files, 122 tests passed:

```
npm run test --workspace @capiro/web -- tests/portfolio-data-quality.test.ts tests/capability-fit-coverage.test.ts tests/profile-evidence-contracts.test.ts tests/bill-hearings.test.ts tests/opportunities.test.ts tests/portfolio-layout.test.ts tests/meeting-preparation.test.ts tests/portfolio-index.test.ts tests/portfolio-metrics.test.ts
```

The F09 follow-up passed 86 tests across `core-session-authentication`, `portfolio-metrics`, `portfolio-fetch-noise`, `portfolio371-complete` and `portfolio-data-quality`; touched-file ESLint also passed. It tests selected-source proxy forwarding, exact source echo, cache separation and an actual-browser selected-owner/refusal scenario (browser execution reported by integration).

New regressions cover source deadline/retry/permission outcomes, null type/empty sections, district mapping, saved structured briefing inconsistencies, unknown fit versus zero, and action civil dates in three timezones. Rendering regression tests stub only the unrelated monogram module.

Full web typecheck passed at the initial data-fix commit with `NODE_OPTIONS=--max-old-space-size=4096`; an initial run before correcting the worktree dependency link failed to resolve the app-specific shared package. The integration owner records final combined typecheck, browser/visual/accessibility interaction and architecture results. No live tenant, fixture mutation, external model call or deployment was performed by this lane. Source behavior does not establish live service recovery or repair an existing approved synthetic artifact.
