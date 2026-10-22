# A1 Settings frontend acceptance — 2026-10-21

Base: `24316f913e6082cf33fb0049c1187dc64097975f` (`main`). Initial source checkpoint: `ff56b0e787f437b5bec8cf2850287b481bed72ea`; this follow-up fixes review findings and completes evidence. No push, merge, deployment, feature enablement, AWS access, OAuth/token handling, or shared registry/configuration changes are part of this work.

## Bounded changes

- **ST-01:** `settings.branding.update` accepts name only. Dedicated logo upload/confirm operation shapes are preserved. Backend storage ownership, expiry, HEAD validation and signed-read negatives are owned by the Settings backend change.
- **ST-24 A1:** Team invitation/resend/removal/role/billing permissions; HQ tenant create/delete/admin resend/comp/provider key/model/broadcast; integration disconnect; mapping single/bulk/manual/contractor decisions; analyst reconciliation/alias/merge/personnel/quarantine decisions.
- Fields and action controls freeze while pending, dialogs refuse all dismiss paths while busy, requests snapshot their target/payload and receive the existing scope signal. Bulk mapping confirmation captures IDs and checks cancellation before each dispatch. Existing protected-member hiding and disabled impersonation remain intact.
- Success requires a semantic receipt or an exact readback. HQ administrator resend consumes the paired backend's `{invitationId, tenantId, email, role: "user_admin"}` receipt, with canonical email matching. Team resend captures original email/role before dispatch, then verifies the returned fresh invitation ID through the existing invitations read.
- The existing QueryClient stores one pending record per Settings section; sessionStorage retains only actor/session/org-scoped nonsecret recovery metadata, request digest, target IDs and whitelisted expected values. No credential, message text, email or replayable full payload is persisted. Attempt IDs prevent stale completions from erasing newer records. The selected client is a navigation hint: a changed Capiro API lifetime cancels callbacks but preserves the tenant-wide uncertainty fence.
- Reconciliation is explicitly read-only. Failed writes after acceptance, malformed/mismatched receipts, timeouts, aborts and 5xx remain unknown. Definite API rejection before acceptance unlocks. A denial during post-write readback remains unknown.

## Verification

Final focused suite: **43/43 passed**, comprising 31 receipt/recovery/bulk tests, 10 real-hook lifecycle cases, and 2 real-form tests. The scope lifecycle cases cover target, selected-client API lifetime, actor, organization and session changes. Tests use native React rendering and the real mutation/action hooks, QueryClient and Settings components; only provider/API boundaries and shared display primitives are mocked. No live provider effects occurred.

The exact-base behavioral red check restored these 3 production files from the stated base while retaining the new test harness: `shared/capiro/operations/settings.ts`, `features/settings/components.tsx`, and `features/settings/hq/TenantDialogs.tsx`. The branding-object-field, busy-dismissal and pending-field tests all failed with expected assertion failures (**3 failed**). Restoring fixed production sources returned them to green. No import/missing-module failure is counted as regression evidence.

**21/21 controlled production mutations killed, covering all 43 new test cases.** Each mutation ran independently and its source was restored. The receipt bypass causes 19 independent negative/normalization cases to fail. The scope-abort mutation was repeated after expansion and causes all 5 lifetime variants to fail. All other mutations cause their selected test to fail. [Machine-readable results](mutations.json) identify the selected test patterns; no compile/import failure is counted as a killed mutant.

| Deliberate regression              | Failed test cases | Test selection                                                                                |
| ---------------------------------- | ----------------: | --------------------------------------------------------------------------------------------- |
| branding-object-fields             |                 1 | generic branding writes                                                                       |
| receipt-target-bypass              |                19 | One of: rejects a mismatched; canonicalized invitation; HQ resend binds; unqualified security |
| member-readback-value              |                 1 | readback confirms the exact member                                                            |
| queue-absence-is-success           |                 1 | requires exact resolved queue                                                                 |
| cancelled-readback-dispatch        |                 1 | refuses cancelled readback                                                                    |
| unsupported-reconciliation-unlocks |                 1 | never treats absence of a durable                                                             |
| ambiguous-errors-unlock            |                 1 | only definite API rejection                                                                   |
| snapshot-reference                 |                 1 | captures a frozen request                                                                     |
| persistent-payload-leak            |                 1 | retains only exact target IDs                                                                 |
| corrupt-journal-unlocks            |                 1 | corrupt recovery records                                                                      |
| resend-address-not-bound           |                 1 | a resend requires the returned                                                                |
| old-completion-clears-new          |                 1 | a late completion cannot erase                                                                |
| bulk-continuation-after-cancel     |                 1 | a bulk decision freezes                                                                       |
| dispatch-input-reference           |                 1 | double submission dispatches once                                                             |
| lost-reload-fence                  |                 1 | a mismatched successful receipt stays                                                         |
| late-scope-success                 |                 5 | scope change cancels                                                                          |
| readback-denial-replays            |                 1 | a readback denial after an accepted                                                           |
| reconciliation-wrong-value         |                 1 | read-only reconciliation unlocks                                                              |
| definitive-denial-stays-held       |                 1 | a definitive rejected write clears                                                            |
| busy-dialog-dismiss                |                 1 | all dismiss paths are ignored                                                                 |
| pending-form-editable              |                 1 | tenant creation freezes fields                                                                |

The deliberate changes respectively restore arbitrary logo fields; bypass receipt confirmation; ignore member role; treat missing resolved queue rows as success; remove readback cancellation; unlock unsupported outcomes; classify 5xx as definite; retain input by reference; persist private payload; discard corrupt metadata; ignore resend email; clear newer records; continue cancelled bulk work; dispatch mutable input; discard reload metadata; omit scope abort; unlock after readback denial; ignore billing value; retain a definite-rejection lock; allow busy dismiss; and enable pending tenant fields.

Additional checks: all 31 edited TypeScript/TSX sources parsed successfully with zero duplicate JSX attributes; Prettier passed on all 31; `git diff --check` passed. The focused `--noResolve` scan found no undeclared local identifiers or duplicate JSX attributes after review fixes. It is **not a typecheck pass**: missing imports produce indeterminate inherited row-type and CapiroApiError narrowing diagnostics. Full app typecheck was attempted but cancelled under shared host resource constraints.

### Reproduction and runtime qualification

Actual local command: `node --max-old-space-size=1024 node_modules/vitest/vitest.mjs run --config .tmp-settings-vitest.mts` (one worker). Mutants additionally use `-t` with the table's selection. The temporary configuration is not tracked:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      {
        find: /^zod$/,
        replacement: fileURLToPath(
          new URL("./node_modules/zod/v4/index.js", import.meta.url),
        ),
      },
      {
        find: "@clerk/nextjs",
        replacement: fileURLToPath(
          new URL("./apps/web/test/browser/clerk.tsx", import.meta.url),
        ),
      },
    ],
  },
  test: {
    include: ["apps/web/src/features/settings/*.test.ts"],
    environment: "node",
    maxWorkers: 1,
    minWorkers: 1,
  },
});
```

Borrowed local runtime: Node 24.19.0, React/ReactDOM 18.3.1, Vitest 2.1.9, TypeScript 5.5.4, jsdom 26.1.0, React Query 5.59.13, and Zod 3.25.76's bundled `zod/v4` export. This does **not** qualify the repository's exact pinned React 19.3/Vitest 4.1.11/TypeScript 5.9.3/Zod 4.6.5 dependencies. Tests are included by the existing `test:capiro` feature-test glob; no shared test configuration was edited.

## Recovery limits and outstanding gates

- Unknown invite, tenant creation, broadcast send and credential rotation have no durable server request identity to establish the exact attempt after a lost response. The UI retains the fence and offers read-only checking; it never silently retries. Some analyst/mapping outcomes also remain held when the available exact receipt/read does not prove completion. This is a conservative hold, not a complete operational recovery workflow.
- Recovery metadata survives navigation and reload in the same browser tab/session. It is not a cross-tab or server-side idempotency system. Security authority remains server-owned. Bounded queue/audit reads inspect at most 20 pages of 100; failure to establish the exact target leaves the record held.
- Nonsecurity ST-24 forms remain A2: personal title/contact/signature/branding-name presentation, general profiles and billing handoff. OAuth connect/register behavior is preserved; only integration disconnect receives these changes.
- Exact dependency install, full typecheck/build/lint, real browser interaction/accessibility/visual parity, direct staging negatives, and live ASSETS_BUCKET/IAM/CORS qualification remain unrun. Backend direct service/HTTP negatives are separate acceptance evidence. Nothing is enabled by this frontend change.

## Design and architecture review handoff

The Settings parent agent reviewed the receipt/readback gates, attempt-ID guard, authority scope and cancellation flow without finding a further blocker. Its component review found duplicate JSX attributes and unlocked Alias controls; this follow-up corrects them, preserving the original permanently disabled impersonation controls. New logic remains Settings-specific: receipt comparison, read-only reconciliation, nonreplayable metadata, and the existing action-hook adapter each have one responsibility. Existing form components retain their ownership; no shared state framework or authorization mechanism was introduced.

The focused repository scanner reports **36 size findings across 25 changed files**. [Exact findings and fingerprints](size-findings.json) are provided for review. Fable owns `docs/architecture-size-reviews.json`; it was not edited. Formal review/manifest registration is an outstanding gate, not waived by the implementation review.

Parent Figma source audit: it loaded the Figma design-to-code skill and Portfolio/shared guidelines, and retrieved full design context plus screenshots for 15 exact Settings frames: `1064:244607`, `1064:244732`, `1064:244275`, `411:78057`, `411:78767`, `411:78602`, `411:78250`, `411:76239`, `411:77538`, `411:77237`, `411:75937`, `411:76476`, `411:75615`, `411:75020`, `411:74020`. This delta adds no colors, inline styles, CSS, assets, dependencies or shell changes; notices compose the existing SettingsNotice/SettingsButton primitives. This is source/design audit evidence, **not rendered browser parity**.

## Changed files

- `apps/web/src/features/settings/IntegrationSettings.tsx`
- `apps/web/src/features/settings/InviteMember.tsx`
- `apps/web/src/features/settings/SettingsMutationNotice.tsx`
- `apps/web/src/features/settings/TeamSettings.tsx`
- `apps/web/src/features/settings/analyst/AliasManager.tsx`
- `apps/web/src/features/settings/analyst/AuditAndQuarantine.tsx`
- `apps/web/src/features/settings/analyst/MergePrograms.tsx`
- `apps/web/src/features/settings/analyst/PersonReviewQueues.tsx`
- `apps/web/src/features/settings/analyst/ProgramMatchQueue.tsx`
- `apps/web/src/features/settings/analyst/ReconciliationQueue.tsx`
- `apps/web/src/features/settings/components.tsx`
- `apps/web/src/features/settings/hq/AiKeysSettings.tsx`
- `apps/web/src/features/settings/hq/BroadcastDetail.tsx`
- `apps/web/src/features/settings/hq/BroadcastSettings.tsx`
- `apps/web/src/features/settings/hq/CustomerSettings.tsx`
- `apps/web/src/features/settings/hq/TenantDialogs.tsx`
- `apps/web/src/features/settings/hq/TenantSettings.tsx`
- `apps/web/src/features/settings/mappings/AttachFederalRecord.tsx`
- `apps/web/src/features/settings/mappings/ContractorIdentity.tsx`
- `apps/web/src/features/settings/mappings/MappingReview.tsx`
- `apps/web/src/features/settings/mappings/MappingSettings.tsx`
- `apps/web/src/features/settings/mappings/bulkReview.ts`
- `apps/web/src/features/settings/security-action.test.ts`
- `apps/web/src/features/settings/security-form.test.ts`
- `apps/web/src/features/settings/security-write-journal.ts`
- `apps/web/src/features/settings/security-write-reconciliation.ts`
- `apps/web/src/features/settings/security-writes.test.ts`
- `apps/web/src/features/settings/security-writes.ts`
- `apps/web/src/features/settings/useSettingsMutation.ts`
- `apps/web/src/shared/capiro/operations/settings-admin/hq.ts`
- `apps/web/src/shared/capiro/operations/settings.ts`
- `docs/a1-settings/VERIFICATION.md`
- `docs/a1-settings/mutations.json`
- `docs/a1-settings/size-findings.json`
