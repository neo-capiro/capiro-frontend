# M1 frontend acceptance and release matrix

> Historical PR119 snapshot. Current approved integration and verification are tracked in [INTEGRATION-VALIDATION.md](INTEGRATION-VALIDATION.md) and [APPROVAL-AND-HANDOFF.md](APPROVAL-AND-HANDOFF.md). Earlier pending-policy and skipped-draft statements below describe that frozen snapshot.

**Status: authorized snapshot retains MF-02/MF-06/MF-21, disabled lifecycle UI and source-aware unavailable copy. Lifecycle SDK/API, capability shell/layout integration and all MF-07 persistence are parked pending Neo confirmation. Live acceptance NOT RUN.**

This is the MF-21 receiving matrix, not a second release owner. Fable attaches its completed release receipt to the existing MX-01 status record. Exact source baselines and ownership are in `IMPLEMENTATION.md`.

## Evidence tiers

| Tier             | What it proves                                                                                                                                         | What it does not prove                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Unit/receiver    | Public DTO validation, identity isolation and state transitions                                                                                        | Running services, native membership, DB durability or providers                                 |
| Mocked browser   | Real mounted React components, interaction, request bodies, public response receivers, reload and DOM isolation against explicit synthetic HTTP owners | Next server proxy execution, real issuer/token expiry, worker/provider retirement or deployment |
| Composed native  | Fixed proxy + current native identity + pinned owner + durable journal/readback                                                                        | Live provider effects unless separately recorded                                                |
| Preview/provider | Exact approved deployment and actual current receipts                                                                                                  | Other images, tenants, flags, providers or future releases                                      |

A mocked pass never fills a composed/provider receipt field. `not-run`, `blocked` and `failed` stay distinct. No test writes to production. The optional live suite needs explicit Fable approval, an operator-completed manifest and signed-in test-account state; its default is skipped.

## Receiving inventory and activation prerequisites

This inventory maps release requirements; it is not a claim that every slice is newly mounted or integrated. The authorized snapshot adds disabled lifecycle presentation only. The SDK/API and centralized capability integrations remain in the separate parked inventory in `IMPLEMENTATION.md`.

| Ordinary route/control              | Frontend gates                                                                           | Public receiver/owner                                                                                      | Required release receipts                                                 | Default disposition                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| `/meri` send/history/reconnect/Stop | `MERI_CONVERSATION_WORKFLOW_ENABLED`, configured native identity and HTTPS origin        | `@capiro/meri-contracts` 0.1.10; conversation application/history; Core current authority and Meri control | E01–E07; transcript, submit/request, cancellation and renewal receipt IDs | Held until qualified                   |
| `/meri` first/new conversation      | Above + `MERI_FIRST_CHAT_BOOTSTRAP_ENABLED`, exact permitted `MERI_FIRST_CHAT_CLIENT_ID` | Core bootstrap + existing initial-input allocation/admission owner                                         | One immutable create/input request; lost-ACK/reload proof                 | Held until qualified                   |
| `/meri` lifecycle                   | Conversation prerequisites + available supported lifecycle composition                   | Public lifecycle wire 0.1.0, installed package 0.1.10; Meri lifecycle owner                                | E12 exact control/checkpoint/source/target receipt; safe UNKNOWN readback | Unsupported/held capabilities disabled |
| `/meri/actions`                     | `MERI_ACTION_WORKFLOW_ENABLED`                                                           | Public action application; current action-session owner                                                    | Authorized proposal/decision/receipt/refresh and denial cases             | M4; not qualified by M1                |
| `/meri` conversation approvals      | `MERI_INTENT_APPROVALS_WORKFLOW_ENABLED` and conversation gates                          | Public intent receiver; canonical command/approval owner                                                   | E13–E17 positive, denial, unknown/reload receipt                          | M4; not qualified by M1                |
| `/meri/task-updates`                | `MERI_TASK_COMMAND_WORKFLOW_ENABLED`                                                     | Public task-command receiver; Core task owner                                                              | Durable exact revision/command receipt and refresh                        | M4; not qualified by M1                |
| `/meri/files`                       | `MERI_DOCUMENT_WORKFLOW_ENABLED`, accepted operation                                     | Public document/access receiver; artifact custody owner                                                    | Inspect/download exact version/hash and current-access denial             | M5; not qualified by M1                |
| `/meri/memory`                      | `MERI_MEMORY_OWNER_REVIEW_ENABLED` and preview policy                                    | Public owner-memory receiver; Core Memory owner                                                            | Current scope/decision/retention receipts                                 | M6; not qualified by M1                |
| Meri personal preferences           | `MERI_USER_PREFERENCES_ENABLED` and preview policy                                       | Public user-preferences receiver                                                                           | Current revision save/readback and conflict/denial receipts               | M6; not qualified by M1                |
| `/meri/fixture/*`                   | Explicit design fixture access                                                           | Synthetic design data only                                                                                 | Recognizable fixture labeling and no ordinary route advertisement         | Never authoritative                    |

Configuration combinations required for later capability integration: flags all off; flag true with missing origin/identity; permitted ordinary deployment; restricted preview permitted route/client; restricted preview denied route/client; independently held sibling slices. Sidebar, home, mobile navigation, route and API must agree before that integration is accepted. `/kit` is never an ordinary destination.

## Scenario mapping

| ID                      | Flow/invariant                                                                                                                       | Existing/new source test                                                                                             | Local evidence                                                             | Native/preview evidence                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| M1-FLOW / E01–E07       | Send → streamed answer → reload without redispatch → Stop fence → observed terminal → one second turn → client switch hides old data | `test/browser/meri-m1-flow.spec.ts`                                                                                  | BLOCKED: Chromium absent; both viewport launches failed before test bodies | NOT RUN                                              |
| E02/E03                 | Hard reload before/after ACK; immutable original request; no duplicate input                                                         | `meri-initial-input.spec.ts`, separate MF-07 draft-recovery candidates                                               | Existing rerun pending; MF-07 HELD for Neo approval                        | NOT RUN                                              |
| E04                     | Disconnect/clean SSE end, cursor resume and duplicate/gap refusal                                                                    | `meri-conversation-host.spec.ts`, `meri-conversation-reconnect.test.ts`                                              | Units passed; browser/native qualification pending                                                                | NOT RUN                                              |
| E05                     | Two renewal cycles, expired/revoked sessions, current native subject mapping                                                         | `meri-action-session.test.ts`, `meri-identity-token.test.ts`, `meri-m1-identity.test.ts`, `meri-m1-identity.spec.ts` | MF-02 new unit 6/6 and mutations 6/6; browser BLOCKED: Chromium absent     | NOT RUN                                              |
| E06                     | Account/tenant/client change, stale pending response, draft and cache isolation                                                      | `meri-conversation-host.spec.ts`, new MF-02/MF-07 cases                                                              | Units passed; browser/native qualification pending                                                                | NOT RUN                                              |
| E07                     | Stop during active work; lost receipt; cleanup beyond 150 seconds; retained retry identity                                           | `meri-turn-settle.test.ts`, new MF-06 cases                                                                          | Units passed; browser/native qualification pending                                                                | NOT RUN                                              |
| E12                     | Held controls remain disabled; future lifecycle success/refusal/UNKNOWN and fresh target binding                                     | Disabled lifecycle UI and composed-flow assertions; SDK/API candidate parked                                         | Units passed; browser/native qualification pending                                                                | BLOCKED until runtime composition/readback qualified |
| E40 / whole-flow        | Turn 1 → turn 2 → reload → reopen after deployment → idle 20 minutes                                                                 | Optional `meri-m1-live.spec.ts` + Fable deployment/idle drill                                                        | Live suite skipped by default                                              | NOT RUN                                              |
| Enabled approvals/files | Authorized main-path receipt + denial/UNKNOWN + refresh                                                                              | Existing intent/document suites                                                                                      | Separate slice results required                                            | M4/M5 NOT RUN                                        |

## Release gate

Before any flag activates, record final FE/Meri/Core commits and image digests, installed contract hashes/versions, deployment origin/profile, issuer/audience and verified native subject→actor mapping, exact test tenant/client allowlist, migration/grant receipt IDs, measured worker composition, and secret references **without secret values**. Record positive and negative receipt IDs for every enabled row. Unsupported rows remain disabled. Rollback must preserve uncertain request/control IDs and server reconciliation.

Fable must run the real whole-flow check after the deployment and again after the 20-minute idle interval. A successful local test or a populated template is not release acceptance. No live result is inferred from a PR description, previous deployment or synthetic fixture.

## Commands and operator-only live run

The core composed browser path uses synthetic HTTP and real UI. Separate `HELD draft recovery` variants retain the MF-07 reload assertions but are explicitly skipped while Neo’s persistence-policy approval is pending. A skipped case is not a pass.

```sh
npm run test:browser:modules -- --grep 'M1 composed synthetic'
```

The normal suite discovers `meri-m1-live.spec.ts` but skips it. It cannot visit an external host without explicit opt-in. Fable may copy the receipt template outside the repository, fill every prerequisite, provide a test-account Playwright storage-state file outside Git, and run:

```sh
MERI_M1_LIVE=1 \
MERI_M1_LIVE_MANIFEST=/absolute/private/operator-completed-release.json \
MERI_M1_STORAGE_STATE=/absolute/private/test-account-state.json \
npm run test:browser:modules -- --grep 'M1 approved preview whole flow'
```

The launcher refuses the unfilled template, production hosts, missing approval/source receipts, non-exact source pins, identical test clients, and enabled non-chat slices without positive/negative/UNKNOWN-recovery evidence. It does not derive authority from the manifest: the signed-in native identity must match the operator-approved tenant/actor/subject before any chat input. Neither its manifest nor its output contains bearer or session credentials. The live test makes real chat requests only after this explicit approval; it does not grant provider-write or production permission.

The resulting Playwright attachment records source pins and bounded request/run receipts, not chat text or credentials. Reopening after a new deployment and the 20-minute idle drill remain explicitly separate Fable checks; the short live suite does not claim them. Live scenario assertions and their mutation qualification remain **NOT RUN** until Fable executes them. Local launcher tests verify only the opt-in/manifest gate.
