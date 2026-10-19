# Portfolio meeting and client continuity

Base: `main` at `816b0f1470efe978d22856beee9c8133055ab5bd`, including PR105. Branch: `codex/portfolio-meeting-continuity-20261019`.

## Concrete changes

- `index/queries.ts` rejects a structurally valid client receipt whose ID differs from the requested client. This prevents a weaker feature query from admitting another client into the cache key also read by the selected-client provider. The shared provider is unchanged.
- `MeetingWorkspacePage.tsx` shows “No meetings in this month” only after the active feeds succeed and stop fetching. Loading and failure use the existing page statuses and retry controls.
- `MeetingDetail.tsx` and `MeetingForm.tsx` keep the open edit draft, disable Save during a detail/access refresh or failure, and expose a refresh action inside the editor. Cancel discards the local edit; reopening after a confirmed save reads the refreshed record.
- `mutations.ts` rechecks the live meeting query immediately before dispatch and after a receipt: exact meeting ID, successful idle read, no invalidation/error, and unchanged original client association. The original association is separate from the selected save destination, so intentional reassignment and explicit client clearing remain valid. A refusal before dispatch is retryable; a change during an issued write retains the existing uncertain-outcome behavior.

No new API contract, dependency, route, CSS, shared auth/client-provider/shell, Meri, Modules, Settings, Core, generated or deployment files were changed. No dead-code cleanup was needed.

## Duplicate-work review

Before editing, a fresh review of PRs updated since 2026-10-14 covered 89 PRs, ancestry, changed paths, and 138 remote branch heads. Eighty-eight PR heads were already contained in main. PR102 was the separate Meri intents change and had no Portfolio/meeting overlap. Fourteen non-contained remote heads were checked for unique patches; none owned this Portfolio work. PR103's still-open head was already contained; PR104 and PR105 were merged and contained.

The final main refresh remained at the base above. Newly opened PR106 owns Settings invitation/registration source, its tests, and its own evidence. Its approved review-record changes target `docs/architecture-size-reviews.json`; this lane does not edit that registry or absorb those sources.

## Validation

Run with Node 24.0.0 and one browser worker. Tests use synthetic local browser fixtures; no live service writes were performed.

| Check | Result |
| --- | --- |
| New meeting recovery cases plus existing receipt/client-clear cases | 11 passed |
| Receipt/client-clear cases after disabling the fixture query with `skipToken` | 7 passed, fixture console warning removed |
| Client query, Portfolio index and calendar native lifecycle units | 18 passed in 3 files |
| Affected-source TypeScript check, including changed test files and reachable imports | Passed |
| ESLint over changed source and test files | Passed |
| Prettier over changed source and test files | Passed |
| Architecture/dependency scan | Passed: zero dependency errors or blocking size findings; 516 reviewed and 18 inherited unreviewed findings |

The same-turn refresh/submission case was reproduced before the dispatch fix: Save issued a request and closed the editor. The fixed case verifies zero writes during pending/failed refresh, retained draft, successful refresh, and exactly one confirmed save. A separate case replaces the cached client association and submits in the same turn; no write is issued. Other cases cover initial loading versus failed versus genuinely empty meeting feeds, cancel/reopen, save/reopen, foreign receipts, pending-field locking, explicit client clearing, and unscoped creation.

Focused commands from `apps/web`:

```powershell
node ../../node_modules/@playwright/test/cli.js test tests/browser/calendar-meeting-recovery.spec.ts tests/browser/calendar-meeting-receipts.spec.ts tests/browser/calendar-client-clear.spec.ts --workers=1
node ../../node_modules/vitest/vitest.mjs run tests/portfolio-client-query.test.ts tests/portfolio-index.test.ts tests/calendar-native-lifecycle.test.ts --maxWorkers=1
```

From the repository root:

```powershell
node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit --project docs/portfolio-ui-continuity-20261019/portfolio-typecheck.tsconfig.json
node scripts/architecture.mjs
```

The full web typecheck was attempted once. It failed outside the owned files because the borrowed installed Meri contracts package lacks exports for `conversation-application`, `document-application`, `action-application`, `conversation-history`, and `conversation-initial-input`, with cascading Meri diagnostics. No installed dependencies, contracts or lockfiles were changed. The focused check uses the same web compiler settings and checks all reachable imports from this lane's changed sources/tests. Broad suites and cloud builds were not run.

## Review coordination

Independent source review found no remaining correctness objection. Four cohesive functions received new exact fingerprints: `MeetingWorkspace` (114 nonblank lines), `MeetingForm` (201), `MeetingWorkspacePage` (87), and `useSaveMeeting` (93). Their approved responsibilities and fingerprints are preserved in [proposed-size-reviews.json](proposed-size-reviews.json).

Coordination explicitly approved only those four records in `scripts/architecture/reviewed-size-findings.json`. They were reconciled after independent review, preserving every other record. The architecture scan then passed with no blocking findings. No size threshold or enforcement rule was changed, and the Modules registry remained untouched.

## Design and remaining limits

The current [Figma meeting Prep frame](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-%E2%80%94-Portfolio?node-id=1064-177692) was inspected with design context and its screenshot. This PR makes behavior repairs and does not claim complete visual parity. The failed-refresh editor state is captured in [meeting-refresh-recovery.png](meeting-refresh-recovery.png).

Exact outstanding Portfolio design requests for Neo: Meeting Notes with entered text, editing/unsaved affordance, and failed-save recovery inside the accepted client-calendar shell. Generic New Event types/fields separately need Neo/Core clarification. No substitute mockups were created.

Concurrent same-client server-field edits remain the inherited conflict-handling limitation: successful refresh retains the local draft, and the native save has no optimistic version precondition. This PR does not claim conflict resolution. Live Core persistence, deployment, and a full authenticated browser flow remain unverified. No main merge or deployment was performed.
