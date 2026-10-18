# Status of this directory (recorded 2026-10-18)

These are dated lane records from 15–16 October 2026, received from `docs/figma34-gaps-20261016` @ `8a9c7da1` during the frontend integration ([capiro-frontend#92](https://github.com/neo-capiro/capiro-frontend/pull/92)). Files are kept byte-for-byte as received, apart from the dated link added to `LIVE-WIRING-20261016.md`, because evidence manifests in the `*-evidence*` folders hash several of them. Read their assertions as of their own date.

## Superseded assertions

| Record | Historical assertion | Current state |
|---|---|---|
| `LIVE-WIRING-20261016.md` | Claimed `npm run architecture` passed at `2acbd89c` | Corrected in the record itself: architecture **FAIL** at `2acbd89c`, browser run **INCOMPLETE**, production build **UNRUN**. This is not a historical pass. Current checks: [ledger §4](../integration/FRONTEND-INTEGRATION-LEDGER.md#4-checks-quick-only) |
| `INPUT-INTEGRATION-CHECKPOINT-20261016.md`, `INPUT-RUNTIME-QUALIFICATION-20261016.md` | `@capiro/meri-contracts` 0.1.7 adopted | **Superseded.** The app now pins 0.1.10 (`apps/web/package.json` → `vendor/capiro-meri-contracts-0.1.10.tgz`), which deployed preview rev 17 runs |
| `INITIAL-INPUT-RETRY-PIN-CORRECTION-20261016.md`, `INITIAL-INPUT-PREPARATION-CHECKPOINT-20261016.md` | 0.1.8 generation/adoption on hold; backend initial-input source under higher-fence hold; interface-only preparation | **Superseded.** 0.1.8, 0.1.9 and 0.1.10 were later adopted. The initial-input allocate/admit path is implemented (`packages/meri-client` `submitInitial`; contract `conversation-initial-input` 0.1.10). Rev 17 answered allocate 200 and admit 200 on 2026-10-18 (meri-greenfield#121, 03:06 UTC) |
| `UI-QUALIFICATION-REQUEST-20261016.md`, checkpoints | Qualification requested or pending | Historical requests. Live end-to-end acceptance (prompt → response → saved history after reload → follow-up) has **not** been established for any candidate yet |

These records were not re-verified row by row against the integrated source. For what is wired or source-only today, use [ledger §5](../integration/FRONTEND-INTEGRATION-LEDGER.md#5-wiring-inventory).
