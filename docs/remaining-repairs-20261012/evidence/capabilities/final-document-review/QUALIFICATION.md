# PR15 qualification record

All results below bind to frozen source `1585438295776604f23a5cb5ab592729f7c468ca` unless explicitly labeled historical. **Host/static/fixture qualification passed; actual image qualification remains blocked and native acceptance remains open.** [HANDOVER.md](HANDOVER.md) records scope, source trees, custody and acceptance boundaries.

## Completed exact-source gates

| Gate | Observed result | Raw receipt |
| --- | --- | --- |
| Clean install | Passed; 847 packages installed. | [Install](evidence/qualification/final-1585438/clean-install-exit.json) |
| Corrected regression replay | 23/23 passed; zero failures, skips or flaky cases. | [Results](evidence/qualification/final-1585438/corrected-regression-results.json) |
| Combined checks | 1,472 passing controls: 59 root, 21 public transport, 1,275 Portfolio/unit and 117 Modules/Capiro. Public-package, type, lint, format and architecture checks passed. | [Log](evidence/qualification/final-1585438/combined-check.log), [receipt](evidence/qualification/final-1585438/combined-check-exit.json) |
| Elements | 15/15 passed. | [Log](evidence/qualification/final-1585438/elements-check.log) |
| Host production build | Passed; actual standalone build, build ID `5gHD80mUbuwxCPBarQvGL`. | [Build identity](evidence/qualification/final-1585438/BUILD-IDENTITY.json) |
| Actual standalone server | 11 HTTP checks, 4 light/dark desktop/phone renderings and 2 desktop mode/history checks passed; no recorded page errors. No credentials or service interception. | [Smoke](evidence/qualification/final-1585438/production-artifacts/production-smoke.json), [receipt](evidence/qualification/final-1585438/production-server-exit.json) |
| Docker context | 33/33 actual scratch-export checks passed, including 12 tracked Work files. | [Log](evidence/qualification/final-1585438/docker-context.log) |
| Full Modules browser | 208/208 passed; one worker, 60-second timeout, zero retries/skips/flaky cases. | [Results](evidence/qualification/final-1585438/modules-browser-results.json), [receipt](evidence/qualification/final-1585438/modules-browser-exit.json) |
| Full Portfolio browser | **1,118/1,118 passed**, each once; zero retries/skips/flaky cases. Three workers, 60-second default timeout; four existing 180-second cases unchanged. Completed 22:53:01 UTC, exit 0; source unchanged and server closed. | [Final summary](evidence/qualification/final-1585438/PORTFOLIO-FINAL-SUMMARY.json), [results](evidence/qualification/final-1585438/portfolio-browser-results.json), [receipt](evidence/qualification/final-1585438/portfolio-browser-exit.json) |

Completed gate receipts record unchanged before/after source. Existing 76 lint warnings remain visible. Architecture reports 427 signals: 403 reviewed, 24 inherited/unreviewed and zero blocking errors; thresholds and dependency rules were not relaxed. Meri coverage includes nine workspace Node controls, 21 public transport controls, Elements/assets and actual cross-mode navigation, not full native workspace/browser acceptance. The host build allowed the existing framework cache after a clean dependency install; it is not an independently qualified container image.

## Image and storage blockers

The exact-source Linux image build **FAILED before application compilation** at Dockerfile line 5: Alpine package-index DNS errors followed by package-selection errors. The [failed build](evidence/qualification/final-1585438/docker-build.log) and [unchanged-source receipt](evidence/qualification/final-1585438/docker-build-exit.json) are preserved. The [image-absence receipt](evidence/docker/DOCKER-IMAGE-BLOCKER-1585438.json) confirms no application image exists; container smoke and image scanning are **NOT_RUN**. DNS is the sole observed build blocker; later image stages have not run. Passing context checks do not close this blocker. Dockerfile/base-image/security pins were not weakened.

Historical original-shipping-attachment materialization was blocked by proxy 403. The historical adbc84b [archive-save attempts](evidence/root/LIBRARY-ARCHIVE-SAVE-BLOCKER.json) failed during hosted-tool discovery with a network error; no successful Library save was created. No Library save of the final 1585438 ZIP was attempted or claimed. The exact-source ZIP is independently verified: 9,191 files, 841,126,268 bytes, SHA-256 `0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1`. See the handover for archive and evidence receipts. Prior archive hashes are not transferred to this source.

## Preserved failed checkpoints

| Frozen checkpoint | Recorded outcome and correction |
| --- | --- |
| `104495d4cdc8251640b922aea431fa0e169fe935` | Portfolio stopped after 163 passes, 7 failures, 3 interrupted and 945 unrun. Upcoming meetings intentionally enter Preparation; attendance helpers now select Information and supply its legitimate initial-read fixture. All 12 original test bodies remain. [Checkpoint](evidence/root/PR15-104495D-FAILED-CHECKPOINT.json). |
| `adbc84b2251fe6b06cb7f75030026fba5b4ff498` | Full Portfolio completed: 1,115 passed, 3 failed, zero skips/flaky cases/retries. Corrections restore lowercase timeline `latest`, navigate the approved Facilities manager while retaining 31 assertions and adding 2 save checks, and use the Message contenteditable matcher with the exact expected text. [Final failed summary](evidence/qualification/final-adbc84b/PORTFOLIO-FINAL-SUMMARY.json). |
| `d68c2dc6b80c400b8ce9b07837f7a14cabb5d616` | Modules: 207 passed, 1 failed; Portfolio **NOT_RUN**. Trace review showed Enter before Radix's deferred option focus. Test-only readiness/focus assertions preserve all 20 original statements, 6 keypresses and 66 original assertions; no sleep, retry, click substitution or product change. [Checkpoint](evidence/root/PR15-D68-MODULES-FAILED-CHECKPOINT.md). |

Earlier install-cache, Elements capture-path, browser setup, hidden-trigger-locator and image attempts remain in the raw evidence. Owner red/green histories also remain distinct: Calendar's adjacent held-refresh before-fix browser is NOT_RUN; Mail 79, Profile 67 and Intake 46 preservation controls precede their respective bounded final refinements. Later 45/16/10 owner controls and Calendar 62+2 plus 1 completion-barrier replay are labeled by their actual source/timing in the [lane audit](evidence/final-ledger-review/REPORT.md). They are not relabeled as final broad runs or added together as unique tests.

## Acceptance boundary

All 18 bounded source facets are delivered; all 337 native rows remain held and eight exclusions unchanged. Synthetic route/receipt tests do not establish live identity, native authorization/persistence, provider execution, confidentiality, durability or cross-device outcomes. Full Meri workspace interaction, complete Figma fidelity/accessibility, actual image/scan, deployed-origin and shipping acceptance remain open. No merge, deploy, AWS, real provider, billing or paid-model activity is part of this qualification.

The [independent final gate review](evidence/final-gate-review/addendum-1585438/REPORT.md) and [coverage addendum](evidence/calendar-independent-review/final-1585438-coverage/coverage-and-limits.md) bind the final results. Actual-server history covers all four modes on desktop; phone host evidence covers Portfolio entry/return only. Shared-boundary fixture tests cover sign-out/expiry, actor/session/org/client replacement and interrupted writes under synthetic services, without establishing real Clerk or backend authority. These limits remain separate from the passed exact-source checks. The separately authorized AWS build belongs to the shipping owner and was not executed here.
