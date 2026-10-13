# Independent Portfolio v2 gate evidence review

**PASS within the stated fixture-gate scope.** Existing raw results independently verify 1,122/1,122 passed, no unexpected/skipped/flaky cases, one result per case, retry zero, and process exit zero. The run ended 2026-10-13T03:10:03.144150Z. No application, test, browser, build or native process was run by this reviewer.

The gate binds source `d4be41e60516e576c74afa304b50ed67da15cb93`, root tree `401cadde371b91606e3346243aaca6b6225aafcb`, and `apps/web` tree `6ae2118b797f478f5a63788841a9777d67c8001e`. Before/after source receipts match, `sourceChanged` is false, and Git independently confirms these trees. The current runtime/configuration scopes in the gate wrapper still have an empty diff. A concurrent documentation-only `IMPLEMENTATION.md` edit exists; this review does not claim the entire working tree is clean.

The actual run used three workers, no retries, no shard or test exclusion, a 30-second default budget, and four existing slow cases at 90 seconds: 1,118 results at 30,000 ms and four at 90,000 ms. All 1,118 semantic file/title cases from source `1585438295776604f23a5cb5ab592729f7c468ca` remain; exactly four cases were added. The affected total is **22 including those four additions**: 18 mail-rich-compose, three profile-tools-integration, and one profile-identity-layout. The first and second full runs have identical inventories and spec IDs. See `AFFECTED-CASES.json` and `RECEIPT.json`.

## Previously interrupted case

`portfolio-layout-integration.spec.ts:31`, “actual index saves the complete canonical catalog and restores it after reload,” now passed in 12,101 ms. Its entire source file is byte-identical in frozen 1585438, frozen d4be and the current checkout. The first full run failed with ENOSPC at its desktop screenshot on line 71; the post-screenshot assertions were therefore not covered by that attempt.

The successful rerun has complete desktop and mobile-dark PNGs, with validated chunk CRCs. The unchanged sequential tail sets the mobile viewport and dark mode (75–76), asserts body/card backgrounds (77–84) and no horizontal overflow (85–89), takes the mobile-dark screenshot (90–93), then asserts exactly one write (94) and no unexpected requests (95). Its passed result plus unchanged sequential source and later screenshot establish that the tail completed. Successful traces are intentionally absent with `trace: "retain-on-failure"`; this is not a claim of a successful trace inspection.

## Preserved attempts and boundaries

- First full run remains **FAILED: 1,121 passed / one ENOSPC failure**, exit one, source unchanged. Its raw log/results/exit hashes are retained in this review's references.
- The controlled-selection setup attempt remains **zero executed tests**, exit one: its external harness could not resolve `@playwright/test`. The corrected control reports three passing repetitions and exit zero.
- The parent's bounded visual receipt and all three referenced screenshot hashes match. This review did not make a new visual or Figma judgment.
- This is local fixture qualification using actual Chromium 154.0.8037.57. The original AWS environment used a different pinned browser; this does not claim AWS environment equivalence, deployment success, native row acceptance, complete accessibility or Figma conformance. Modules, production build and actual-server checks are outside this review; they were running/pending at assignment.

No concrete inconsistency or blocker was found in the completed Portfolio v2 evidence. `RECEIPT.json` binds the full raw evidence paths, byte sizes and SHA-256 values. The small packet references original artifacts instead of duplicating them; prior producer evidence remains unchanged.
