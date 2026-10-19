# Local Planner Markdown candidate

Parent: `327ac5dd7db22586c6d0b28379fde68c5d3bd7c4` (Duplicate task). Branch: `feat/planner-markdown-toolbar`. This slice is local only; no push, PR or release occurred.

Task descriptions remain opaque Markdown/GFM strings. The backend accepts up to 50,000 characters; this change adds no HTML conversion, migration or normalization. Opening, previewing and saving without an edit preserves the original stored string, including CRLF bytes. Explicit edits use the textarea's native text representation.

The reusable textarea provides Bold, Italic, Heading, List, Checklist, Link and Preview, keyboard toolbar navigation, Ctrl/Command+B/I, selection retention and native Undo/Redo. Oversize commands are refused before mutation. Explicit link insertion validates destinations, escapes Markdown delimiters and stops portal submit propagation into the enclosing task form. Existing canonical task draft, save, version, pending and receipt-disposal owners remain responsible for persistence.

The adopted UI package already owns Streamdown 2.7.0. A narrow public `@capiro/ui/markdown` export supplies static Markdown/GFM rendering, semantic bold, an allowed element list, disabled checklist controls, safe links and text-only images. Raw HTML stays inert; there is no external image fetch or HTML execution. Existing task read-only content and linked Objective task descriptions use the same reader. The TaskDetail accessible summary no longer repeats raw Markdown source. Comments and other document formats are outside this slice.

## Validation

- 22 source-format/selection/limit/link-policy unit controls passed.
- Six focused desktop Markdown browser cases passed: safe preview and byte-exact unchanged save; toolbar/keyboard/native Undo/Redo; link validation, no incidental task writes and limit refusal; linked Objective safe reading; receipt replacement retiring a former link draft; synchronous pending-save fences.
- Five Duplicate and ten desktop-closeout regressions passed against this implementation. The initial combined run stopped at the added Objective test; its fixture client and unsafe-image selector were corrected, then all six Markdown cases reran. Earlier failed discovery/assertion runs are not accepted evidence.
- Desktop accessibility checks and screenshots are included in the preview and existing closeout cases. No mobile acceptance is claimed.
- Shared UI package typecheck and narrow Markdown source/test TypeScript qualification passed. Full frontend TypeScript remains unqualified locally: previous bounded 768/1536 MiB runs exhausted their heaps. No full build or suite was attempted.
- Owned-source ESLint and whitespace checks passed. Architecture passed with zero errors, zero blocking findings, 482 reviewed findings and 19 unchanged inherited findings. Exact independent size reviews are recorded alongside this document and in the canonical review registry.

Local execution used installed Chrome, one worker and bounded Node heaps after checking Windows commit headroom. The focused harness composes actual application/session boundaries, ModuleShell, PlannerScreen, ObjectiveDestinationRoute and TaskDetailRefreshProbe with synthetic API fixtures. The new public UI entry is mapped to this checkout because the existing local dependency junction points to a different worktree. React is deduplicated in the harness. Neither mapping mocks the implementation.

The full local entry remains blocked by stale installed Meri contract exports; inactive full-entry dependency-scan warnings appear in focused logs. Meri packages and exports were not changed. Cloud must install the existing lock and run the repository default harness, full typecheck and relevant integration gates before integration.

## Exact publication scope for one subsequent approval

Preserve this linear lineage, without rebasing onto or modifying a shipping workstream:

1. PR52 base `0b6c7ecf2c3f0f66dee5a0e88cb67528a6cc5fc2`.
2. Published auth tests `4ac87e7554eaab5defde9abd43ee843b54029a53`.
3. Local locator-only correction `1ec306131bbc57699f66593893f95983d815cbd7`.
4. Local Duplicate implementation `327ac5dd7db22586c6d0b28379fde68c5d3bd7c4`.
5. This separate local Markdown commit.

The proposed future publication would push a new review branch containing the three local successor commits (locator correction, Duplicate, Markdown) and create one draft PR against the agreed integration base. Publishing it would not authorize merging, AWS release, production writes, or changing gateway/origin/Dockerfile, auth behavior, Meri, backend operations or package pins/lock. Publication is not performed by this handoff.

Cloud qualification should run the repository's default browser harness for `planner-markdown.spec.ts`, `planner-duplicate.spec.ts`, `desktop-closeout.spec.ts` and the auth readiness controls, then the two Planner unit files, full frontend typecheck and architecture checks. Use installed project scripts and the supported Chromium executable on that host. A review branch may include the already published auth ancestor; do not duplicate or silently drop it.

## Open Objective integration acceptance

The coordinating owner restated two requirements from Neo's Client District Profile Details discussion: Strategies must consider all critical Portfolio government-relationship fields, and Objectives must produce a project plan in Planner. These remain open end-to-end acceptance gaps. Current CRUD/layout and this linked-task Markdown reader do not establish either workflow. Reconcile any detailed mechanics in `Objective-Strategy-Meri-Agent-Instructions-2026-10-14.txt` before adoption; no separate implementation lane is opened by this slice. Source supplied by the owner: https://chatgpt.com/c/6acd0726-f3c0-83e9-bac9-96629296b242?messageId=cd5c1464-7bd6-4127-b961-88f10d71f31c.
