# M2 first slice: admitted conversation discovery

Base: frontend `e5f1f263f94ede9b785e4eabc3a5afe84b0f03c2`; Core audit base `ca4de503fb6ec09caf0daf8b976a0f649c6b9665`.

## Bounded implementation

The ordinary `/meri/conversations` route receives the existing published `conversation-history/1.0.0` list through the canonical proxy and query owner. It reuses account/client admission, pagination, no-store reads and current-access revalidation. The browser filters only the loaded pages by receipt creation date or canonical conversation ID. Opening a result retains both client and conversation selectors and goes through the existing session/transcript authority. This route issues no bootstrap, admission, submit or lifecycle mutation.

The current public discovery DTO has no title, status or server search field. The list therefore displays receipt dates and IDs, and does not invent titles, status, whole-history search, management mutations or cross-client authorization. The client selector remains on the list route and retires the prior mounted filter when account/client scope changes. Existing New conversation records/reconciles its original Core request; its preview/client guards remain intact.

Responsibilities: `features/meri/conversations` owns mounted presentation; `shared/meri-conversations` retains public receiving, query scope and navigation hints; Core/Meri retain authorization and durable history. `packages/ui/command` exposes the already-adopted shadcn/cmdk source. No dependency, lockfile, public-contract or schema change.

## Full M2 ticket checklist

- MF-09: existing list/transcript/New Chat recovery audited. This slice mounts list, loaded-page filtering and switching. Server title/search/pagination improvements and revision/idempotency-protected rename/archive/restore/delete remain OPEN pending a published owner contract and retention semantics. Native service and live acceptance remain OPEN.
- General/client binding: HELD. Core bootstrap receipt clientId is non-null; current-authority and the runtime action-session require a client. Existing null-client prospect/research records must not be interpreted as General. Immutable binding must be protected against legacy reassignment. No nullable DTO shortcut, schema edit or runtime guard removal in this slice.
- MG-05: OPEN. Automatic canonical context requires current Core reader provenance, bounded runtime assembly, per-result walls and measured context cost. General memory must remain personal/firm only. No runtime work in this slice.
- MG-02: OPEN. Existing input/history metadata retained, but fourteen selected workflows and exact normalized receipts through every lifecycle require installed workflow/runtime qualification. No parallel registry or implicit keyword launch.
- MF-19 context: OPEN. Canonical cross-module source IDs, fresh identity, explicit draft visibility, invalid/stale rejection and no automatic dispatch require the shared receiver contract. Completion links stay with M5.
- PF-02: OPEN. Agent 3 owns ClientMeriActions.tsx. Receiver capability must prove current bootstrap/admission and client/actor/tenant epoch; no enabled CTA or confidential URL draft before that receipt exists. Existing navigation alone is not its acceptance.
- Motion: Figma spec COMPLETE at node `3141:40968` in Shared UI patterns `1103:280888`; no production library adoption claimed. Motion/Animate UI/Sonner code adoption, pins, hashes and reduced-motion checks remain OPEN for their affected surfaces. cmdk uses existing pinned `1.1.1`, MIT; shadcn source/hash already recorded in `packages/ui/provenance.json` and notices.

## Design

Reference: [01.05 search and command palette](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=1064-144529). Design context and screenshot obtained before edits. This is a bounded ordinary discovery adaptation: current contract supplies dates/IDs, and the full-page list omits unavailable artifact/routine results. Reuses shared shell, fonts, wordmark and controls. Exact result icon downloaded to public/design/m2-conversations/conversation.svg. The new list has no geometry animation.

[Shared Motion specification](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3141-40968): timings, easing, enter/exit, focus, interruption, no loops, receipt semantics and saved/system reduced-motion policy. A2 may consume this reference.

## Allocations and gates

Parent approved exact exceptions: `apps/web/src/shared/shell/ConversationRecents.tsx`, `Sidebar.tsx`, `MeriMobileNavigation.tsx`; new `apps/web/src/app/meri/conversations/page.tsx`; `packages/ui/package.json` adding only `./command`; `scripts/architecture/dependencies.mjs` adding only its existing primitive public-export entry; `apps/web/test/browser/main.tsx` adding only the synthetic list route. Mobile navigation currently receives the destination through the existing capability table and needs no direct edit.

Docker Linux, PostgreSQL 16, AWS/CodeBuild, native service, provider and live acceptance are Fable-run and NOT RUN. Acceptance remains STOPPED 2/6. No merges, deployment, database operations, provider effects or live chats occurred. Wave 2 deployment and Core migrations stay held until Fable posts S2 acceptance complete; review queues prioritize S2, then P1/C9, then Wave 2.

## Local source validation, 22 October 2026

- 90 focused unit cases in 10 files passed. All 8 new discovery browser cases and 7 existing history cases passed, including delayed identity replacement and unsent-draft round-trip coverage.
- Ten controlled mutants were caught in eleven checks; every changed source byte was restored before the final passing run. See [validation](VALIDATION.md) and the reproducible [mutation runner](mutation-check.mjs).
- Web typecheck, scoped ESLint and Prettier, public package verification, and architecture passed. Architecture reports 0 errors, 0 blocking findings, and 18 inherited unreviewed size findings; the new route is discovered.
- The additional raw-Node subset reports 23 passing tests and 2 module-load failures. The same extensionless-import failures reproduce using exact-base source and the same installed dependencies; they remain unresolved, not passed.
- Windows `next build` compiled, typechecked and generated the route, then exited 1 with `SecurityFatalError` for the pinned Next.js 16.4.0 security advisory. The build is FAILED, not qualified. No dependency upgrade or retry bypass was performed. Docker/Linux and shipping gates remain separate.
- Desktop and 390px phone screenshots were inspected after the final passing run. Long IDs wrap without horizontal overflow, keyboard selection opens the exact conversation, and the list has no geometry animation.
- Core remains unchanged at the audit base. Full M2 is OPEN; this is one source slice awaiting exact-head independent review and applicable gates.
