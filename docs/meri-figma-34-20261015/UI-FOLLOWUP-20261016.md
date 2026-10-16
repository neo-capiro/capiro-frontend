# Meri UI follow-up — 16 October 2026

Source input: `meri/live-wiring-20261016` at
`2acbd89cf70a2d8bc70fa5be7059abb8d79ca6b2`, tree
`c1d85ee1420413904de2ab8a27b771d07f5ddc14`. Its reported UI base is
`c7e060007f5cd5a9b786442d0cc168a73c5565a8`. Backend handoff input:
`eca78d458acb46cbfd54a94cf870841d999ef6b1`.

## Ownership and implementation outline

This isolated `dot/meri-ui-followup-20261016` candidate owns only
`apps/web/src/features/meri/conversation/useLiveRun.ts`, the new sibling
`useRunCommands.ts`, and this follow-up/report correction. No shared registry,
HTTP, error, session, Settings source, package, lock, contract, provenance or
historical manifest changes are allocated. The frontend owner confirmed no
overlap; its sealed `9da3616a` and independent Objective/Plan candidate remain
separate.

`useRunCommands` will own the session-bound intent journal, command serialization,
transcript command state and the existing history/submit/cancel operations. It
will reuse `useCommandGate`, `sendRequest`, `requestStop` and the canonical query
journal. `useLiveRun` will compose those commands with the existing observation
hook, snapshot subscription and mount/unmount lifetime. Dependencies continue
from feature interaction to shared public adapters; backend authorization,
request identity, uncertainty and receiver contracts remain unchanged. This is a
responsibility extraction with no intentional runtime or presentation change.

Verification: reproduce the architecture finding on the input; compare the
unchanged scanner after extraction and with the original hook restored; inspect
the full diff; run focused Meri/Settings browser cases, relevant existing unit
checks, lint/format and the default production build/full typing when Shipping
grants a bounded slot. Retain every failed result. An isolated source candidate
does not establish integration, live backend, accessibility or deployment
acceptance.

## Open gates

- Shipping has held compiler, browser, database and npm launches due to host
  memory pressure; no heavy suite has run in this lane.
- L3 owner reports no reviewed list/history routes yet. Recent/search and
  earlier-turn history after reload remain unavailable pending exact routes,
  public exports and parent acceptance. No routes or DTOs are invented here.
- Existing accessibility incomplete items, untested states and historical
  evidence remain open. This refactor does not close them.
- Parent messaging currently returns `thread not found`; peer coordination
  works. Final source/evidence will also be reported to the Meri qualification
  coordinator.
