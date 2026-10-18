# Exact-run same-host reconnect correction

Separate candidate from frozen receiving `4e1421054df0d32c564f7c9bc75cbd5e5366b428`. The normal host captures its initial bootstrap hints once. The selection cache records an admitted conversation/run for a later remount, but expiry/reconnect on the same mounted controller previously reused the original client-only hints. A later session could therefore install a different run while still matching the original hint.

`ConversationHostController` now retains selected-client/conversation/run selectors only after the existing account correlation, binding callback, abort and current-client checks succeed. Later bootstrap calls require that exact admitted context. An unavailable or foreign response neither changes the pin nor authorizes fallback. This extends the existing strict hint/receipt contract; it introduces no new endpoint, credential, selector source, write authority or shared controller.

## Verification

The dedicated test on unmodified4e reproduced **two failures and one passing rejection control**: the second bootstrap omitted run selectors, and a changed run was accepted. The unchanged candidate test then passed alongside all existing host/proxy/route tests: **64 passed, zero failed/skipped**. It covers same-host expiry/reconnect, rejection of a substituted run while preserving the original pin for retry, and refusal of a first foreign account without installing hints. Existing session/account/client replacement, late-response, expiry and callback-refusal controls remain intact.

Targeted strict typing of the changed controller/new test and their transitive imports passed using canonical web compiler options, with no incremental output. This is not full final-tree typing, fresh dependency generation or a production build. Tests use synthetic bounded session receipts and existing borrowed dependencies; no real service/runtime effect or server authorization is qualified.

Targeted lint, formatting and the existing architecture guard passed; no registry or review-threshold change was needed. Independent source review accepted the narrow hint pin and regression boundaries. The reviewer did not rerun tests or claim native acceptance.

## Scope and remaining contracts

This correction constrains what the browser accepts on reconnect. It does not prevent the current Meri server selector from reserving a successor before returning a mismatched session; read-only selection versus explicit creation/continuation still requires the Meri owner's reviewed contract and implementation. Recent-conversation listing, historical read versus write admission, continuation command uncertainty and target-session replacement remain unimplemented. Do not unlock a composer by clearing an old submit journal or relax exact-run equality to adopt a new target.

The Meri coordinator received the exact seven desktop TODOs from test-only `bae3bfad` and the concrete B1/B6/B7 binding feedback. The new discovery/turn proposal remains unsealed/unaccepted. The frozen receiving pin, public packages, proxy routes, schemas/registry, locks, Objective/Planner lanes and accepted A2/bridge packages are unchanged. Application activation stays held; desktop priority and mobile deferral remain. No live/provider/model/database/AWS/image/deploy action or publication occurs in this slice.
