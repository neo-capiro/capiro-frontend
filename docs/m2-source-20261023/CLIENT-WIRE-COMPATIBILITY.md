# Installed package and current-main client conversation check

This is offline source qualification, not a deployment receipt or General-chat acceptance. The frontend preview gate and opt-in live-manifest schema now require the actual installed contracts package **0.1.11**. Both explicitly reject the stale 0.1.10 value. All existing origin, route, method, source/image, authentication and activation checks remain unchanged; no environment or release flag was changed.

The frontend change starts from `5e688ba23116b9a6a1c4a587fcebeed236a11c03`, the ordinary merge of U's MF19 checkpoint and reviewed main `75458af705e352c54bf23ed3b5c61de7e781d714`. The backend used for qualification is a clean detached checkout of Meri main **405c9705542cd8475af4a56fe2208172dc9a1ed6**, tree **b62a32d606322a5222fce6b9a4600d897f392493**. No dirty Step2 runtime source was imported.

## Distribution evidence

The vendored contracts archives were compared directly, without rebuilding them:

| Distribution | SHA256 |
|---|---|
| contracts0.1.10 | `10b0c233c1c0f94d837ae178897db46fd9f6a65d375a85c8897b07ea7f95c77d` |
| contracts0.1.11, source16a93e7fafd648c13a9289d8a7d623d89967366a | `21c4a7f2408e8516e0041021f3e19d2c2d6d41bf3aca8d7b46745680385111e3` |
| stream0.1.1, source54aa8278b354db030a11a77c9c06aa8eb9e50393 | `6d37f584ccf23a8cd7447339b549ada544e5b17ddf8d5094716d6ce6015b5f1e` |

The 0.1.10 and 0.1.11 archive bytes match for the application, lifecycle, history, action and document receivers. Exact matching distribution hashes:

| Export's distribution file | SHA256 |
|---|---|
| conversation-application.mjs | `94465895c6a063536cd4de3ce84d6f736e8475890a663ef80e9c5d748992cea1` |
| conversation-lifecycle.mjs | `b283901e0006f9a06f4b63f957133cce57914e791fb07bec8c1017a1d4ae149e` |
| conversation-history.mjs | `1a1b4b0950ca8c328983d397cbb17730bbe597ddba8140ae82fb59f86a2f790c` |
| action-application.mjs | `9e824b7f814561ec46aa63b0c31057a8292515a9f0186707bc838fed98eb3534` |
| document-application.mjs | `fc956a72ca6ee199781ce3c09e984cac1cd7d1041afc685b36d05ba93f30507c` |

Input and initial-input receivers differ to support explicit General context; conversation-session and skill-catalog are new exports. Their entire equivalence is **not** claimed. Current Meri main still declares contracts0.1.10. The client-only integration below exercises its genuine input responses through the installed 0.1.11 browser receivers. General source transplantation and deployed-package compatibility remain separate work.

## Genuine client-wire composition

`packages/qualification-transport/conversation-cross-repository.mjs` now uses the backend's existing `applicationFixture({initialInput:true})`, `createConversationInitialInputApplication`, and `createConversationInputApplication`, alongside the ordinary conversation application. The frontend's actual `submitInitial` performs allocate → admit → submit; the test checks that exact order and one allocation. No allocation, receipt or response is fabricated by the frontend harness.

The pre-change test file at blob `918837c4` called ordinary `submit` against an application lacking both input HTTP handlers. All13 tests failed at the first input admission (`NOT_FOUND`) on the exact backend above. Enabling the initial-input store alone exposed the still-unmounted allocation handler; that intermediate failure is retained too. The repaired composition passes all13 original behavior cases: submit/cancel/stream, page40/20 followed by real SDK GET through200, lost-ACK exact retry, disposal without cancellation, and nine current tenant/actor/conversation/run/attempt/worker/fence/scope/revocation refusals. Their existing assertions remain intact.

The backend uses its scripted PostgreSQL fixture and synthetic identities, the real service/store/HTTP/event producer, and the frontend's actual public client/AI SDK. External fetch is forbidden. It does not invoke a model, connect a database or prove native SDK execution.

## Commands and limits

On Windows Node24.22.1/npm11.19.1:

- `npm run test --workspace @capiro/web -- tests/meri-preview-route-activation.test.ts tests/meri-m1-release.test.ts tests/meri-capabilities.test.ts`: 50/50 pass.
- `npm run typecheck --workspace @capiro/web`: pass.
- `npm run test --workspace @capiro/qualification-transport`: 112/112 pass.
- Set `MERI_CONVERSATION_QUALIFICATION_SOURCE` to the clean checkout above, then `npm run test:cross-repository --workspace @capiro/qualification-transport`: 13/13 pass, zero skips.

Only dependency directories were borrowed into the disposable Meri checkout, including its pinned Temporal polyfill and AI SDK; no product files were altered. Failure/pass logs are retained in the task evidence directory `work/wave2-current/u/client-wire-20261023-1800`. Exact-head Linux/build, independent review, deployment, General and service-backed acceptance remain root gates.
