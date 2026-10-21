# M1 integration follow-up — agent 4 v1

## Scope and baseline

This draft was originally stacked on frontend PR119 at `1cec16f18d359ef9152f996dc4dd0f976a2780eb` (tree `01682c03b3e7813bc19676cab0c4be048159b5b1`). Fable's requested next-head review in PR119/comment6327902663 supersedes that earlier freeze for current M1 corrections. The same integration is mechanically reapplied on corrected PR119 `9b4a9159cd32f6681995c5bbfc97c2a31cc13ba3` (tree `0f195a673df9de05bf6f0c39f0a3726cce34f2f4`); no PR120 verdict is inferred. Neo approved same-tab retention and the named M1 exceptions; Fable’s comment6326945491 clarified the three integration owners. No next-phase work, runtime/dependency/migration change, merge or deployment is included.

Canonical owners remain: Clerk/ApplicationBoundary for loaded auth and expiry; shared Meri journals for exact scoped recovery and stale-writer fences; feature draft owner for raw text and captured ACK revision; existing server configuration and preview policy for capability state. Capabilities default off. Stored data contains no bearer/session credentials and never grants authority.

## Source behavior

- Every page load must synchronize its loaded user/session/organization identity before Meri mounts or journal recovery is permitted. An old stored marker alone cannot unlock reads/writes. Loading and navigation do not purge; confirmed signout and application expiry do.
- Same-tab draft and request records are bounded and keyed by native tenant/actor/client/conversation. A different identity purges before hydration. A public-route visit followed by a different sign-in restores nothing.
- Raw draft text and captured request/ACK revision are retained separately from server acceptance. Reload restores immutable request identity as uncertain, with existing exact server recovery; it does not create a replacement logical request. Edits, including ABA edits, survive a later ACK.
- Storage failure preserves mounted text and blocks mutation. Access revocation clears only the exact conversation, its matching current-conversation pointer and stale writers; unrelated permitted conversation drafts remain.
- The server Meri layout supplies capability state to home/sidebar/mobile/route containment. The only architecture allocation is the named server capability-reader import of the canonical preview policy. No lifecycle API/SDK candidate is included; those controls remain held.

## Receipts

### Mechanical stack refresh after PR119 review

The original PR120 head `870247e314a5f5470dadc6021ad9217556656968` and its equivalent local source `7dc12173ed9e154031c5d6a53f31b72c0aeb0ddd` are preserved as the comparison baseline. The refreshed stack retains all 55 integration paths. Three textual overlaps were resolved: access-loss copy keeps the draft/storage barriers; the sidebar assertion uses the integrated capability explanation and rejects a fake link; draft-recovery browser cases remain active while retaining the new two-readback Stop timing check. Independent comparison found no lost integration behavior.

Combined Meri Vitest passed **68 files / 910 tests**, with zero failures. Architecture passed with zero errors/blocking findings and the same 539/521/18 total/reviewed/inherited signals. Overlap ESLint passed with zero errors and the same one unused browser-fixture import warning. Formatting and diff checks passed. Full web TypeScript and final browser TypeScript results are recorded in the PR description.

The inherited PR119 correction receipt is `REVIEW-119-R1.md`: full web 3,072-test pass plus final focused Stop rerun and 13 killed correction mutants. The 169-test browser attempt was blocked at missing Chromium launch (58 completed launch failures, 111 without completed result); it does not qualify either head's browser behavior. No repeated browser run or production build is claimed. The two stronger MF-06 claims remain held for clarification; Core107 is frozen and Neo has separately approved the bounded migration-cleanup task, whose exact live-ledger input remains pending from Fable.

### Original integration receipts

The preparatory source at local `b4b0b871c74f4baa6937a877544886011b3c112a` passed 59 files / 872 Meri tests, including 9 new tests qualified by 10 killed mutants. This is a historical receipt, not the final integrated count.

The complete authorized snapshot passed these checks. The PR description records its exact local source, published commit and matching tree identities. No parked lifecycle SDK/API candidate was included in the snapshot or publication.

| Check                                               | Result                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `vitest run tests/meri*.test.ts --maxWorkers=2`     | 66 files / 903 tests passed, zero failures                                                                               |
| Full web `tsc --noEmit --incremental false`         | Passed with a 6 GiB Node heap; no diagnostics                                                                            |
| `node scripts/architecture.mjs`                     | Zero boundary errors and zero blocking size findings; 539 total signals, 521 reviewed, 18 unchanged inherited/unreviewed |
| `node --test scripts/architecture-preview.test.mjs` | 6/6 passed, including the exact server-reader allocation and forbidden import variants                                   |
| Changed TS/TSX ESLint                               | Zero errors; one inherited unused `run` warning in the browser conversation-host fixture                                 |
| Changed TS/TSX Prettier                             | Passed; final connection-hook change was formatting only                                                                 |
| Focused browser TypeScript and discovery            | Passed; 7 targeted cases discovered, bodies unrun                                                                        |

The architecture check used the complete baseline review-evidence documents. The development worktree has a sparse docs checkout; absent evidence there is not a reason to change the architecture policy. All reviewed product/test files matched the authorized snapshot; no policy waiver or size exemption was added.

### Mutation checks

Each listed fault caused its targeted behavior assertion to fail. Mutations ran through isolated transforms/copies; no mutated product source is included. These checks are separate from the 903-test count.

| Area                                       | Killed mutants | Faults covered                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | -------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page identity primer                       |            3/3 | Read without this page's primer; omit different-identity purge; accept a mismatching live marker                                                                                                                                                                                                                 |
| Application boundary and selection pointer |            9/9 | Keep stale readiness; mount before primer; treat loading as signout; skip confirmed signout or transport expiry; accept storage failure; retain revoked pointer; accept late pointer writer; clear another conversation's pointer                                                                                |
| Revoked query-cache recovery               |            6/6 | Skip cache removal; retain turn cache; retain blank selection cache; purge another account; purge another client; omit storage clear                                                                                                                                                                             |
| Draft and continuation integration         |          11/11 | Lose raw hydration; ignore ABA revision; lose continuation capture during source reopening; lose reserved capture; discard text on quota failure; fail atomic ACK persistence; omit selection renewal; edit an unbound draft; ignore reserved request identity; capture after dispatch; permit duplicate capture |
| Capability state and serving profile       |          11/11 | Missing inventory consumer; enabled link leakage; invalid configuration enabled; preview bypass; enabled context default; stale preferences copy; disabled/enabled/preview API disagreement; direct-route bypass; home raw-flag bypass                                                                           |
| Narrow architecture allocation             |            2/2 | Reject the approved exact reader; broaden unrelated preview imports                                                                                                                                                                                                                                              |

The new public-route regression visits a public route without reading retained content, then signs in as another identity and verifies nothing is restored. Boundary tests use real journal owners/storage with deterministic auth/provider hooks; they are not browser qualification. Recovery tests also cover a selective turn-write failure after a new draft capture: recovering the older accepted request cannot clear that newer draft. Duplicate-click coverage verifies capture runs inside the command gate before dispatch.

The dedicated browser set includes both desktop/phone draft-reload cases and composed signout, exact conversation revocation and public-route/different-signin cases. Chromium is missing, so no browser test body or browser mutation executed. The environment also lacks free disk space for a production build. These remain explicit gates; unit checks do not substitute for them.

## Remaining acceptance

No ticket is declared closed. Native identity/renewal, preview/provider behavior, physical Stop retirement, deployment reopening,20-minute idle, visual/accessibility and E01–E07/E12/whole-flow release acceptance remain Fable’s independent gates. The live suite stays opt-in and no production/provider action was run.

Core PR107 remains frozen at `51e265bd5b5170abffb32a62ffc39a52a788fe60`. Fable separately reported native-amd64 Docker qualification PASS and generator review ACCEPT. The isolated entrypoint receipt still states `FULL_API_STARTUP_UNVERIFIED`; no merge/deployment authorization follows from those reports. See `APPROVAL-AND-HANDOFF.md` for exact receipts.
