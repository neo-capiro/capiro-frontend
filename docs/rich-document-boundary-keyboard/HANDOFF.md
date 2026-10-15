# Rich document document-end keyboard correction

Base: `ee5f04469c1fbf0e14842785e345ab5964770086` (Objective/Planner receiving preserved).

Ctrl/Meta+End now resolves the editor selection with ProseMirror `Selection.atEnd` before subsequent toolbar insertion. The handler applies only while editable, changes no document steps, and adds no history boundary. Ordinary End and Shift+Mod+End retain existing handlers. Intentional selected-range table insertion still replaces that range. A trailing atom may have a valid node selection rather than a text caret.

Only production owner changed: `apps/web/src/features/modules/workspace/rich-document/extensions.ts`. Two new focused tests cover keyboard integration, direct DOM-keymap regression, intentional replacement/Undo, Preview/save/reload and nested-list trailing paragraphs; transaction tests cover text/empty/table/horizontal-rule endings, read-only and capability checks. The original `prospect-rich-workspace.spec.ts`, including its failing Preview assertion, is byte unchanged.

No new dependencies, package/lock/schema/protocol/gateway/origin/Docker changes. No Objective/Planner receiving changes. No AWS launch, deployment or default-branch mutation.

## Qualification and source lines

Local Windows Node24.21/Chromium153 evidence is candidate evidence, not Linux149 qualification. The original full Modules and matched22 Linux failures remain failed. The direct untrusted DOM keymap control fails on baseline and passes on candidate; it intentionally excludes native caret movement and complements the real-keyboard test. Canonical native Windows baseline also passes and is not represented as red-to-green.

The production editor source and original browser spec are identical on original4c and finalee5f. An application-only patch passes `git apply --check` on4c without mutation. Publish one ee5f-based candidate; Shipping chooses final-source qualification or a separately pinned4c backport. Do not mutate consumed4c/ee5f packets or replace their evidence. A4c backport must carry only this application patch, never import/drop unrelated Objective/Planner changes.

Local evidence is retained outside the repository under task-3/audit-evidence/document-boundary-keyboard-validation. Exact final checks and publication pins are recorded in the source handoff there.

## Local final checks

- 13 focused browser cases passed: all9 unchanged original rich-workspace cases plus4 new keyboard/selection cases. Existing phone-width case was preserved; this is not a mobile closeout claim.
- 26 focused unit tests passed, including7 new selection/command cases.
- Canonical Next type generation and full `apps/web/tsconfig.json` semantic TypeScript5.9.3 check passed (`--noEmit --incremental false --noErrorTruncation`, Node24.21, heap6144MiB). Initial test-only strict diagnostics were corrected; no compiler filtering.
- Targeted ESLint, Prettier and repository architecture checks passed.
- Source dependency and lock inputs unchanged. Linux149 browser/image/runtime qualification remains required.
