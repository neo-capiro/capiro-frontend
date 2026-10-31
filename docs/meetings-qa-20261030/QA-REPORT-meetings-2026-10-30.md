# Capiro client Meetings + Overview QA — app.capiro.ai

> Repository copy. Live client, meeting, prep, job and QA-account identifiers are redacted here; the
> authoritative copy carrying them stays in the private QA evidence root.
> **Decisions now govern this report.** Product decisions D1–D8 are recorded in `HANDOFF-LIVING.md`; where the two
> disagree, the handoff wins. Two changes to the findings below: **D4** accepts auto-approval of generated artifacts
> (no longer a fix, only the contradictory copy is), and **D6** leaves client/meeting lifecycle status as-is
> (M3 and M4 are accepted limitations, not work items). **D3** additionally removes the Krisp capture path entirely;
> Meri notetaker is the only capture source.

Date: 2026-10-30 (UTC). Tester: Hermes (Playwright, authenticated as neo@capiro.ai via a Clerk sign-in ticket).
Clients tested: **C2 Strategies** `<c2-strategies-client-id>` (12 meetings, prep already generated) and **V6 Advisors** `<v6-advisors-client-id>` (5 meetings, no prep, no notes).

## Environment actually under test

| Item | Value |
|---|---|
| Frontend host | app.capiro.ai → ALB rule 13 / default → ECS `capiro-dev-web` task-def **149** |
| Frontend image | `967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/dev/web@sha256:4fb4adaa…` |
| Frontend source | **Not positively resolved.** Live app is a Next.js build of the portfolio app whose structure matches `neo-capiro/capiro-frontend` main; ECS env `GIT_SHA=7c606a85…` is absent from that public repo, and the CodeBuild project `capiro-build-web-dev` points at capiov2 `apps/web`, which is a Vite SPA and therefore cannot be the running Next.js image. Source refs below are "nearest match, corroborated by live behaviour". |
| Core API | ECS `capiro-dev-api:653`, container :4000, TG `capiro-prod-api-tg` |
| Clerk | dev instance (`clerk.app.capiro.ai`), user `<qa-clerk-user-id>` |

**Caveat that matters:** I could not pin the deployed commit. The running app is Next.js and structurally matches `capiro-frontend` main (the components, labels and dialogs all exist there), but ECS `GIT_SHA` is absent from that repo and the CodeBuild project that names `capiro/dev/web` points at capiov2's `apps/web`, which is a Vite SPA. Source references are therefore from capiro-frontend @ 817fa529 and only asserted where live behaviour corroborates them.

## Verdict

**NOT PRODUCTION READY.** Three blockers, three high-severity defects, plus data-hygiene and copy defects. The Meetings surface is broadly well-built — the calendar, drawer, dialogs and preparation *content* are genuinely good — but the two AI generation paths fail or mislead in normal use, and Sync calendar is dead.

---

## Blockers

### B0. A legacy preparation row makes the whole meeting unviewable (FAIL, V6 Advisors)
Opening the V6 meeting `<v6-meeting-id>` ("Pilot Program Review | V6A + Capiro") renders
**"Meeting unavailable — The service returned an unexpected response. Please retry or contact support."**
and *Retry* cannot help.

Root cause (verified against the live payload): that meeting carries a legacy prep row with
`clientId: null` (`provider: openai`, `model: gpt-4.1-mini`), while the meeting's client is V6 Advisors.
`calendar/contracts.ts:64-73` raises `"Preparation belongs to another client"` when
`prep.clientId !== meeting.client?.id`, so `meetingSchema` fails, `api.request` throws
`502 unexpected response`, and the drawer has no other state to show. Contrast: the C2 prep generated today
carries `clientId: e0c9b767…` (`provider: openai`, `model: gpt-6-astra`) and the drawer renders normally.

Impact: one stale child row hides the entire meeting — notes, debriefs, prep, edit, join, everything — and the
in-product remedy (Regenerate) lives inside the panel that is now unreachable. This is the highest-blast-radius
data-wiring defect found: a per-artifact integrity check is being applied as an all-or-nothing gate at the
meeting level.

Evidence: `probe/v6-drawer.js` output, `probe/meeting-df7833e9.json` vs `probe/c2-prep-client.js` output.

### B1. Debrief generation always exceeds the 30 s proxy timeout (FAIL)
`POST /api/backend/core/engagement/meetings/{id}/debrief-draft` → **502 after 30 188 ms** with a 3-paragraph transcript; **201 after 30 164 ms** with a 3-line transcript (i.e. it only succeeds by a ~160 ms race).

Evidence: `runs/debrief-timing/log.json`, UI afterwards shows *"The service could not be reached. Please retry."* plus *"Your reviewed source is retained. A failed response may follow a completed generation; generating again starts another request."*

Cause: `apps/web/src/shared/portfolio/api/proxy.ts:145` wraps **every** upstream fetch in `AbortSignal.any([request.signal, AbortSignal.timeout(30_000)])` and converts abort to 502. Rationale is correct for reads; it is fatal for a synchronous LLM call. Prep already uses an async job (`POST …/prep` → 202 + `prep-jobs/latest` polling); debrief does not.

Impact: users are told generation failed while the model keeps running and bills tokens; the retry advice creates duplicate generations.

### B2. The debrief prompt is grossly over-stuffed (FAIL)
Same call, trivial 3-line input, response usage: `inputTokens: 53031, outputTokens: 2738, model: claude-sonnet-5, usedTenantKey: false`. 53 k input tokens for three sentences. This is the reason B1 fires on every request. The response also returns the provider's entire `raw` envelope (including the thinking block and signature) to the browser.

Evidence: `runs/debrief-draft-timing/draft.json` (usage block), `runs/debrief-timing/log.json` + `runs/debrief-draft-timing/log.json`.

### B3. "Sync calendar" is unusable — contract drift (FAIL, both clients)
Dialog opens with **"The service returned an unexpected response. Please retry or contact support."** Reproduced on C2 and V6.

`GET /engagement/integrations` returns 200 with a connection that has **no `createdByUserId`**, while `calendar/sync/contracts.ts:5-17` requires it (`createdByUserId: z.string().nullable()`), and `sync/api.ts:14-21` additionally throws when the field is absent. Schema parse fails first, so the user only sees the generic message.

---

## High

### H1. Preparation completes in ~147 s and the UI never reports it in-session (FAIL)
Job `<prep-job-id>` created `13:40:03.390Z`, completed `13:42:30.917Z` (147 s, `status=completed`, `prepId=c5b6b935…`). Through 149 s the panel showed *"Preparing your briefing · Current stage: synthesizing"*, then switched to **"Current meeting details are unavailable while access or saved data is being checked."** Reloading the same URL renders the briefing correctly, so the job succeeded and only the client state degraded.

Evidence: `runs/prep-generate-c2/{result.json,log.json}`, `probe/prep-job-latest.json`.

A second UI confirmation run was abandoned because B0 makes the only V6 meeting with a prep unviewable; the observed behaviour above is single-run but fully instrumented at the API level.

Note: a confirmation re-run was blocked because the control becomes *Regenerate* once a prep exists; this is observed once at full detail plus an independent API-level confirmation of completion timing.

### H2. Preparation record read path 404s (FAIL)
`GET /engagement/meeting-preps/<c2-prep-id>` → **404 "The requested action or record is unavailable from the current service."** The prep body is instead embedded in the meeting detail payload, which grew 11 866 → **80 476 bytes**; the meetings list grew 24 584 → **93 194 bytes** for two meetings.

Edit prep / Refine prep read through the 404ing path, and every calendar list request now carries prep prose.

### H3. Overview activity read is flaky and its failure is invisible (FAIL)
`GET /clients/{id}/activity?limit=500`: one **500** (page then sat on *"Loading…"* indefinitely, no error, no retry affordance), then 200 ×10 at 0.8–2.2 s for 25 KB. `QueryState` renders `Loading…` whenever `pending` is true and returns before checking `error`, so a failing-then-retrying query shows a permanent spinner.

Evidence: `runs/p1-overview-c2/log.json` (500), `probe/activity-check.js` output, `shared/portfolio/ui/QueryState.tsx:11-16`.

---

## Medium

- **M1 — Presigned logo URLs leak credentials and expire.** Client payload embeds `logoUrl` with `X-Amz-Security-Token`, `X-Amz-Credential`, `X-Amz-Expires=300`. Rendered directly in the header; breaks after 5 minutes and exposes temporary S3 credentials to the page.
- **M2 — Activity date filter lies about its timezone.** Dialog says "Dates use UTC. Both selected days are included."; the filter applies the browser zone (`ActivityTimeline.tsx` uses `Intl.DateTimeFormat().resolvedOptions().timeZone`).
- **M3 — Stale client status.** C2's record is `status: active` / `PROFILE_STATUS ACTIVE` despite cancellation confirmed Oct 21; the generated prep itself flagged the contradiction. Also `sectorTag: null` while intake data exists → UI "Sector not specified"; `intakeData.federalMarket.totalContracts = 15964.02` (fractional contract count).
- **M4 — Past meetings still "scheduled".** All five V6 meetings (Apr–Aug 2026) report `status: scheduled`.
- **M5 — Test tenants visible in product UI.** Client-assignment dropdown lists `ZZ-S16H Synthetic B 20261029`, `Phase 1 smoke 33604295f`, `ZZ-QA-Meri1651-Test-DoNotUse` alongside real clients.
- **M6 — Duplicate/needless requests.** `/clients/{id}` fetched twice per profile load under two cache keys; activity metrics refetched on every activity search keystroke; opening Notes blocks the editor behind "Loading…" while a refetch is in flight; Share artifacts re-fetched meeting + calendar + debriefs + /me (8 requests) just to open.

## Low / copy

- Possessive bug: "V6 Advisors’s calendar" (blind `’s`).
- Activity type menu uses lowercase `email / meeting / document` next to "All activity".
- `prep-settings` step logged two aborted requests (`/me`, `/debriefs`) on navigation — benign but adds console noise.

---

## What works (PASS)

Toolbar: Sync calendar (opens; fails per B3), New meeting, Month/Week/Agenda, Previous/Today/Next, Calendar date input, timezone switch (queries correctly re-derived, e.g. Pacific → `from=…T07:00:00Z`), Meetings chip, meeting tile → drawer. Meeting Library page, agenda table with All/Needs prep/Needs debrief filters.

Drawer: Edit meeting, Share artifacts (lists "Meeting prep · 10/30/2026 · Private", Share/Unshare), Client assignment, Preparation, Notes (add note), Debriefs, Add debrief (artifact editor), Use saved meeting notes (honest "No readable saved notes"), Transcript and attachments (25 MiB, correctly refuses .vtt/.srt), Record Voice Memo, Join meeting link, Refresh attachment status, Prep settings, Information/notetaker panel.

Overview (both clients, 18 controls each, all PASS): view switcher + search, Quick add, Meri actions, More actions, Notes, focus tag, Account team, Government & federal profile, Add facility, facility row, District nexus map, Expand timeline, activity type/date filters, activity search, email thread expand, New objective.

## LLM context and output quality

**Context windows disclosed by the product itself** (Prep settings dialog): Standard 10 meetings / 90 days + 15 email threads / 30 days; Deep 25 / 180 d + 100 / 90 d; Max 100 / 365 d + 300 / 365 d. Prep is asynchronously jobbed with a 1 h server deadline (`deadlineAt` = created + 1 h).

**Prep output (C2, standard depth, 147 s)** — accurate and well grounded. It correctly stated that the Oct 21 cancellation supersedes the Sept 3 "active" record label, distinguished RSVP acceptances from attendance/delivery, attributed the open progress-update promise to Jordan Clayton with no invented date, and cited specific dates (Jul 28, Aug 12, Aug 19 auto-reply, Sep 1 introduction, Oct 6/7 acceptances). No fabricated facts found against the evidence visible in the timeline and email threads.

**Debrief output (short source)** — accurate, explicitly enumerated what the transcript did not specify ("what needed correcting", "which three meetings"), and separated commitments from open questions. Relevance high; tone appropriate; no hallucinated participants. The defect is cost/latency and the 30 s cliff, not answer quality.

**Generator gaps worth fixing** (from the LLM context audit, to be re-verified against deployed `capirov2`): debrief context is assembled with hardcoded row/message caps rather than the depth policy, objectives are not included in any generator, user-supplied context is not sanitised against prompt injection, and prep has no retry on transient provider failure.

## Evidence map

```
C:\dev\capiro-qa-meetings-20261030\
  runs\overview-controls-c2\      findings.json + 18 shots (Overview, C2)
  runs\overview-controls-v6\      findings.json + shots (Overview, V6)
  runs\calendar-sweep-c2-toolbar\ findings.json + log.json + shots (toolbar)
  runs\calendar-sweep-v6\         findings.json + log.json + shots
  runs\drawer-sweep-c2\           findings.json + shots (drawer + all dialogs)
  runs\meeting-tabs-c2\           tabs.json (Information/Preparation/Notes/Debriefs)
  runs\debrief-timing\            log.json (502 @30 188 ms)
  runs\debrief-draft-timing\      draft.json (53 031 input tokens), log.json
  runs\prep-generate-c2\          result.json + log.json (147 s job, UI stall)
  probe\                          clients.json, v6-meetings.json, prep-job-latest.json, prep-record.json (404)
  audit\                          worker reports (see correction below)
```

## Correction to the delegated timeout audit

`audit/TIMEOUT-AUDIT.md` states the proxy uses a hardcoded **15 s** `fetch(..., { timeout: 15000 })` at `proxy.ts:202-206` and a `fetchTimeout(url, init, 30000)` wrapper in `http.ts`. Both are wrong: `proxy.ts:145` uses `AbortSignal.timeout(30_000)`, there is no `timeout:` fetch option, and `http.ts` has no `fetchTimeout` helper. The live measurement (30 188 ms) confirms 30 s. Treat that report's numeric specifics as unverified; its qualitative point (no cancellation propagation, duplicate-generation risk on timeout) stands and is confirmed by B1.

## Recommended fix order

1. Take debrief off the synchronous proxy path: either raise the cap for a named generation route or convert `debrief-draft` to the same job pattern as prep (`202` + poll). Without this the feature cannot ship.
2. Cut debrief context to the reviewed source plus a bounded history window (target < 8 k tokens); stop returning `raw`.
3. Fix `engagement/integrations` ↔ `calendarConnectionsSchema` drift (return `createdByUserId`, or relax the schema) and drop the duplicate ownership guard message.
4. Make prep completion render in-session from `prep-jobs/latest` without dropping the workspace into "details are unavailable"; fix the `meeting-preps/:id` 404 and stop embedding prep prose in the calendar list payload.
5. In `QueryState`, show `error` before `pending`; make the activity endpoint stop 500ing (25 KB union query, 0.8–2.2 s).
6. Stop serving presigned logo URLs with embedded credentials; proxy or serve a stable URL.
