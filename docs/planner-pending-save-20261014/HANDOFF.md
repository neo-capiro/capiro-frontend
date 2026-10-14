# Planner pending-save and existing acceptance execution

Base: frozen PR42 `ee9d872743f44f927fa924eebd764da8e093888c`. Dedicated branch `repair/capiro-portfolio-modules-acceptance-20261014` preserves that history. PR43 `d542239d13fd1af674c1fecf8130d68f3f6849ed` remains separate. No frozen PR25/42 source, image, configuration or deployment changed.

## Concrete fix

A held local Planner create request reproduced editable task fields during Save. TaskEditor now fences Escape/Close while a write is pending; TaskForm synchronously prevents duplicate submission and disables its native fieldset, retaining the submitted values. Rejection restores editing and Cancel. The editor owner token prevents an older form settlement clearing a newer pending guard. Existing useCapiro already aborts disposed component requests and checks their lifetime after fetch and JSON parsing; an early inspection claim of stale success closing a replacement was corrected, not presented as a reproduced bug.

Independent review required physical pointer testing: Radix Selects still opened inside a disabled fieldset. That second failure was reproduced at1440/390. Existing SelectInput.disabled now reaches all six task selectors through existing field models, including conditional Approval. No shared Modal/primitive, transport, SDK, DTO, registry, endpoint, authorization, Commitment UI or Meri behavior changed. Four cohesive canonical presentation files own this fix.

## Verification

Final Modules6/6 and Portfolio15/15 Playwright cases pass. Tests cover required-name zero-write validation; held409, frozen native/Select controls, Escape/Close, retained draft and recovery at1440/390; create then reload/open/edit/versioned update then reload/reopen; existing Planner modes, Engagement notes/tabs and template deep links; Portfolio list/filter/retry/permission/session feedback, intake chooser/focus and full-catalog Customize/filter restoration/mobile save/unavailable order. Intercepted local APIs and synthetic stateful persistence are explicitly fixture evidence. No native service persistence is claimed.

Root npm check passes:2367 web units,451 Capiro registry tests,113 root tests,84 transport,385 newsletter plus8 declaration checks, types/lint/format/architecture/public packages. Production build passes. Independent Codex outreach_review accepted exact source/size fingerprints and final21-browser receipts. All36 standalone route/theme/viewport observations and preview-root checks pass. No Elements graph/package changes were made.

The original red held-write and Select-pointer results are retained. Two test setup failures were corrected: save already closes the task detail after query refresh; Assignee also exists in the toolbar and must be scoped to the dialog. A first aggregate stopped on outdated size-review admission; exact independent reviews restored it. All raw logs use gzip/base64 byte/hash wrappers, preserving terminal whitespace and bytes without Git text normalization.

## Existing ledger and native gates

Only an append-only local_execution_batches entry was added to the existing POST-BATCH-DELTA, referencing existing ENG-tasks_create/update and CORE-001/012/098. The original RECONCILED-337 is byte-identical:0 native accepted,337 open. Native task/client follow-up lineage, actual authenticated backend persistence/roles/scopes/expiry, saved-layout route/config/data binding and selected-Figma full acceptance remain owner gates. Four previously questioned API families exist in backend PR4; this patch creates none. Meri0.1.3 remains pinned;0.1.5 is not adopted.

## Candidate sequence and resources

Keep PR42 frozen for its shipping lane. Review this isolated candidate based on42 after42; review PR43 separately, then qualify their combined candidate before later release. Preserve existing39→40→41→42 history and original predecessor refs. No merge/deploy or live data-changing request occurred.

Disk recovery removed only generated harness outputs from this task and three completed clean predecessor frontend worktrees (outreach-pending, next-functional, directory-objective), whose source/ref and committed evidence remained intact. A first standalone asset copy ran out of space; its log is retained, partial task-owned copies were removed, and the complete runner was retried. Frozen42 generated output remained untouched.
