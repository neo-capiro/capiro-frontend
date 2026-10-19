# Status of this directory (recorded 2026-10-18)

Frame, component and prototype maps and design evidence for Capiro 3.4 Meri, made on 16 October 2026 against source `3930e365`. They were received from `docs/figma34-gaps-20261016` @ `8a9c7da1` during the frontend integration ([capiro-frontend#92](https://github.com/neo-capiro/capiro-frontend/pull/92)). Files are kept byte-for-byte as received, because `EVIDENCE-INDEX.json` and `evidence/` hash them.

## Superseded or limited assertions

| Record | Historical assertion | Current state |
|---|---|---|
| `AUDIT.md`, `IMPLEMENTATION-GAPS.md` (C02) | No verified 0.1.8 archive; 0.1.8 consumer preparation deliberately unmaterialized | **Superseded.** The app pins `@capiro/meri-contracts` 0.1.10 (vendored tgz), which deployed preview rev 17 runs |
| `DESIGN-GAPS.md` | D01–D04 pending | **Historical.** `FIGMA-GAPS-COMPLETION.md` resolved D01–D04 as **design presentation only** |
| `FIGMA-GAPS-COMPLETION.md` | D01–D04 complete | Design completion, **not runtime acceptance**. The matching source exists in the integrated branch: D01 first message (first-chat bootstrap, `submitInitial`); D02 refresh recovery (stored-conversation recovery, Recover same turn); D03 partial history ("Part of the saved conversation is shown", Load more); D04 meetings open in the Portfolio meeting workspace (#87), and the shell is Conversations/Files/Runs. None has passed live end-to-end qualification |
| `IMPLEMENTATION-GAPS.md` (other rows), `SCREEN-STATE-MAP.md`, `COMPONENT-STATE-MAP.*`, `CURRENT-INVENTORY.json` | Implementation state on 16 October | Not re-verified row by row. Current status is in [ledger §5](../integration/FRONTEND-INTEGRATION-LEDGER.md#5-wiring-inventory) |
