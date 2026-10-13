# Meri Files presentation handoff

Feature source is ready for root integration/typechecking, rendered controls and independent review. No commit has been made. Worktree baseline is `83f54f5ac0107822833adbbfef2b453e0240bc56`; application/shared integration is concurrently root-owned. This packet binds only the 11 new presentation files, four focused test files and the requested UI outline.

## Implementation and ownership

`features/meri/files/MeriFilesWorkflow.tsx` exports `MeriFilesWorkflow({port,lifetimeKey,contextLabel,operation})`. Operation is the host-supplied `create_word | create_excel`; the feature never offers a cross-family switch. A null port exposes unavailable service copy without issuing any operation. Identity, operation or port replacement remounts/disposes local interaction; a layout-effect cleanup revokes owned browser URLs before the replaced view paints.

Word uses a title, DOCX/TXT selector and full text. DOCX makes each supplied line a Normal paragraph, retaining blank lines; TXT preserves whitespace exactly. The initial editor supports text documents, not an Office editor, tables/images/chart authoring or imported files. Excel uses a separate titled typed-JSON sheet/cell editor with an admitted example and help for `value`, `formula` (leading `=`) and `numberFormat`. Literal strings are not converted to formulas. JSON syntax guidance is local; the shared adapter admits unknown input through the exact public 0.1.2 request receiver. No duplicated content schema or fabricated delivery ID exists in production presentation.

The observation controller retains the exact shared-port version handle, up to ten receipts returned in this mounted view, selected version and explicit known-ID inspect input. It never lists/discovers files. Revision captures the selected immutable parent and requires fresh full-replacement acknowledgement; editing the draft clears that acknowledgement. Input is retained after completion and frozen while writing. Word text limits reject oversized input through visible guidance rather than silently clipping replacement text.

The version panel shows version/parent/artifact identifiers, filename/format/date, bytes/SHA256, draft generation and pending preview. Structural inspection shows DOCX paragraph/table/picture counts, TXT encoding/whitespace, or XLSX sheet names/formula count/cache status. Office opening/rendering and workbook formula caches remain expressly unverified. No fake preview, file library, search, delete, upload, filing or model work was added.

Only an explicit verified download creates a Blob URL. Starting another read/download, changing selection, a read refusal, replacement or disposal removes/revokes the old URL. A held completion cannot publish after its generation has been canceled or the view disposed; a changed version ID cannot receive the prior bytes. URL ownership is local and the borrowed port is never disposed by the feature. The shared adapter owns byte verification, current access, credentials, scope and uncertainty across navigation.

The UI mirrors the shared journal before/after explicit operations and refuses writes for pending/unresolved attempts. Unexpected write exceptions also retain a conservative local pause. A successful inspect does not reset an unknown write. Known not-dispatched failures allow a deliberate corrected submission; there are no automatic retries or mount effects. Access loss removes prior actionable version state. Root independently owns the same-client availability-refresh retention behavior at the host boundary.

## Verification actually run

- Focused Vitest from `apps/web`, four named files, **maxWorkers=1**: **32/32 passed**, four files passed, exit0. `pure-results-final.json`, `pure-final.log`, `check-exits.json`.
- Scoped ESLint over the new feature and four tests: exit0, no reported warnings/errors (`lint-final.log`).
- Scoped Prettier check: exit0 (`format-check.log`).
- TypeScript source parsing plus canonical `scanModule` on owned feature only: no parse diagnostics. This is **not** a typecheck or full architecture gate.
- Initial 27 pure controls passed before expanded canonical admission coverage. The expanded workbook check exposed the initial example's missing formula `=`. `workbook-example-admission-red.json` is the genuine failing baseline: 4 passed /1 failed with public `INVALID_REQUEST`. The **same complete test-file bytes** pass after correcting the example. The red source snapshot and hash receipt are retained. Earlier fixture-calibration failures (a manually supplied invalid formula and an omitted test import) are retained separately; they are not presented as the meaningful implementation regression.

Coverage is local: explicit-only dispatch, input snapshot/freezing, parent handle and acknowledgement, unknown-write persistence across reads/remount, not-dispatched correction, disposed-view completion, known-ID inspect, selected download metadata, stale/download refusal cleanup, URL lifecycle, Word content fidelity and public admission, Excel literal/formula distinctions and public admission. Shared-port test fixtures are synthetic, not a native receiver/authority proof. Public receiver calls are purely local validation with labelled synthetic envelopes.

Exact command:

```
node ../../node_modules/vitest/vitest.mjs run tests/meri-files-draft.test.ts tests/meri-files-workbook.test.ts tests/meri-files-download.test.ts tests/meri-files-state.test.ts --maxWorkers=1 --reporter=default --reporter=json --outputFile=/tmp/capiro-meri-files-ui-evidence-20261013/pure-results-final.json
```

## Structure and remaining qualification

`STRUCTURE-PROPOSAL.json` contains the exact canonical source scanner output and author responsibility rationale. Three function-size signals need independent/root review: Word form112 lines, immutable version panel146, Excel form111. No owned production file exceeds400 nonblank lines. The controller owns only view observation and local resources; family-specific form/content mapping and structural inspection stay separate. No shared architecture registry was changed.

No install, browser/server, build, full suite, full typecheck, native Clerk/RLS/storage/worker, Office rendering/recalculation or provider/model effects were run by this lane. Root's browser author is preparing actual-host controls. Desktop/phone layout, default axe, sequential keyboard, rendered names, host same-client refresh preservation, cross-mode/history and native deployment remain pending. No Figma target or full visual acceptance is inferred from reuse of current Meri styling. No inherited tests or existing source files were changed by this lane; all new tests live under the normal `tests/**/*.test.ts` discovery path.
