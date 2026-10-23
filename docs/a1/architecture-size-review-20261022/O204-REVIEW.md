# O204: A1 Portfolio/Mail corrections and exact size review

Accepted size records are registered by exact key: **7 replacements + 1 addition**, following dot comment 6348945931 and corrected O204 authority 6349374903. All eight accepted source fingerprints and prior records were verified before registration. Existing importer/evaluator/baseline/thresholds and unrelated records remain unchanged.

## Corrected behavior

- **PF-CAP-1:** cached current-command admission honors explicit edit/approve/share/unshare refusals. Retained edit/share dialogs and stale entry callbacks honor refreshed capabilities while retaining edit text. Missing-capability compatibility and backend authority checks are preserved.
- **MAIL-RECOVERY-1:** successful exact-token accepted recovery projects success and clears the earlier uncertain error. A new token, scope change, later local send or failed recovery invalidates prior accepted state. Late callbacks are fenced. `send-attempt.ts`, request keys, storage/locks, transport, reservation release and no-resend rules are unchanged.
- **PF-FIXTURE-1:** the receipt harness now seeds `["meeting", id, readClientId ?? null]`, using the same read scope passed to the real form, and supplies a real synthetic `updatedAt` revision for client clearing. Both existing browser spec files and all assertions remain unchanged.
- The inherited Reconciliation cancelled-notes finding is excluded and untouched.

## Verification and limits

| Check | Actual result |
|---|---|
| Capability regression | Pre-fix 6 fail / 4 pass; corrected 10/10 pass |
| Accepted-recovery regression | Original source 2/11 fail; second-token intermediate 1/13 fail; final 13/13 pass |
| Five existing focused Portfolio/Mail suites | 94 passed, 0 failed/skipped |
| Narrow TypeScript project; focused ESLint | exit 0; zero diagnostics/errors/warnings |
| Two existing meeting browser specs | exit 1; all 7 blocked at missing Chromium launch; zero cases executed |
| Composed architecture after registration, before source corrections | exit 0; errors []; 551/533/18/0 |
| Final composed architecture | **exit 1; errors []; 551 total / 529 reviewed / 18 inherited / 4 blocking** |

The final four blockers are new fingerprints created by the authorized corrections. The original 50 acceptances are not extended to these fingerprints. `O204-PROPOSED-REVIEWED-SIZE-FINDINGS.json` contains four inactive concrete cohesion proposals for dot; the registry retains the previously accepted pins. A final architecture PASS remains dependent on their individual review and registration.

| Changed finding | New fingerprint |
|---|---|
| apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx — <module> | `5177818e63066bb762e62f294024d1b8c7c64d96c44c169ee8865240c999def8` |
| apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx — ArtifactEditor | `20cee08ec23298bebe4b587a49e90b39c8b63714e1fbdb2a1b64c812e3fe153c` |
| apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx — ArtifactEditor > <anonymous> #8 | `3d16d20879702a5dc5addfad02f41f64338882636b55e61db21acda309c12489` |
| apps/web/src/features/portfolio/relationships/email.ts — useSendMail | `5ae96096540e54531fb43a280f8f643cf66e59383349eb305bd516740d4fe83e` |

The tests use Node/SSR and controlled hook scheduling with real query cache/settlement helpers, not actual browser/provider integration. The missing-jsdom Settings form gap remains zero executed. Reused matching-lock dependencies are not a clean-install receipt. Wrong-working-directory lint setup attempts are preserved separately from corrected passing runs.

`O204-VERIFICATION.json` records exact source/policy hashes, commands, receipt hashes and limitations. Raw receipts remain in `/dev/shm/a1-o204/`. Full compiler/build/browser/provider/native/image qualification was not duplicated; Fable owns the composed production run. Historical run `capiro-portfolio-preview-build:3961445f` remains failed with its later gates unrun.

## Requested review

Dot: review the exact published source delta and the four new fingerprints individually. Registry application for the original accepted entries is complete. This is not a ship request. Corrected backend-live prerequisites, A2 HOLD and acceptance STOP2/6 remain. No merges/deployments, live SQL or extra model/acceptance turns occurred.
