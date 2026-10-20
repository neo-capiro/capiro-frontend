# Meri live wiring — lane report, 16 October 2026

Branch `meri/live-wiring-20261016`, based on `meri/figma-34-ui` at `c7e06000`. Backend read (read-only): `neo-capiro/meri-greenfield` branch `fable/live-base-20261016` at `48a27c8d`. The conversation-wide history lane branch `fable/live-l3-history-20261016` did not exist when this lane ran, so nothing here depends on it.

The fixture registry and every `/meri/fixture/*` screen are unchanged. Ordinary routes never show fixture data: every record on them comes from a service response that passed the public receivers, and anything the backend does not serve is shown as unavailable with the exact missing route.

## What is wired

### Conversation (`/meri`, ordinary route)

| Behaviour | How |
| --- | --- |
| Session | Connects automatically through the existing opaque session bootstrap (`POST /api/action-followthrough/session`, hints `{clientId}` or the remembered `{clientId, conversationId, runId}`). The receipt must match the verified account and client; a mismatch shows "Conversation connection unavailable" with **Try again** (same hints, never broader). |
| Transcript | `POST /api/conversations/history {limit:100}` on connect. The request text now comes from the admitted view (`observation.prompt`, an additive field of `@capiro/meri-client/conversation`). |
| Streaming | `POST /api/conversations/events {command:{conversationId,intent:'view.subscribe'}}` for a freshly submitted run (cursor 0); `GET /api/conversations/events/{conversationId}/stream` with `x-meri-resume-sequence` otherwise. Each subscription goes through the existing guarded SDK Chat and public receiver. |
| Reconnect | A stream that ends before a settled `run.status` (completed, failed, cancelled, paused, waiting-for-approval) is resumed from the accepted cursor. Attempts that admit new events reset the budget; attempts without progress back off 1 s, 2 s, 4 s and then stop with "Updates stopped arriving" and an explicit **Reconnect**. Leaving the page stops watching only. |
| Composer | The adopted AI Elements prompt input (shared `MeriComposer`, new live mode). It is never disabled after a submission: the draft stays editable while a run works, while a request is uncertain and while reconnecting; only Send is blocked, with the reason. |
| Send | First request on a fresh run: `POST /api/conversations/submit {requestId,prompt}`. Unknown delivery keeps the exact request (same id and prompt) for **Retry same request**; the intent journal survives navigation and rebinds the exact run. |
| Multi-turn | When the run is terminal, Send opens a new session with hints `{clientId, conversationId}` (no `runId`), so the service binds the conversation's successor run (`next-run.mjs`), then submits there. Turns shown earlier in the page stay visible above. If the service refuses the next run, the message is kept with **Try again** and **Edit message instead**. |
| Stop | While a run is not terminal the submit slot is **Stop**: `POST /api/conversations/cancel {}`. The receipt is shown as a receipt; the run's state changes only from `run.status`, so a `completed` receipt is never shown as cancelled. Observation restarts immediately to pick up the status. |
| Session expiry | A naturally expired session (bound at least 60 s) reopens the exact run once on its own; otherwise "Conversation session expired" offers **Reconnect** with the exact `{clientId, conversationId, runId}`. |
| Run content | Message deltas, tool activity, source counts, run errors (approved messages from the projection package) and service reason codes, with the run status pill. |
| Approvals | `approval.required` events are shown in the turn as "Approval required" with the expiry; no decision control (see Unavailable). |

Code: `apps/web/src/features/meri/conversation/*` (presentation and local interaction), `shared/meri-conversations/*` (session/port composition), `packages/meri-client` (receiver composition; additive `prompt`).

### Files and artifacts

Files Meri publishes in the conversation (`artifact.available` events in the turns shown) are listed under **Files in this conversation** using the adopted AI Elements Artifact component.

| Action | Route |
| --- | --- |
| Preview | `POST /api/documents/inspect {versionId}` through the existing document proxy, admitted by `receiveDocumentResponse('inspect')`. Shows filename, type, size, generation and preview status and the structural inspection. Native rendering stays explicitly unverified. |
| Download | Inspect (to admit the exact version), then `POST /api/documents/links/issue {versionId}` → `{versionId, token, expiresAtMs}`, then `POST /api/documents/links/redeem {token}`. The bytes are verified by `receiveDocumentDownload` against the inspected version (type, disposition, length, sha256) before a Blob URL is offered and revoked on unmount. The token exists only in memory and in the redeem body; it is never in a URL, storage or logs. |

Server side: `shared/meri-documents/link-proxy.ts` (fixed same-origin adapter; closed request bodies; no query strings; `no-store`, `no-referrer`, `nosniff`; bounded JSON and 16 MiB attachments) mounted by the thin route `app/api/documents/links/[action]/route.ts`, registered in the architecture allow-list and the preview-admission test. The existing document proxy now allows the read routes (`inspect`, `download`) when either the document or the conversation workflow is enabled; `create` and `revise` still require the document family.

`/meri/files` (create, revise, inspect and canonical download of DOCX/XLSX) is unchanged.

### Approvals, memory proposals, routines, settings

The backend publishes no browser route for these. They are described by one registry, `apps/web/src/shared/meri-resources/unavailable.ts`, which is the single client adapter for each of them until a route exists. The sidebar and phone menu titles, the Recent list, Search, New conversation, Attach, the approval notice and the Meri preferences panel all read from it. Nothing is stored locally: preferences are not persisted anywhere.

### Authentication

Unchanged: the Clerk session and its `capiro` native token are used only server-side by the proxies; the browser holds only the short-lived opaque action session in memory. No credential is placed in a URL or in browser storage.

## Still unavailable, and why

| Resource | Missing route or contract | Owner |
| --- | --- | --- |
| Recent and searchable conversations | A conversation list, search and paging route. Only the run bound to the current session is readable (`POST /api/conversations/history`). | meri-greenfield `apps/control/conversations` (conversation-wide history lane) |
| Earlier turns after reload | Conversation-wide history across runs. Turns sent in the page stay visible; turns from before page load are not shown. | same |
| New conversation | A create-conversation selector. The session bootstrap accepts only hints that must equal the service's own choice. | `apps/control/action-host/session` |
| Runs list, steer, pause, resume, fork | A run list route; `POST /api/conversations/control` is private with no public contract export. | `apps/control/conversations/lifecycle` |
| Approval center and decisions | An approval list route and a browser decision route; only `approval.required` events are published. | approval owner in `apps/control` |
| Memory recall and memory proposals | Memory read, proposal and review routes; no memory event type. | governed memory owner |
| Routines | Browser routes over `apps/control/schedules` (source only). | `apps/control/schedules` |
| Data access | A source coverage route; retrieval contracts have no bound handlers. | gateway and source adapters |
| Meri preferences | Settings read and write routes. | settings owner |
| Attachments | An upload and extraction route. | `apps/artifacts` |
| Workspace-wide file list | An artifact list route; artifacts are published only as conversation events. | `apps/artifacts` |
| Download-link contract | `@capiro/meri-contracts` 0.1.3 does not export the link wire shapes. `shared/meri-documents/link-wire.ts` is the one closed frontend copy, taken from `apps/runtime/artifacts/download-links.mjs`; replace it with the package export when published. | `packages/contracts` |

## Unverified against a live backend

- Whether the session resolver binds a finished run when its exact `runId` hint is supplied, or refuses because a successor is reserved. The frontend never broadens hints on refusal; the person retries or starts the next turn.
- Next-run admission (checkpoint for completed runs, retirement and revocation for failed or cancelled ones) and the per-run sequence restart at 1 are taken from source (`next-run.mjs`, `next-run-journal.mjs`), not observed.
- Download links require the control gate to open (`downloadLinks.enabled`, retention serving, artifact authorization and private-store proof, signing key). Until then issue answers `503 DOWNLOADS_UNAVAILABLE`, which the UI shows as such.
- No deployment, live authentication, paid model call or source connection was made.

## Checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` (root node tests) | 117 / 117 pass |
| `npm run architecture` | pass (0 errors, no unreviewed blocking size findings) |
| `npm run test:transport` | 86 / 86 pass (2 new `prompt` cases) |
| `apps/web` vitest | 172 files, 2509 tests pass (new: `meri-conversation-live`, `meri-document-links`, `meri-unavailable-resources`) |
| `apps/web` lint | 0 errors (81 existing warnings, none in changed files) |
| `apps/web` format check | pass |
| Meri Playwright specs (`test/browser`, Chromium 1194: `acceptance-meri`, `combined-successor`, `meri-*`, `settings*`, `shared-home*`) | 147 / 147 pass |
| `npm run build` (meri-client + Next production build) | pass; `/api/documents/links/[action]` listed as a dynamic route |
| `check:elements` | not run: `packages/ui` and its pins are unchanged |

New and rewritten browser specs: `meri-conversation-host.spec.ts` (22 cases: transcript and cursor resume, multi-turn, early stream end, stalled reconnect, Stop and receipt semantics, 401/403/502, foreign receipt, uncertain submit and retry, navigation retention, session and client replacement, expiry and reconnect, approvals, unavailable titles), `meri-conversation-artifacts.spec.ts` (3: preview and signed-link download with byte check, link refusal, inspect refusal) and the updated conversation case in `combined-successor.spec.ts`.
