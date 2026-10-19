# Modules successor repair MS02–MS05

Commit: `21503cf438862be6ea30db7f29c11f5b0db856f5`; tree `7b10b3aec4ccd45e1292a91f2b8865248cbe08c6`.
Branch: `repair/capiro-next-modules-20261012`; worktree `/workspace/capiro-next-modules`.
Base: `fd1176790a6fb31b7ae68587f965a22d4145d8a2` (shipping source untouched).

- **MS02 / MCAL-002, MCAL-003 Modules facets:** Calendar takes its client from shared current verification; picker navigation updates the URL and follows the same verification gate. Current client labels remain visible even if the optional picker list fails. Denied/mismatched selected-client reads never dispatch a Master fallback.
- **MS03 / MCAL-009 Modules facet:** Agenda keeps separate start and due occurrences, source time/zone metadata, stable keys, and duplicate-page collapse. Identical date/time occurrences use one “Start and due date” row. A start inside the current range remains even when its due date is outside.
- **MS04 / MCAL-013 Modules facet:** Meeting failure no longer hides successful agenda feeds. The meeting source says Unavailable and offers retry; partial-source empty states do not claim a complete empty calendar.
- **MS05 / MCAL-009 Modules facet:** `?task=` resolves with existing `planner.task`, independently of current list filters and pagination. Current receipts must match the requested ID and verified client presentation scope (direct client or current project membership). The reused TaskDetail is hidden on failed/replaced reads; history and client/session changes discard prior detail and editor drafts.

Validation: 4/4 intended red failures on exact base; 19/19 new targeted browser controls green; 7/7 existing Calendar/compact visual/Planner-Engagement controls green; 12/12 Calendar unit tests green. Typecheck, focused lint, formatting and diff checks passed. All browser runs used one worker, zero retries, `/usr/bin/chromium`, local synthetic fixtures. Existing `calendar.spec.ts` assertions were preserved; its setup now supplies the client verification receipt required by the corrected picker.

Evidence: `red/results.json`, `red/output` screenshots/traces; `green/results.json`, `green/output` screenshots; `regression/results.json`, `regression/output`, `regression/legacy-screenshots`; `unit.log`, `typecheck.log`, `lint.log`, `format-check.log`. Source SHA-256 values are in `source-hashes.json`.

The architecture scan has zero boundary errors and five changed-file function review signals. Exact fingerprints and cohesive ownership rationale are in `structure-review.json`; root owns registry changes. No changed source file exceeds 400 nonblank lines. Shared adapters, session/Header/config, manifests, registry, and Portfolio private implementations were not edited or imported.

Native limits: these are Modules frontend facets, not whole MCAL-row acceptance or native ACL/RLS/provider proof. Client Agenda/Month/Week remain meetings-only. Generic task drilldown does not add Objective binding, commitment/strategy linkage, forecast availability, or source completeness. MS06+ remain out of scope. No native/provider/AWS/model/payment calls, merge, deploy, or frozen archive edits occurred.

Borrowed dependency symlink: `/workspace/capiro-next-modules/node_modules -> /workspace/capiro-p1-successor/node_modules`; shared install untouched. Owned server PID 619063 was stopped and port 5197 verified free. Source and evidence remain for independent review; the borrowed symlink is deliberately retained for that review.

Remaining gates: independent/root structural review and root combined qualification.
