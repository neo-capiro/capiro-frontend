# HANDOFF — Capiro client Meetings / Overview production readiness

> Repository copy. Live client, meeting, prep, job and QA-account identifiers are redacted here; the
> authoritative copy carrying them stays in the private QA evidence root.
Single source of truth for this workstream. Update this file in place; do not spawn parallel reports.
Measurement detail and per-run evidence: `QA-REPORT-meetings-2026-10-30.md`.

Owner: Neo (decisions) / Hermes (execution). Last updated: 2026-10-31, after the bounded source corrections.
Status: **QA complete. Decisions recorded. A later source bundle carries the first fix pass (B0 read boundary, B3,
H1, H2, H3, C2 closed), the review corrections to H2 and the legacy-prep edit path, and the regenerated route
manifest. That bundle is source-only: it is not a deployment and it establishes neither meeting nor Recall
completion. The `web149`/`Core653` observations in §9 are a dated historical measurement of 2026-10-30, not today's
serving tuple.** B1/B2 (WP2), M1, M5, M6, C3, D5 and WP6 remain open — see §9 for the exact reason for each.

Surfaces in scope: client-profile **Meetings tab** (`/portfolio/{clientId}/calendar` + meeting drawer) and **Overview tab**
(`/portfolio/{clientId}`) on app.capiro.ai.

---

## 0. Repositories and environments of record — D8

| Layer | Repo of record | Deployed as |
|---|---|---|
| Web app | **neo-capiro/capiro-frontend** | ECS `capiro-dev-web` task-def **149**, image `capiro/dev/web@sha256:4fb4adaa…`, behind ALB `capiro-prod-alb` (host app.capiro.ai) |
| Core API | **neo-capiro/capiro-backend** (`apps/api`) | ECS `capiro-dev-api:653` (:4000), TG `capiro-prod-api-tg` |

D8 supersedes all earlier ambiguity: **capiro-frontend ships the web app, capiro-backend ships Core.** No other repo
(including `capiov2`) is in scope for these fixes. First job in WP0: make deploy metadata name these repos and their
commit SHAs, so a running task can be traced to a commit. Today `GIT_SHA=7c606a85…` is not resolvable in
capiro-frontend, and the CodeBuild project that names `capiro/dev/web` builds capiov2's Vite SPA, which is not this image.

Local QA reference checkouts (throwaway, never committed): `frontend/` = capiro-frontend @ 817fa529,
`backend/` = capiro-backend @ e7da8a85 (`backend-import`). Line references below come from those trees and were
corroborated against live behaviour; re-anchor them on the shipping branches during WP0.

Test fixtures: C2 Strategies `<c2-strategies-client-id>` (rich), V6 Advisors `<v6-advisors-client-id>` (sparse).

---

## 1. Decisions of record

Binding for this workstream. Where a decision creates accepted risk, the risk is named so it is not rediscovered as a
"bug" later.

### D1 — Debrief runs as an async job (APPROVED)
`POST …/debrief-draft` stops being a held connection: **202 + job id**, client polls job state, draft delivered when
complete. The 30 s proxy cap stays and stays a **read** cap; generation is not admitted to it.

Evidence: 502 at 30 188 ms (realistic transcript); 201 at 30 164 ms (three-line transcript) — both pinned to 30 s.
Prep already proves the pattern: `POST …/prep` → 202 in 639 ms, poll ~3 s, completed at 147 s, `deadlineAt` = +1 h,
cancel/resume present.

Implications to honour: job keyed by `requestKey` so a retry cannot double-generate; state survives drawer close and
navigation; stage labels surfaced as prep does; no change to the read cap.

### D2 — Debrief context is bounded client history, ≤ ~8k input (APPROVED)
May include: the reviewed source, the meeting's own notes/prep, the attendee roster, and **bounded** continuity (open
commitments + the last few debriefs for that client). **No mail threads. No full client timeline.** Hard cap ~8 000
input tokens. Log the assembled context with the artifact so a reviewer can see what the model saw.

Evidence: a three-line source produced `inputTokens: 53031` / `outputTokens: 2738` on `claude-sonnet-5`,
`usedTenantKey: false`; the draft also asserted facts absent from the source ("the Krisp automated-notes pilot being
evaluated for C2 Strategies") — proof that unbounded context is folded into a document presented as a meeting record.

### D3 — Krisp is removed; Meri notetaker is the only capture path (APPROVED)
See WP6. This also settles D2's source question: the `direct_notes` mode that fed Krisp's finished notes into the
debrief source for a hardcoded tenant disappears, so every tenant's debrief source is Meri-captured material, the
meeting's own notes, or a manual/uploaded transcript.

### D4 — Generated artifacts remain auto-approved (APPROVED, accepted risk)
Neo's ruling: generation may land as `approved`. Recorded as accepted risk, not a defect. Two in-scope consequences
because the product currently contradicts itself:
- copy must stop implying a generated artifact was human-reviewed ("Edits require approval again" stays true for edits);
- approval remains an explicit separate action for edits and sharing, and the artifact record must keep distinguishing
  "generated" from "human-approved" so a reviewer can tell them apart later.

Residual risk: in a fact-acceptance workflow, `status: approved` on unreviewed model output can read as human sign-off.
If that reading ever reaches a client-facing surface, reopen this decision.

### D5 — List responses carry metadata only (APPROVED)
Artifact bodies (prep/debrief/notes text) must not appear in list payloads; text returns only from an authorised detail
read. Applies to `engagement/meetings?from&to` and any collection embedding artifacts, and defines what a shared-viewer
sees (metadata only unless the artifact is explicitly shared).

Evidence: meeting detail grew 11 866 → 80 476 bytes and the two-meeting calendar list 24 584 → 93 194 bytes once prep
existed, while the artifact was marked private.

### D6 — Client and meeting lifecycle status: leave it (NO CHANGE)
C2 reading `active` after a confirmed cancellation, and past meetings reading `scheduled`, are accepted as-is. Removed
from the fix list. Do not add status transitions, derivation or backfills under this workstream. Known limitation; the
generated prep already flags the C2 contradiction, which is the interim mitigation.

### D7 — Activity date filter uses the user's local zone (APPROVED)
Filter and label in the browser zone, naming the zone in the dialog (replacing "Dates use UTC. Both selected days are
included."). Counts and the list must agree on one boundary.

### Defaults applied (no explicit ruling — Neo may override)
- **Logo URLs:** replace the presigned S3 URL (`X-Amz-Security-Token`, `X-Amz-Expires=300`) with a stable proxied URL.
  Engineering fix, not a new policy.
- **QA fixtures in product pickers:** move synthetic clients to a separate QA tenant; **no deletions** in the shared dev
  tenant (deletion needs explicit per-task approval).
- **Copy defects:** fix in the normal course (WP7).

---

## 2. Issue register

BLOCKER = ships broken · HIGH = user-visible failure in normal use · MED = defect/risk · LOW = copy/noise. All OPEN.

| ID | Sev | Issue | Evidence | Decision | Package |
|---|---|---|---|---|---|
| B0 | BLOCKER | Legacy prep with `clientId: null` fails `meetingSchema`, so the **whole meeting drawer** shows "Meeting unavailable — unexpected response"; notes/debriefs/edit/join unreachable, Retry cannot help | V6 `df7833e9…` prep `2013fd75` (`clientId: null`, `gpt-4.1-mini`) vs C2 `c5b6b935` (`clientId: e0c9b767…`) | — | WP1 |
| B1 | BLOCKER | Debrief generation 502s at 30.2 s on realistic input | 502 @30 188 ms; 201 @30 164 ms | D1 | WP2 |
| B2 | BLOCKER | Debrief context grossly over-fed (53 031 input tokens for a 3-line source); asserts facts not in the source; returns provider `raw` incl. thinking block | `runs/debrief-draft-timing/draft.json` | D2 | WP2 |
| B3 | BLOCKER | "Sync calendar" unusable on both clients: `engagement/integrations` omits `createdByUserId`, required by `calendarConnectionsSchema` and by a second ownership guard | dialog reproduces on C2 and V6; payload captured | — | WP1 |
| H1 | HIGH | Prep completes server-side (~147 s) but the drawer stays on "synthesizing", then drops to "Current meeting details are unavailable…" | job `cd7f9bb0` 13:40:03 → 13:42:30 | — | WP3 |
| H2 | HIGH | `GET …/meeting-preps/:prepId` 404s while prep prose sits in detail and list payloads | `probe/prep-record.json` | D5 | WP3 |
| H3 | HIGH | Activity read flaky: one 500 with permanent "Loading…" and no error surfaced; 0.8–2.2 s per call for 25 KB | `probe/activity-check.js`; `QueryState.tsx:11-16` | — | WP4 |
| M1 | MED | Client logo served as presigned S3 URL with embedded temporary credentials, expiring in 5 minutes | client payload `logoUrl` | default | WP5 |
| M2 | MED | Date filter claims UTC, filters in local zone | `ActivityTimeline.tsx` zone use | D7 | WP4 |
| M3 | MED | C2 reads `active` after confirmed cancellation; `sectorTag: null`; `totalContracts: 15964.02` | client record | **D6: leave** | — |
| M4 | MED | V6 meetings (Apr–Aug 2026) still `status: scheduled` | `probe/v6-meetings.json` | **D6: leave** | — |
| M5 | MED | Synthetic QA clients offered in the client-assignment picker | assignment dialog listing | default | WP5 |
| M6 | MED | Duplicate/needless fetches: `/clients/{id}` twice (two cache keys); metrics refetched on every search keystroke; Notes blocks the editor on refetch; Share artifacts issues 8 requests to open | run logs | — | WP4 |
| C1 | LOW | "V6 Advisors’s calendar" (blind possessive) | live UI | — | WP7 |
| C2 | LOW | Activity kind menu uses lowercase `email/meeting/document` beside "All activity" | live UI | — | WP7 |
| C3 | LOW | Aborted `/me` and `/debriefs` requests logged on navigation | run logs | — | WP7 |

---

## 3. Work packages

### WP0 — Traceability (first, ~half a day)
- Confirm shipping branches in **capiro-frontend** and **capiro-backend** for app.capiro.ai / Core.
- Make build and task metadata record those commits (`GIT_SHA`, `RELEASE_SHA`); retire any CodeBuild project that names
  `capiro/dev/web` while building a different artifact.
- Re-anchor this handoff's file references to the shipping branches.
- **Acceptance:** from a running task you can name the exact commit in each repo; one build path per artifact.

### WP1 — Contract and data integrity (unblocks all testing)
- **B0:** backfill `preps.clientId` from `meetings.clientId` for existing rows (a client-scoped meeting cannot have a
  client-agnostic prep). Stop the all-or-nothing gate: a prep failing its client/meeting check degrades to the
  Preparation panel with a clear message and never blanks the meeting. Add a service/schema/DB guard so new preps are
  always stamped.
- **B3:** return `createdByUserId` from `engagement/integrations` — or make it genuinely optional in
  `calendarConnectionsSchema` **and** in `fetchOwnedCalendarConnections` — and collapse the two failure messages into one
  accurate one.
- **Acceptance:** V6 `df7833e9…` opens fully; a deliberately corrupted prep shows a degraded Preparation panel only;
  Sync calendar lists the account on both fixture clients with no "unexpected response"; a regression test parses a
  stored legacy prep payload.

### WP2 — Debrief generation (D1 + D2)
- Job conversion: `POST …/debrief-draft` → 202 + job; `GET …/debrief-jobs/latest` (mirror prep's shape); stage labels;
  cancel; `requestKey` idempotency; server deadline ≥ 10 min; client polls ~3 s with backoff and resumes after reload.
- Context per D2: source + own notes/prep + attendees + bounded continuity (open commitments, last few debriefs); no
  mail threads; hard cap ~8k input; persist the assembled-context reference with the draft.
- Stop returning the provider `raw` envelope; expose `provider`, `model`, token counts only.
- **Acceptance:** full-length transcript draft completes with no 5xx, p95 < 90 s, input tokens ≤ 8 000, and no assertion
  that cannot be traced to the source or labelled continuity; navigating away and back neither loses nor duplicates a job.

### WP3 — Preparation completion and payload shape (D5)
- Surface completion from `prep-jobs/latest` in-session; never replace the meeting view with "details unavailable" because
  a poll or refetch aborted.
- Fix `GET …/meeting-preps/:prepId` (404 today) so edit/refine read the documented path.
- Remove artifact bodies from list responses (D5): list returns ids, status, timestamps, provider/model only; detail keeps
  bodies behind the existing authorisation.
- **Acceptance:** generate → completion visible without reload at the job's real duration; prep read returns 200;
  `engagement/meetings?from&to` for the C2 fixture drops below ~15 KB and contains no prep/debrief text.

### WP4 — Reads, errors, timezone
- **H3:** fix the activity 500 and its latency; `QueryState` must render `error` before `pending` so a failing read never
  shows an endless "Loading…"; add a visible retry.
- **M2/D7:** activity date filter in local zone, label names the zone, counts and list share one boundary.
- **M6:** one client read per profile (single cache key); no metrics refetch on search typing; open dialogs without a
  refetch fan-out.
- **Acceptance:** 20 consecutive activity reads with no 5xx; a forced 500 shows the error and a working Retry; a filter at
  23:30 local includes exactly what the count reports.

### WP5 — Security and data hygiene
- **M1:** stable proxied logo URL; no AWS credentials in any client payload. Confirm no other presigned URLs in client or
  meeting payloads.
- **M5:** synthetic clients out of product pickers (QA tenant); no deletions.
- **Acceptance:** payload grep finds no `X-Amz-Security-Token`; logos still render after 15 minutes idle; the assignment
  picker lists only real clients.

### WP6 — Remove Krisp; Meri notetaker is the only capture (D3)
Scope is **capiro-backend** — capiro-frontend has zero Krisp references (verified). Remove in this order:
1. `apps/api/src/engagement/krisp/` — controller `clio/krisp-notetaker` (`GET /`, `GET /folders`, `POST /preferences`,
   `GET /imports/:id/candidates`, `POST /imports/:id/match`), service, helpers.
2. `apps/api/src/engagement-workers/krisp-notetaker-worker.service.ts`, its module registration, and the sweep loop.
3. `apps/api/src/common/krisp-notetaker-flags.ts` — flag `notetaker.krisp.enabled`, `krispTenantEnabled`, and
   **`krispImportMode()` which hardcodes `tenantSlug === 'c2-strategies' ? 'direct_notes' : 'generated'`**. That tenant
   branch is what makes C2's debrief source differ from every other firm's; it goes.
4. Meri managed-MCP surface: `MERIV3_MANAGED_APP_IDS` entry `krisp`, catalog `meriv3-krisp`, and the gating sites in
   `meri-managed-mcp.service.ts`, `meri-mcp.service.ts`, `meri-managed-mcp.helpers.ts`.
5. Tenant settings: remove `notetaker.krisp.enabled` from `tenants.settings_jsonb` (tolerate on read). Do not delete
   connector/import rows — mark them orphaned and stop reading.
6. Docs and UI copy offering Krisp as a capture/notes source; the debrief source picker presents only Meri notetaker
   capture, the meeting's own notes, and manual/uploaded transcript.

Guard rail: Meri notetaker must already cover what the Krisp sweep backfilled, or removal silently drops capture. Before
deleting code, run the sweep's discovery read-only for both fixture tenants and record what it would have imported. If
Meri coverage has a gap, stop and report — do not remove the path and leave meetings uncaptured.

**Acceptance:** no route, worker, flag, catalog entry or tenant setting references Krisp; debrief source for every tenant
is Meri/notes/manual; both fixture clients' meetings still capture and debrief; discovery comparison attached.

### WP7 — Copy and noise
- C1 possessive; C2 kind labels; C3 aborted-request noise; the D4 copy correction (nothing may imply a generated artifact
  was human-reviewed).
- **Acceptance:** text review of drawer and activity filter; no aborted requests in a normal navigation trace.

---

## 4. Sequencing

1. **WP0 + WP1** — WP1 is what makes the rest testable; B0 currently hides an entire meeting.
2. **WP6** — it changes the debrief source, so it lands before or with WP2, never after.
3. **WP2** — the last remaining blocker.
4. **WP3**, then **WP4**.
5. **WP5**, **WP7** — anytime after WP1.

Feature work may run in parallel only where it avoids `features/portfolio/calendar/**`,
`shared/portfolio/api/**`, and `apps/api/src/engagement/**`.

## 5. Do not do

- Do not raise or remove the 30 s cap for reads; generation moves to a job (D1).
- Do not add lifecycle status transitions or backfill `active`/`scheduled` (D6).
- Do not make generated artifacts require human approval (D4) — but do not claim they were reviewed either.
- Do not delete QA clients, connectors, imports or any data in the shared dev tenant without explicit approval.
- Do not introduce a new queue/framework for the debrief job: reuse the prep job machinery in `apps/api/src/engagement`.
- Do not widen artifact visibility while doing WP3 (D5): metadata out, bodies behind existing authorisation.
- Do not touch IAM, trust policies, security-group ingress, or production resources under this workstream.
- Do not edit another repo "because it looks like the deploy source"; D8 fixes the repos of record.

## 6. Verification standard for every package

- Behaviour checked on app.capiro.ai against **both** fixture clients, with the network trace kept (status, ms, bytes).
- Deterministic assertions where possible: payload size ceilings, token caps, status codes, no `X-Amz-Security-Token`,
  no artifact bodies in list responses, job idempotency under retry.
- Anything that moves pixels: screenshot at 1600×1000 plus one narrow viewport, judged against the existing surface.
- Report PASS / ACCEPTED LIMITATION / BLOCKED / NOT RUN with the command or trace that proves it. No claim without a
  read-back.

## 7. Evidence and re-run

Evidence root: `C:\dev\capiro-qa-meetings-20261030\` — `runs\*\findings.json|log.json|shots\*`, `probe\*.json`,
`audit\*.md`. `audit/TIMEOUT-AUDIT.md` carries a correction banner: its 15 s proxy claim is false, 30 s is measured.

```bash
cd C:\dev\capiro-qa-meetings-20261030
export TMPDIR='C:\dev\capiro-qa-meetings-20261030\tmp' TEMP="$TMPDIR" TMP="$TMPDIR" NODE_PATH=/c/dev/node_modules
QA_CLERK_USER_ID=<qa-clerk-user-id> node auth/login.js   # needs secrets/clerk-secret.txt from Secrets Manager
CLIENT_ID=<uuid> TAG=<tag> node runs/overview-controls.js
CLIENT_ID=<uuid> TAG=<tag> node runs/calendar-sweep.js
MEETING_ID=<uuid> node runs/drawer-sweep.js
node runs/debrief-timing.js [SRC="…"]     # prints status + ms for POST debrief-draft
```

Run these in the foreground — backgrounded node on this host loses stdout and dies with the turn.
`auth/storage-state.json` is a live session credential; never copy it into a ticket or git.

## 8. Still open

- **WP0 input:** confirm the shipping branches in capiro-frontend / capiro-backend.
- **WP6 input:** confirm whether any tenant other than C2 currently relies on Krisp imports before the path is deleted;
  if so, agree a cutover date rather than deleting under them.
- Not covered by this pass (do not assume working): mobile/narrow layouts, non-admin and read-only roles, a second tenant
  for isolation proof, live Meri notetaker join/recording, Objectives/Work/Files/Capabilities tabs.
- D4 residual risk stands as written; reopen only if auto-approved artifacts reach a client-facing surface.

---

## 9. Fix pass 2026-10-30 — per-item status

Every row below was re-checked against the shipping code of record (§0) before it was touched: the QA evidence was
measured against the **deployed** task, and several items were already correct on `main` / `backend-import`.

Legend: **CLOSED** = change landed with a regression test; **VERIFIED** = correct on the shipping branch already, no
change; **ACCEPTED** = a recorded decision, not work; **OPEN** = still to do, with the reason.

| ID | Status | What changed / why it is still open | Evidence |
|---|---|---|---|
| B0 | CLOSED (read boundary) | `clientId: null` / absent attribution is now UNKNOWN provenance, not a mismatch, so one legacy prep no longer fails the whole `meetingSchema`. A prep naming another meeting/client still refuses, but `parseMeeting()` degrades that prep to the Preparation panel instead of blanking the drawer. An unbound legacy row is now explicitly **read-only** in the preparation editor: the update path preserves the stored null stamp, so writing it used to commit and then report a 502. Long-term rows are still unstamped: **the WP1 backfill and the stamp-on-write guard are NOT done** — they need a forward Prisma migration applied to the dev database. | `apps/web/tests/meetings-qa-register.test.ts` (B0 block), `tests/calendar.test.ts`, `tests/prep-editor-legacy-binding.test.ts` |
| B1 | OPEN | D1 requires the debrief job model, service, routes and client polling. It needs a forward migration (`debrief_job`) before it can be exercised at all, and per §5 it must reuse the prep job machinery rather than a new queue. Not started. | — |
| B2 | OPEN | D2 context bounding rides on the WP2 rewrite (same prompt assembly). Not started. | — |
| B3 | CLOSED | `integrationStatusProjection` now echoes `createdByUserId`; the calendar receiver treats an absent owner as "not stated" (the endpoint is already caller-scoped) and refuses only a stated different owner, with one accurate message. | `integration-health.spec.ts`, `tests/meetings-qa-register.test.ts` (B3 block) |
| H1 | CLOSED | The drawer treated any background refetch (`!isFetching`) as "details unavailable". The 5 s prep-job poll caused exactly that, so a completed prep looked lost. `current` now depends on success + no error only, so a refetch keeps the last good answer on screen. | `MeetingDetail.tsx` |
| H2 | CLOSED (server) | `GET /engagement/meeting-preps/:prepId` now exists and is admitted through the current-actor transaction: live membership, the meeting owner/connection boundary, the parent client's wall and archival state, the saved prep's own source access, and a final binding of the returned row to the parent that was admitted. It is in the regenerated route manifest. The client keeps reading prep bodies from the authorised meeting detail, so no client change was needed and no editor readback is claimed. | `engagement-prep-read.spec.ts`, `__fixtures__/engagement-route-manifest.v1.json` |
| H3 | CLOSED | `QueryState` renders `error` before `pending`, so a failed read can no longer sit on "Loading…" with no message and no retry. | `QueryState.tsx` |
| M1 | OPEN | Stable proxied logo URL. Checked: the existing `/api/backend/{service}/{path}` proxy cannot carry it — `proxy.ts` forces `Content-Type: application/json` and `Accept: application/json` on the upstream call and on the response, so an image cannot ride that route without changing the proxy for every caller. The fix is either a dedicated authenticated Next image route or a rewrite rule plus a Core streaming `GET clients/:id/logo`, and it needs a deployed build to verify. No AWS-side change was made. | `shared/portfolio/api/proxy.ts`, `clients.service.ts:1955-1975` |
| M2 / D7 | VERIFIED | Already correct on `main`: the filter converts with the browser zone (`instantDay(item.occurredAt, zone)`), the ranges are computed in that zone and the dialog names it ("Dates use {zone}. Both selected days are included."). Nothing to change. | `ActivityTimeline.tsx:33`, `activity-filters.ts`, `ActivityDateFilter.tsx:46` |
| M3 | ACCEPTED | D6: leave lifecycle status alone. | decision |
| M4 | ACCEPTED | D6: leave lifecycle status alone. | decision |
| M5 | OPEN | Moving synthetic clients to a QA tenant is a data change in the shared dev tenant; it needs an explicit write scope and a forward migration, and §5 forbids deleting QA clients. | — |
| M6 | OPEN | Duplicate `/clients/{id}` reads (two cache keys), metrics refetch on search keystroke and the share-artifacts fan-out are React Query cache-key work across `features/portfolio/**`; it is the largest frontend item left and was not started. | — |
| C1 | VERIFIED | Blind possessive ("V6 Advisors's calendar") is not reproducible on `main` — the calendar header composes the client name with no possessive suffix. | grep of `main` @ 817fa529 |
| C2 | CLOSED | The kind menu listed raw transport values (`email`, `meeting`, `document`) beside "All activity"; it now maps to sentence-case labels. | `ActivityFilters.tsx` |
| C3 | OPEN | Aborted `/me` and `/debriefs` requests on navigation are request-lifecycle noise in the drawer teardown, not a wrong result. Not started. | — |
| D5 | OPEN | Artifact bodies out of list responses is a shared-contract change (Core projection + every collection consumer). Deliberately not bundled into this pass. | — |
| WP6 (D3) | OPEN — gated | Krisp removal is mechanical, but its own guard rail blocks it: Meri notetaker coverage must be proven against the sweep's read-only discovery for both fixture tenants first, and that is live-tenant work. Removing the path before that check would silently drop capture. | §3 WP6 guard rail |

**Pull requests:** client `neo-capiro/capiro-frontend#360`, server `neo-capiro/capiro-backend#311` (both open, not merged).

Nothing above changes a decision. D4 residual risk, D6 and the "do not do" list are untouched.

### WP0 — dated provenance measurement, 2026-10-30 (historical; read-only; nothing changed in AWS)

> **This is a historical measurement, not today's deployment.** Core41/FE60 were the serving tuple at that time and
> a newer frontend build (`8561f305`) is now running through Release. The task-definition revisions, digests and
> SHAs below are preserved because they are the evidence for why WP0 existed; they must not be quoted as the
> currently running artifact, and the two tasks named here have since moved.

This was measured, not inferred, because everything else in this workstream depends on it. Caller: `aws sts
get-caller-identity` → account 967807252336, user `jump-cli`.

**Web — task definition `capiro-dev-web:149`, one PRIMARY deployment, `COMPLETED` at 2026-10-29T23:54Z**

- image `capiro/dev/web@sha256:4fb4adaa…`, env `GIT_SHA` = `RELEASE_SHA` = `7c606a85…`
- that commit **does not exist** in `neo-capiro/capiro-frontend` (422), `neo-capiro/capiov2` (404) or
  `neo-capiro/dev` (422)
- ECR `capiro/dev/web`: tag `7c606a85…` was pushed 2026-10-08T17:56Z; `:latest` still points at
  `sha256:5c85d1c7…` from 2026-09-27, i.e. **not** the running digest
- the only CodeBuild project that pushes to `capiro/dev/web` is **`capiro-build-web-dev`**: its source is
  `https://github.com/neo-capiro/capiov2.git` — not the repo of record — it builds `apps/web/Dockerfile`
  (node:20.16.0 + nginx), and it tags **only `:latest`**
- no workflow in `capiro-frontend` references `capiro/dev/web` at all

**Core — task definition `capiro-dev-api:653`**

- image `capiro/dev/api@sha256:52ecfbb8…`
- env carries **two different SHAs**: `GIT_SHA` = `1e99f092…`, `RELEASE_SHA` = `51f0cbae…`
- neither resolves in `neo-capiro/capiro-backend` (422) or `capiov2` (404)

**What this means**

1. Neither running service can be traced to a commit in the repos of record. D8 is not a documentation fix: the
   build path from those repos to those tasks does not exist.
2. `capiro-build-web-dev` is exactly the project WP0 describes — it names `capiro/dev/web` while building a
   different repository — and its output is not even what runs.
3. Anything measured on app.capiro.ai at that date was measured against artifacts of unknown provenance. The
   source bundle in PR #360/#311 was never confirmed as deployed; WP0 remained first for that reason, and this
   file does not claim otherwise.
4. WP0's remaining work is a release-infrastructure change and needs your explicit call: build
   `capiro-frontend@<sha>` → `capiro/dev/web:<sha>`, point a task definition at that immutable tag, retire
   `capiro-build-web-dev`; then the same for Core, which additionally has to stop emitting two SHAs per task.

### Verification for this pass

- Frontend: `tsc --noEmit` clean; `eslint` 0 errors (2 pre-existing `<img>` warnings in `public-event/PublicDetail`);
  `prettier --check` clean; `vitest run` **50 failures**, and the identical suite on the untouched base (`git stash`)
  has **49** — the single delta was `calendar-sync.test.ts > owned connection list rejects a different creator`, whose
  expected message changed with B3, and it is updated in the same commit. The other 49 are pre-existing on `main`.
- Backend: `pnpm --filter @capiro/api run test --runInBand --runTestsByPath src/engagement/engagement-prep-read.spec.ts
  src/engagement/integration-health.spec.ts` → **17 passed**. `tsc -p tsconfig.json` → 367 pre-existing errors, **0 in the
  touched files**.
- Not run: any live-browser re-check of app.capiro.ai (needs the deployed build), the B0 backfill, WP2 and WP6.

### Review corrections, 2026-10-31 — source only

Bounded corrections raised by the exact-head integration review. They are a **later source bundle**: not a
deployment, not route acceptance, not feature completion.

- **H2 authorization.** The read opened with `withTenant` + ownership only, and `assertSavedMeetingPrepAccess`
  returns for a legacy prep without a briefing manifest, so a caller who owned the meeting could read the prep of a
  client that now walls them, or of an archived client. It now runs inside `withTenantUser` through
  `currentMeetingActor`, keeps `ensureOwnMeeting` and the saved-source access, admits the parent client through
  `assertMeetingClient`, and refuses a returned row that no longer belongs to the admitted parent/client.
- **Legacy prep edit.** A `clientId: null` prep opened in the editor under a client-scoped meeting sent the enclosing
  client id; Core preserves the stored null stamp, so the write committed and the receipt check raised 502 with a
  retry affordance. Such a row is now read-only until the backend establishes its binding, the editor refuses to
  build a body for it, and the failed-save label says “Check saved prep” instead of inviting a resend. Known-client
  editing, the wrong-non-null refusal and uncertain-write reconciliation are unchanged.
- **Route manifest.** `GET /api/engagement/meeting-preps/:id` is in the regenerated manifest with every newer main
  route preserved.
- **Provenance wording.** The `web149`/`Core653` section above is now explicitly a dated historical measurement.

Remaining open: B1/B2 (WP2), M1, M5, M6, C3, D5, WP6 — unchanged by these corrections.

