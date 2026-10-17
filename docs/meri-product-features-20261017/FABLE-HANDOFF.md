# Meri product-feature handoff to Fable — 17 October 2026

Primary transfer handoff: [planned stable Meri handoff branch](https://github.com/neo-capiro/meri-greenfield/blob/handoff/meri-portable-fable-20261017/docs/handover/20261017/fable-shipping/FABLE-SHIPPING-HANDOFF.md). Publication is pending at this document's freeze; the URL is the coordinator-confirmed planned cross-link, not proof of published contents.
The [published 88620c95 technical checkpoint](https://github.com/neo-capiro/meri-greenfield/blob/88620c95ce19d6ec9dd6b34b3cf8b4160bcd3ed5/docs/handover/20261017/fable-shipping/FABLE-SHIPPING-HANDOFF.md) is historical. Neo's 17 October 2026 02:16:59 safe-stop transfers continuation to Fable on another machine and supersedes that checkpoint's earlier ownership wording. The primary coordinator is assembling the updated transfer and will cross-link this immutable frontend handoff.

New feature work is stopped for transfer to Fable on another machine. This document is a source and evidence handoff, not permission to merge, install dependencies, start services, provision a schema or deploy. Preserve the release owner's qualified source/image pins and checkouts. First-chat shipment, runtime activation, credentials, AWS, migrations, database windows and final acceptance belong to the primary handoff. This lane changed no production source during transfer.

## Published source and stack boundaries

These GitHub PR heads and current target bases were read through the connected GitHub API on 17 October 2026. All listed PRs were open drafts at readback. A PR target can advance; the source-parent column records the reviewed parent independently of that mutable target.

| Frontend deliverable | Exact published head | Reviewed source parent | Target base at readback |
|---|---|---|---|
| [PR61: desktop governed task updates](https://github.com/neo-capiro/capiro-frontend/pull/61) | bd9e0d03c54ef4fbb57010c3b97cfb3d77bdf2b9 | ba95f63b4ec98078547958e32833e791be77a656 | e0b47a34d00b8c181420188ed39a1d849e25ec0a |
| [PR62: personal preferences](https://github.com/neo-capiro/capiro-frontend/pull/62) | 9e6d80843b0a46a862f7613b4ab9b08d925d7b17 | e0b47a34d00b8c181420188ed39a1d849e25ec0a | aae57e924e5812f331c76557f2b7ccaddd4ba0f9 |
| [PR63: preferences production evidence](https://github.com/neo-capiro/capiro-frontend/pull/63) | 1c0c059466963a3a5b4757d05f44701eb2007347 | 9e6d80843b0a46a862f7613b4ab9b08d925d7b17 | 9e6d80843b0a46a862f7613b4ab9b08d925d7b17 |

PR61 and PR62 are independent feature branches, not a merged combined candidate. PR63 is six documentation files stacked on PR62. Do not assume checking out PR63 also includes task updates. The later PR60 differences noted in the PR descriptions are disjoint test/document changes; preserve them during release integration.

Exact reviewed tree equality:

- Task updates: published tree 37ab9023296ee8d8f548c072223d9617eea2b3b8 equals local reviewed e88be229bb5521d9d5968a235cf8cd292f9b8697.
- Preferences: published tree 678bb9a6ac507abbd091d4fd236bd162d4cfca8b equals local reviewed 056b562694df7bbca4a45aef1221d9a3a12bf057. The 21-file production/public snapshot SHA256 is 2105f66ab397eec21e84822a6a5a4b13a2185e23610c34c68d68cf947c75a427.
- Production documentation: published tree d29530ed95672c7e600577d42cd22bbbfc16aed9 equals local reviewed 9a1fb2ed256dda520b9ee36c4da6ac588e5c308e. Its six-document snapshot SHA256 is d97084ff4bbf53b4ae4143ffd012c0893dce43846b0cab99773dd81fc3be4522.

| Companion Meri deliverable | Published head | Source parent |
|---|---|---|
| [PR100: task-update intent/API composition](https://github.com/neo-capiro/meri-greenfield/pull/100) | 78fbd3ae813fcf3fe286969e76102353c3a2eed2 | caa7810ff19c09c8f7ea1c2524c025f36f99ccd6 |
| [PR102: task runtime/public receiving](https://github.com/neo-capiro/meri-greenfield/pull/102) | cc43d0004be59f315658207405ff1aea126adad5 | 78fbd3ae813fcf3fe286969e76102353c3a2eed2 |
| [PR108: native user-preferences API/atomic audit](https://github.com/neo-capiro/meri-greenfield/pull/108) | 9fe0b0857f0284cf460effab34b17fda21c5621d | caa7810ff19c09c8f7ea1c2524c025f36f99ccd6 |
| [PR111: preferences runtime continuation](https://github.com/neo-capiro/meri-greenfield/pull/111) | 10da73795ab5789cb5724d0db45db50bdecb5da3 | 9fe0b0857f0284cf460effab34b17fda21c5621d |

The coordinator's later preferences runtime continuation is published in draft PR111 at 10da73795ab5789cb5724d0db45db50bdecb5da3, tree 9f6df335b70b3c91a6ec1c9e71fd4a1dc0b9a1af, exactly matching local reviewed 69a61c36b1b98e5bc02591f2b4a4c32f14b828cf. It adds source-level opt-in mounting/readiness; publication does not establish live persistence or release qualification. The earlier PR108 report correctly describes its own isolated application scope. Use the primary transfer handoff for final integration ownership.

## Implemented task-update flow

The direct desktop route is /meri/task-updates; no shared navigation entry was added. The thin page/host composes features/meri/task-updates. shared/meri-task-commands owns bounded receiving/forwarding, exact proposal retention behind opaque UI handles and a separate scoped uncertainty journal. Existing application/client and opaque-session owners control lifetime.

Only literal server MERI_TASK_COMMAND_WORKFLOW_ENABLED=true enables this flow; absent or any other value stays off. It also needs the existing validated MERI_API_BASE_URL, Core/designated Clerk configuration and opaque-session composition. Preview write containment remains authoritative. Do not enable unrelated document/action/conversation flags to make task updates work.

Fixed same-origin POST paths are /api/task-commands/prepare and /api/task-commands/execute. Prepare accepts the public arguments containing a known taskId and optional title/status/dueDate patch, and returns an immutable approval proposal. Execute receives that exact proposal. Preparation performs no task mutation. The user explicitly checks approval and executes/checks the recorded result; the browser has no approval-decision endpoint. Meri's canonical approval, current authority, budget, journal and fixed Core update_task source remain the owners.

The proxy obtains native Clerk admission server-side and forwards the existing opaque session bearer, not browser owner/authority claims. Stable tenant/actor/conversation/run correlation, selected context, expiry and current membership are checked by the trusted owners. Client selection is context, not proof of task ownership.

TaskUpdateWorkflow and the query journal preserve content-free uncertainty across ordinary navigation. UNKNOWN never triggers an automatic new write; known STORED_NOT_RELEASED or RESULT_NOT_RELEASED remains a known journal disposition when access loss removes private handles. Checking/replaying the same immutable proposal uses the canonical existing command identity; it does not prepare a replacement or record approval in the browser. Scope replacement, disposal and expiry reject late private replies. Task-update native PostgreSQL/Core/distributed-session/deployed execution and its production Next build remain unqualified in this lane.

Canonical additive public input: @capiro/meri-contracts/task-command-application from PR102. Frontend @capiro/meri-client/task-commands exports the unchanged four generated files under packages/meri-client/vendor/task-command-application/0.1.0. provenance.json binds every byte count/hash to cc43d0004be59f315658207405ff1aea126adad5. Existing contracts0.1.8, old tarballs and the lock are unchanged. Use scripts/task-command-public-input.mjs to verify the retained public artifact; never substitute private backend modules or handwritten wire DTOs.

Source report: [PR61 implementation and verification](https://github.com/neo-capiro/capiro-frontend/blob/bd9e0d03c54ef4fbb57010c3b97cfb3d77bdf2b9/docs/meri-task-updates-20261016/IMPLEMENTATION.md). Independent source ACCEPT covered 30 behavior tests, 7 Node controls and 4 desktop browser cases; the reviewer also ran 14 adversarial public-receiver cases. See [portable selected evidence](evidence/task-update-summary.json) and the [synthetic desktop screenshot](evidence/task-update-desktop.png).

## Implemented personal-preferences flow

/settings/preferences and /settings/meri-preferences reach the same personal slot. features/meri/user-preferences owns presentation; shared/meri-user-preferences owns native forwarding, controller, public receiving and navigation journal. Other preferences pages/design fields stay unavailable.

Only literal server MERI_USER_PREFERENCES_ENABLED=true enables the form and proxy, with the existing validated MERI_API_BASE_URL at its origin root and designated Clerk/Core configuration. Absent or nonliteral values stay off. Existing preview containment runs before authentication or forwarding.

Fixed POST /api/settings/user/read accepts an empty object. POST /api/settings/user/save accepts expectedRevision plus the complete canonical preferences document. Both successes contain owner {tenantId,actorId}, revision and preferences. Browser expectations use independently verified Core me.read tenant.id and user.id: actorId is the native Core user ID, not the Clerk subject. The Next route obtains the Clerk capiro-template bearer server-side. No opaque action-session credential is used for preferences.

The canonical backend owns current membership, schema/timezone semantics, CAS and atomic audit. The frontend captures the complete receiver-frozen document, preserving unexposed notification/default-client values. Supported theme/density changes preview only inside this panel; timezone is editable. Global appearance, notification delivery and automatic client selection are not implemented.

Every save is explicit. A 409 requires explicit reload. Lost acknowledgement retains the exact attempted revision/document in the session/client QueryClient and fences writes across navigation. Read-only reconciliation at the same revision stays unknown; exact next revision/document establishes only the current matching saved value. A higher differing revision requires explicit Use current saved preferences before new edits, with no old-draft reapplication. Failed reads cannot unlock the fence. Scope replacement clears private cached data, and disposed/StrictMode-replaced views cannot admit late replies. Admitted UNKNOWN/RESULT_NOT_RELEASED dispositions survive access-loss cleanup without retaining private output. Journals are in memory and do not survive a browser restart.

Canonical additive public input: @capiro/meri-contracts/user-preferences-application from PR108. Frontend @capiro/meri-client/user-preferences exports packages/meri-client/vendor/user-preferences-application/0.1.0. Its provenance.json binds all four generated files to 9fe0b0857f0284cf460effab34b17fda21c5621d; verify with scripts/user-preferences-public.mjs. No installed dependency/lock replacement occurred.

Source report: [preferences implementation](https://github.com/neo-capiro/capiro-frontend/blob/1c0c059466963a3a5b4757d05f44701eb2007347/docs/meri-user-preferences-20261017/IMPLEMENTATION.md). Independent ACCEPT covers 28 behavior tests, 11 Node controls, app/client types and 5 actual desktop browser interactions over production modules/public receiving with explicitly synthetic identity/storage boundaries. See [selected evidence](evidence/preferences-summary.json) and [synthetic screenshot](evidence/personal-preferences-desktop.png). Missing unrelated shell assets in that narrow checkout were not full-shell visual qualification.

## Portable reproduction on another machine

Read root/app AGENTS.md, docs/IMPLEMENTATION-STANDARDS.md and docs/ARCHITECTURE.md first. Use a fresh owner-allocated checkout of the selected published stack; inspect free disk/memory before hydrating dependencies or browser/build output. Do not copy this machine's node_modules links, absolute paths, .next, local profiles or credentials.

Use Node24 (author used 24.19.0) and the repository npm/lock. Only if a new machine's installation and resource allocation are approved, run npm ci --ignore-scripts from that checkout. This handoff does not execute or authorize that installation. Existing versioned vendor inputs must be materialized from Git, not recreated. No browser download is required when an approved installed Chrome/Chromium executable is supplied. Use fresh Playwright-managed temporary profiles.

The following commands are instructions for the receiving owner; none were rerun during handoff. Start at repository root on the appropriate feature stack:

~~~sh
node --version
node scripts/public-packages.mjs
node node_modules/typescript/bin/tsc --project packages/meri-client/tsconfig.json --noEmit --incremental false
node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false
~~~

On PR61, verify its own public artifact and seven Node controls:

~~~sh
node scripts/task-command-public-input.mjs
node --test apps/web/test/task-update-workflow.test.mjs scripts/architecture-task-commands.test.mjs scripts/task-command-public-input.test.mjs
cd apps/web
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts --configLoader native tests/meri-task-command-adapter.test.ts tests/meri-task-command-proxy.test.ts
node ../../node_modules/@playwright/test/cli.js test --config test/browser/playwright.config.ts test/browser/meri-task-command-workflow.spec.ts --trace off
~~~

On PR62/63, verify its own public artifact and eleven Node controls:

~~~sh
node scripts/user-preferences-public.mjs
node --test scripts/architecture-user-preferences.test.mjs scripts/user-preferences-public.test.mjs scripts/public-packages.test.mjs
cd apps/web
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts --configLoader native tests/meri-user-preferences.test.ts tests/meri-user-preferences-proxy.test.ts
node ../../node_modules/@playwright/test/cli.js test --config test/browser/playwright.config.ts test/browser/user-preferences.spec.ts --trace off
~~~

For browser commands, set nonsecret CAPIRO_BROWSER_TEST_PORT to an allocated unused loopback port (author used 5216 task updates and 5217 preferences). Set CAPIRO_QA_CHROMIUM_EXECUTABLE to that machine's approved installed browser when needed. The checked-in config starts its own Vite harness with reuseExistingServer=false. Fixtures are explicitly synthetic and never supply production authority. Confirm the runner/server terminate; on Windows the historical runs needed stopping only the exact recorded own Vite process after all cases passed. Never stop processes by a broad name match.

Checked-in task fixtures are sufficient to run the PR61 tests. Optional regeneration uses the existing scripts/task-command-fixtures.mjs with MERI_TASK_COMMAND_QUALIFICATION_SOURCE pointing to a separately pinned PR102 Meri checkout. It invokes actual owners over synthetic boundaries without native calls and overwrites only test fixtures; regeneration is not required to consume this handoff. Preferences already contains its captured actual-application fixture. Do not replace either with invented happy-path wire shapes.

Run scoped ESLint/Prettier over changed files and existing architecture checks before any later publication. The whole architecture scanner historically exits1 with errors=[] and 233 existing blocking size signals; do not relabel it pass or add blanket waivers. Task-update's two new size signals were substantively reviewed at exact fingerprints; preferences had no new owned size signal.

### Production build evidence and limits

At exact PR62 source, Node24 compiled the client and supported Next16.4 Webpack build passed compilation, TypeScript, all 282 generation entries and a 52-entry route manifest including /api/settings/user/[operation] and /settings/[section]. The build took approximately 158 seconds. PR63 contains the portable [complete transcript](https://github.com/neo-capiro/capiro-frontend/blob/1c0c059466963a3a5b4757d05f44701eb2007347/docs/meri-user-preferences-20261017/production-evidence/BUILD-OUTPUT.txt), [machine result](https://github.com/neo-capiro/capiro-frontend/blob/1c0c059466963a3a5b4757d05f44701eb2007347/docs/meri-user-preferences-20261017/production-evidence/BUILD-RESULT.json), [package result](https://github.com/neo-capiro/capiro-frontend/blob/1c0c059466963a3a5b4757d05f44701eb2007347/docs/meri-user-preferences-20261017/production-evidence/PACKAGE-CHECK.json) and [exact byte/hash bindings](https://github.com/neo-capiro/capiro-frontend/blob/1c0c059466963a3a5b4757d05f44701eb2007347/docs/meri-user-preferences-20261017/production-evidence/EVIDENCE.json).

Published transcript normalization removes trailing spaces/tabs/extra EOF lines and uses LF. Its original untouched local raw log is separately hash-bound in EVIDENCE.json; another machine needs only the committed normalized transcript to inspect the result. The earlier missing sparse vendor manifest was repaired from Git (14 tracked inputs, 3,371,011 bytes); the full package check then passed 11 historical records plus four supplemental preferences files.

The historical build borrowed installed dependencies. It omitted 27 externally traced files and retained two absolute next/shiki links, so its standalone output is not relocatable or deployment-qualified. Default Turbopack was not qualified. Output occupied about 1.259 GB plus two links, including about 1.19 GB disposable compiler cache. Fable must allocate a complete release-owned dependency tree and disk/memory before any affected production build; do not reuse the historical bundle.

If later approved, the existing source-build commands are:

~~~sh
node node_modules/typescript/bin/tsc --project packages/meri-client/tsconfig.json
cd apps/web
node ../../node_modules/next/dist/bin/next build --webpack
~~~

Author environment set NEXT_TELEMETRY_DISABLED=1 and NODE_OPTIONS=--max-old-space-size=8192. Choose memory limits for the receiving allocation. A passing source build does not establish native authentication, persistence, external services or release artifact correctness.

## Integration and qualification holds

Keep both frontend flags off until the primary owner qualifies the corresponding trusted runtime composition and live flow. Task updates require the actual opaque session/native membership, approval/capability owner, durable journal/budget and fixed Core source together. Preferences requires the native current-membership owner, exact two-route runtime mount/readiness and canonical persistent CAS/audit store. No browser fixture, static success message or service-health result replaces these.

The settings migration is already centrally reserved: apps/control/settings/migrations/0001_settings.sql, authored at cf639d4707df0060524218c65d941834ed7ea2e3, blob 048a834c4335f97aa5f8691afc3c310188ec4388. Do not allocate duplicate DDL or infer application/privileges from source presence. The coordinator separately owned the PostgreSQL qualification window. Its actual attempt recorded one guard pass and ten cases canceled by the before hook; no persistence, CAS/audit, role or restore pass is established. Dump/restore remained unrun. The diagnostic retry was rejected by automatic approval review before execution; no workaround or retry followed. The task-owned PostgreSQL process was stopped and removed, and port55436 was confirmed clean.

The coordinator's [planned portable PostgreSQL receipt](https://github.com/neo-capiro/meri-greenfield/blob/codex/meri-product-features-handoff-task6-20261017/docs/qualification/user-preferences-20261017/README.md) is pending publication at this freeze. It is the intended transfer evidence path, not a claim that the URL already serves content. Use its final published readback with the primary handoff before qualifying storage, privileges or recovery. This frontend transfer starts no database or test and changes no grant.

Native deployed Core/Clerk, current service binding, full browser read/save/readback and task execution, release-owned standalone/container output and shipping qualification remain explicit owner gates. No new model calls, Office editor, device bridge, live browser takeover, authenticated third-party workflow or mobile expansion belongs in this transfer.

## Stopped discovery: next memory-review flow

Read-only discovery completed; implementation, branch creation, DTO copying and scaffolding never began. The proposed next cohesive flow is the already designed Settings Memory Review Inbox: list, protected detail, explicit approve/reject and read-only decision reconciliation. Existing /settings/memory and settings access already support standard users; no navigation or browser role-policy expansion is needed.

Inspected Core source: 635486fd21f0fb0f6893241f47dbfef7d343d849 in neo-capiro/capiro-backend. Canonical files are apps/api/src/memory/memory-review-inbox.controller.ts, memory-review-inbox.service.ts, memory-review-admin-inbox.service.ts, memory-review.controller.ts and memory-candidate-review.service.ts. MemoryModule injects MemoryReviewAdminInboxService using the base service token; do not infer policy from the base projection alone. The adapter permits authorized admins' own/unassigned pending proposals after canonical authorization; non-admin assignment/grant rules remain server-owned.

| Existing Core endpoint | Meaning |
|---|---|
| GET /api/memory/review/inbox | Body-free protected page; views needs_my_review, submitted_by_me, all_pending, blocked, history; limit1–50 (default25), opaque cursor bounded512 characters |
| GET /api/memory/review/inbox/summary | Enabled state, five counts and truncated flag |
| GET /api/memory/review/inbox/candidates/:id | Protected current detail, immutable candidate/root/revision lineage, proposal, capabilities, timeline and controlling-memory reference |
| GET /api/memory/review/inbox/requests/:id | Alternative protected request detail |
| POST /api/memory/review/candidates/:id/approve | Existing canonical approval, success201; bounded frontend body subset {} |
| POST /api/memory/review/candidates/:id/reject | Existing canonical rejection, success201; nonempty whitespace-normalized reason, max500 |

These are full native Core routes, including its /api prefix. Existing frontend Core descriptors use relative /memory/review/... paths because the validated CORE_API_BASE_URL already includes /api; do not add the prefix twice.

Readiness is Core-owned: MEMORY_CLIENT_REVIEW=enforce plus governed lifecycle/enforcement enabled for the exact tenant through MEMORY_GOVERNANCE_TENANTS. Detail rechecks active membership, tenant, participation/admin visibility, grant, ethical wall and client state. Consume admitted current capabilities; do not recreate these rules or derive identity from Clerk subject in the browser.

The inbox DTO has candidate/request/root/predecessor IDs, revision, kind standard/correction/restore/contradiction, firm/client scope, optional client, title, status, people/timestamps, blockedReason, nextAction and capability booleans. Detail adds key/value or canonical sections, feedback, eligible reviewers, timeline, controllingMemory and activeMemoryUnchanged. Status is pending/changes_requested/approved/rejected/withdrawn/superseded. A version decision can be duplicate/conflict as well as activated/rejected; UI copy must reflect the actual public response rather than universally claiming activation.

No canonical memory-review public DTO/runtime schema export exists in the inspected installed @capiro/shared package (frontend pins capiro-shared-0.0.0-38fec5c8.tgz). The coordinator requested allocation from the actual Core owner, then canceled it at safe-stop before any worktree, file, edit, test or push. It remains a pending proposal with no authored public-contract source. Do not hand-copy private types/validators, silently replace that tarball, or invent a Meri contract. Existing fixed operation descriptors use synchronous Zod safeParse, so a canonical public synchronous parser/validator plus types fits a narrow adapter; an async-only interface needs an explicitly allocated boundary design.

Proposed frontend allocation, still unassigned: replace only MemorySettings.tsx's inbox slot; pass independently verified identity from SettingsScreen.tsx; new features/settings/memory-review modules; fixed operations/memory-review descriptor(s) and one registry.ts composition entry; focused tests and architecture allocation. Leave notifications, other governance tabs, file editing and Meri memory fixtures unavailable.

Proposed content-free journal: session/client QueryClient key bound to verified Core tenant/user and immutable candidate ID; store candidate/request/root/revision identifiers, attempted decision and pending/unknown state, not proposal/title/rejection reason. Fence before dispatch; navigation preserves it while private handles are disposed. Any dispatched unadmitted/lost reply stays unknown; both decisions remain blocked. Explicit Check decision status can show a currently recorded terminal decision without claiming the lost request's receipt. Pending/changes_requested, 403/404, scope loss and list disappearance cannot prove rollback and must not unlock/replay a write. No idempotency or expectedRevision parameter exists on these Core decision routes; revisions use new candidate IDs. The journal is in memory; do not introduce localStorage to claim restart recovery.

Reuse existing SettingsCard/Tabs/Dialog/DataTable primitives, design target411:67920, settings-scenes/settings fixtures and Core inbox/admin/controller tests. Browser cases should cover capabilities, actual201 responses, mismatch/currentness, explicit rejection confirmation, navigation uncertainty, pending/404 reconciliation, final status, expiry and late scope responses. No Figma request or additional assets were needed for discovery.

## Other unfinished gaps

Fable's memory producer proposal M2 (/clio/memory/review/submit/status/read_target/find_by_key) remains a proposal in the inspected Meri package-four handoff, not these existing Core user review endpoints. Do not manufacture a producer route or claim Meri proposals now reach Core. Existing firm-onboarding Core submission already returns pending_review; avoid duplicating it.

Routine list/detail/editor/history screens are disconnected presentations with disabled mutations and fixture-only drafts. No browser schedule contract/authority was selected or implemented here. Their lifecycle/approval/runtime gaps remain for the primary owner. Preserve the distinction between accepted v1 work and the later device/browser/Office/third-party/mobile work.
