## 1. Claude handles the harness

The quality bar is Claude's own. Answer quality comes from the whole harness, not only the model: its system prompt, built-in tools, subagents, skills, context management and compaction, and session handling.

- Run `@anthropic-ai/claude-agent-sdk` with its **full harness** and the Claude Code system-prompt preset, plus a short Capiro/Meri append. Don't replace the preset with our own prose.
- Do not rebuild what the SDK or AWS already does: model calls, retries, streaming, the tool loop, context management and compaction, session resume/fork, per-run turn and spend limits, AWS credentials.
- The real Claude SDK calls Bedrock directly using its narrowly scoped AgentCore runtime IAM role. Preserve the full preset, native tools, subagents and all 14 skills.
- Capiro data reaches Claude as **tools** (rule 4), not as a custom retrieval layer around the model.

Spec and plan: `phases/wave2/WAVE2-00-CLAUDE-NATIVE-HARNESS-SPEC.md`. It is **Wave 2 item 0**, and it comes before every other item that touches the runner, the proxy or authority.

## 2. Simple, standard architecture

```text
browser -> control (current access, conversation/run ownership, durable events)
        -> AgentCore Runtime V1 (isolated conversation session; actual Claude SDK) -> Bedrock
                                      -> tool gateway -> Core
control -> existing durable SDK SessionStore and artifact owners
control -> Temporal for required durable runs, schedules and background work
```

- **Core is the gatekeeper for Capiro data.** Tenant, member, client and wall rules remain server-side in Core. Check current access at admission and actual tool/data/artifact access; revocation must also prevent use of previously loaded privileged context. Do not duplicate policy in the harness.
- Reuse one isolated environment only for the same immutable tenant/actor/conversation and approved General/client scope. Serialize turns; stop idle compute and restore exact SDK transcripts and artifacts from their durable owners. A Runtime session ID is not authorization or durable storage.
- Keep the SDK's per-run turn/spend limits and one canonical tenant cap/usage owner. Preserve required durable runs, schedules, consent, outcomes and uncertain-write fences; neither SDK Task tools nor a warm process replaces Temporal durability.
- **No custom warm pool, per-turn ECS task requirement, model proxy, duplicated per-hop authority, credential-minting service or spend-reservation ledger.** Use standard Runtime V1; no V2 snapshot machinery or second SDK implementation.
- Before adding a mechanism, identify the standard feature or existing owner it uses. Before deleting a wrapper, prove the retained lower-layer behavior with meaningful positive/negative tests. Do not remove canonical authorization, idempotency or durable outcomes as “extra security.”

## 3. Leave no dead code behind

A change is not done until what it replaced is gone.

1. **Delete in the same PR** everything the change makes unused: code, tests, fixtures, docs, config keys, env vars, feature flags, IAM statements, ALB rules, secrets, task definitions, CloudFormation resources, kit steps, alarms and metric filters. Applied database migrations are history: never edit them. Drop tables only through a separately reviewed forward migration after a snapshot; this hosting migration does not itself authorize schema/data removal.
2. **Temporary diagnostics come out before merge** of the fix they were added for. A log line stays only as named product telemetry that someone reads.
3. **No code behind a flag nothing turns on.** The "source-complete, activation-held" status is retired for code we don't intend to ship. Dark features need an owner and a date, or they are deleted.
4. **No** commented-out code, `legacy` or `_old` copies, compatibility shims for removed things, or "superseded" stubs.
5. **Show proof in the PR:** list the identifiers, files and resources deleted, with a search proving no executable/active caller remains; label immutable historical references, and explain any drop in test count.
6. **Old plan tickets for removed mechanisms are closed as superseded**, not implemented and left dormant. See `source-of-truth/SUPERSEDED-BY-ITEM-0.md`.
7. **Reuse before write.** Use SDK, AWS and library features first. Custom code needs one line saying what the standard option couldn't do.

## 4. Capiro data must keep working

- Capiro data is served to Claude as tools. Core remains the source: today's read families call Core at `/api/clio/tools/<operation>`, and the new tools call the same endpoints.
- Tools are hosted by **control** (the existing tool gateway) so the runner never holds the Core service secret (`x-internal-service-secret`). The runner gets only a short-lived per-run token for control, scoped to tenant, user, client, conversation and run.
- Reuse the existing read handlers under `apps/gateway/sources/*` and their typed schemas. Delete the authority, relay and measurement wrappers around them.
- Parity: every read family that works today must be reachable as a tool with the same results and the same permission outcomes. A parity checklist is part of the item 0 spec.
- Negative tests are mandatory: another tenant's data, another client's data, and walled data must not be retrievable, through chat or through tools. A General chat reads across the clients the user can already see, with each client's wall enforced per result (FINAL-PLAN decision 2).
- The original read-only first cut is historical. Neo subsequently authorized preview client-record writes and autonomous Wave 2 completion. Activate accepted writes through their existing authenticated domain/intent owners and receipts, with the actual route/configuration and effect semantics verified. This does not authorize the assistant to send external mail without the user's specific send instruction.

# WS10 immediate UI receiver trace — ready for allocation after producer acceptance

Read-only trace, 2026-10-26. **Consumer gaps confirmed; this is an allocation brief, not WS10 acceptance.** PR143 remains frozen for independent fixture review and Release's real PostgreSQL gate. No source changed and no tests, build, browser, database, provider or cloud execution occurred in this trace.

## Exact source boundary

- Core producer: PR143 `6f4f82145f797a9a1a4fffb4c33ee4c1a260c882`, tree `067b3660550b6aef306fc9275f40b8307f7b0458`, read through `C:/dev/hermes-w3-hillday-jobs-20261026`. Product/schema/migration remain correction2 `d408607c151905fd194f943984e58c42fc211bda`; 6f4f821 is the two-test-file fixture correction, whose acceptance/PG outcome this trace does not pre-empt.
- FE accepted default: `a76baa609302db93faf8d038096b7877e6890464`, tree `6aa6501b5253b9546e0ca24635587cdc95edee65`. Accepted FE179 package head: `9eb2e017f8775f8b31de7c89c0bfbff0c9bc586c`, tree `9097ff7ecb6186629a8251994263b66e56fd56ba`. Read immutable objects from `C:/dev/wave3-frontend-integration-20261026`.
- Both named-path comparisons were empty: a76 → 9eb and 9eb → observed Integration composition `3901ea710f4809376ada9be1f1763775f56c057f` (tree `06bde5876f5677bb0975fda25a9e9349ba543aa1`), restricted to the Hill Day directory, WorkspaceScreen, workspace-route, workspace-hillday operations and workspace-schemas. This proves these receiver preimages are unchanged; it is not acceptance of the entire observed composition.

Source paths below are repository-relative. Principal FE blob pins at all three snapshots:

| Path under apps/web/src/ | Blob |
|---|---|
| features/modules/workspace/hillday/HillDayGeneration.tsx | `4b023bfd9f7fa303356127afff050ba2de2d0eb4` |
| features/modules/workspace/hillday/HillDayWizard.tsx | `09c1f59cb2e6f05919f8304474cd5310e2d872ba` |
| features/modules/workspace/WorkspaceScreen.tsx | `87bc2541bb72373e7961b0cdc62e9badde95a8d3` |
| features/modules/workspace/workspace-route.ts | `2544c8bf05c088e79981c00ea3f24c293fbf6439` |
| shared/capiro/operations/workspace-hillday.ts | `5bf016495f79dc4b0ed124dcda55dbe3923d190f` |
| shared/capiro/operations/workspace-schemas.ts | `e00bb71a96e9d7488f4889d3c203e3873f1f62b8` |

## Actual producer contract to consume

Core paths are under `apps/workspace/src/hillday/`. Controller lines 230–288 mount these authenticated routes; `dto/hillday.dto.ts:156` validates the optional UUID requestId. `hillday.types.ts:282–340` defines:

```ts
type JobLifecycle = "queued" | "running" | "complete" | "failed" | "cancelled";
type UnitState = "queued" | "running" | "done" | "failed" | "unknown";
type JobUnit = {
  meetingId: string; state: UnitState; sectionId: string | null;
  reason: string | null; at: string;
};
type JobStatus = {
  jobId: string; documentId: string; status: JobLifecycle; units: JobUnit[];
  quality: number | null; error: string | null;
  cancelRequestedAt: string | null;
  startedAt: string | null; completedAt: string | null;
};
```

| Route | Request/result and receiver meaning |
|---|---|
| POST /hillday/documents/:id/generate | Optional body `{requestId?: UUID}`; result `{jobId,status:JobLifecycle}`. Service :198–215 binds the same document/request identity to the same job, including terminal replay and aliases attached to an already-active job. The consumer must supply and retain its identity before dispatch. |
| GET /hillday/documents/:id/generation | `{job:JobStatus|null}`; service :280–289 checks current access, prefers active, otherwise newest finished. Discovery is not proof that a particular uncertain start committed. |
| GET /hillday/documents/:id/generate/:jobId | Full JobStatus; service :268–272 checks current access and the document/job binding. Existing polling can consume it. |
| POST /hillday/documents/:id/generate/:jobId/retry | No new generation body; returns JobStatus. Service :298–348 checks owner/access and deliberately requeues only failed/unknown units on that same job; successful/manual content is preserved. Queued/running or another active job can conflict. Unknown means prior provider outcome is unresolved; never imply zero prior work or automatic safe replay. |
| POST /hillday/documents/:id/generate/:jobId/cancel | Returns JobStatus. Service :351 onward distinguishes queued cancellation from running + cancelRequestedAt until the worker observes it; an in-flight provider call cannot be recalled. |

SSE already exists at the known-job events route (controller :291–333), with durable sequence readback. The minimal receiver can keep its existing polling owner; no second transport/queue is required.

## Six receiver seams and counterexamples

FE paths are under `apps/web/src/`.

| Seam | Concrete current source and smallest change | One meaningful counterexample / affected future witness |
|---|---|---|
| Exact start identity | `features/modules/workspace/hillday/HillDayGeneration.tsx:24–44` retains only acknowledged jobId and sends params only. `shared/capiro/operations/workspace-hillday.ts:349–357` uses strict params-only docRead. Accept the producer request body, retain an opaque request UUID with the exact document/current scope before POST, and recover that original request instead of minting another ID. Integration must explicitly supply the durable navigation/retention splice; no shared recovery-journal edit. | Start commits J, response is lost, J finishes before another click. Current retry sends no requestId, so Core may create J2. Assert reload/recovery retains the original UUID and reattaches J, including terminal response; an unrelated latest job is not exact-request proof. |
| Latest-job entry/readback | Generation :26–30 is disabled until local jobId exists. No latest operation or entry read exists. Add the actual latest DTO/GET, reattach its authorized job on saved-document entry, and feed the existing known-ID poller. Read failure is not “no job”; null is an explicit result. | Close the browser while J runs, reopen saved D with no local jobId: current component makes no status read. Assert latest/current D supplies J without a generate POST, then terminal progress stops polling. |
| Durable wizard route and saved selections | `hillday/HillDayWizard.tsx:122–131,153–154,263–285` keeps step/document/meetings locally and reports the created document to the host only from final Open. `WorkspaceScreen.tsx:93–120` routes a hilldayId directly to Editor; the wizard route has no document/phase. `workspace-route.ts:15–22,26–56,62–80` models only the editor identity. Add an explicit validated resume destination/phase, retain acknowledged D/client immediately, and bootstrap from existing authorized document reads before mounting the selected phase. | Save meetings, advance to Context, reload: current URL still opens a new wizard with empty document/meetings. Assert the same D and phase reopen with saved meeting identities/order and no create or empty replacement PUT. Do not claim recovery of an unacknowledged document-create POST; that is a separate contract boundary. |
| Full response schema | `workspace-hillday.ts:26–42` excludes cancelled/unknown and drops cancelRequestedAt/unit.at; generate response :356 accepts only queued/running. Align the local Zod receiver exactly with the producer shapes above, using the existing operation registry. | Recovered J is failed with one unknown unit, or already cancelled: current status parsing rejects an otherwise valid authoritative result. Assert all lifecycle/unit states, cancellation timestamp and terminal start replay survive parsing and render honestly. |
| Deliberate unit retry | Generation :59–68 labels a failed job “Try generation again” but invokes fresh start. Add the existing job-bound retry operation and explicit failed/unknown-unit action; preserve J, render unknown separately, and refresh/read back after an uncertain retry acknowledgement rather than automatically submitting again. | J has a done manual-edited section plus a failed unit. Current button starts whole generation; assert retry uses J's /retry endpoint, does not call /generate, and shows preserved done content plus only retried units. Unknown requires an explicit decision acknowledging uncertainty. |
| Honest cancellation | No local cancel operation/control exists. Add job-bound cancel, render running + cancelRequestedAt as cancellation requested, and keep reading until the actual terminal result. Do not optimistically display cancelled. | Provider work is already in flight: cancel returns running with a timestamp. Assert UI says requested, keeps observing J, and only shows cancelled when Core reports it; request failure/unknown is not claimed as success. |

All new local state/result callbacks must remain bound to the current document, canonical client and identity lifetime. The resume receiver must follow the existing Editor's document/client admission pattern (`HillDayEditor.tsx:348–362`), preserve the shared hooks unchanged, and discard late results after navigation/session changes. Include one pending-start/readback scope-switch witness; URL IDs are hints and never authority.

## Saved-selection reads and exact ownership

The existing `workspace.hillday.document` operation (`workspace-hillday.ts:139–146`) already reads the authoritative document. Core `hillday-document.service.ts:880–895,931–961` loads ordered persisted meetings and exposes name/client/timezone/lookback, sections with meetingId/eventId/number, generation lastJobId/status, plus weekStart and resolutionStatus. FE `workspace-schemas.ts:196–274` already retains the section IDs/order and generation summary; it currently omits weekStart/resolutionStatus. Expose only an existing field actually needed for resume (for example weekStart for the calendar); do not invent a new DTO or use the summary as exact start proof.

`hillday/HillDayMeetings.tsx:108–123` initializes selected/manual arrays empty. A narrowly allocated saved-selection seed is needed if the resumed Meetings phase is editable; avoid erasing already persisted/calendar/manual selections with an empty replacement request. `HillDayContext.tsx:37–41,189–203` already initializes saved context values from its authorized context read when given the correct meeting list. Mount it after authoritative meeting bootstrap; no context workflow rewrite is needed. Existing resolution/context GETs are registered at `workspace-hillday.ts:235` and :289.

Proposed closed allocation after producer acceptance:

- **Hill Day consumer author:** `HillDayGeneration.tsx`, `HillDayWizard.tsx`, the bounded saved-selection seed in `HillDayMeetings.tsx`, a named Hill Day-local state helper only if needed, and dedicated affected tests. Preserve Editor/Export and other Hill Day behavior.
- **Integration, sequential named splice:** `WorkspaceScreen.tsx`, `workspace-route.ts`, `shared/capiro/operations/workspace-hillday.ts`, and only needed already-produced resume fields in `workspace-schemas.ts`. Keep Library's existing query owner intact. The existing `operations/workspace.ts:5,17` already imports/spreads workspaceHillDayOperations, so no new registry/barrel mechanism is required. Replace the stale operation source provenance with the accepted exact producer reference.
- Root supplies the final reconciled FE base/tree, exact accepted producer head, one-writer shared-file handoff and focused test resources before authoring. No Core contract/schema/migration change is indicated by this trace.

## Evidence reuse and limits

Existing Generation source :31–37 already polls a known job every 2.5 seconds while queued/running and clears its timer. Preserve that implementation relationship; no new passing test claim is made. Retain FE166 `83806222558a9d0ab779152e5f8a1c5f890df657`'s reported 13 mounted export/status/poll/renewal/expiry/lifetime cases and four intended mutants, with their original provenance. Existing browser suite `apps/web/test/browser/workspace-hillday-export.spec.ts` and navigation/admission tests remain relevant unaffected evidence, not proof of the missing start/reload seams.

Future verification should target the six counterexamples above through mounted receiver + actual local operation parsing, and a narrow mutation removing request retention/latest reattachment or replacing retry with generate. Reuse producer/unchanged export evidence; do not rerun a broad suite by default. No claim of real-PG qualification, deployed acceptance, lost export-ID recovery, PDF fidelity, WS11 editing coverage or full WS10 closure follows from this brief.

Basis: Root `outputs/W3-A3-REMAINING-BRIEFS.md`, “WS10-JOB producer and WS12-LOST-ID successor” and verbatim WS-10; canonical standing/WORKFLOW/PROCESS6.1–6.3 and applicable supersession remain binding. This trace creates zero new policy or authority.
