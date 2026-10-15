# Focused responsibility review

Independent reviewer: Codex `/root/non_meri_closure_review`, 2026-10-15. Read-only inspection of changed source, schemas, callers and both new test cohorts found no concrete source blocker. The final exact commit is reviewed again after verification. No blanket size exemption or scanner/policy change is introduced.

## Settings

`ProfileSettings` still owns profile list presentation and the existing reviewed archive/restore actions. Its small local `changeStatus` routine validates the returned ID and requested status before the same success callback. The fixed operation registry, transport validation and application boundary retain contract and authority ownership. `CreateProfile` remains the existing local draft/create-dialog owner; this slice does not add create semantics.

`IntegrationSettings` remains the existing provider connection screen. The outer function owns capability/read state and its fixed connect/sync/disconnect actions. The provider and connection map callbacks compose that same screen; they do not select arbitrary endpoints or own server authorization. Added response checks prevent success or navigation for a different requested connection. Unsupported IMAP disconnect is explicitly disabled. Shared transport and `useSettingsAction` retain request and view-lifetime ownership.

## Planner comments and shared Markdown

`TaskDetail` composes canonical task fields, subtasks, attachments, activity and fixed actions. `useDetail` retains the sole synchronous task-action fence and captured comment draft; only invalid empty input is additionally refused. `TaskDetailSession` remains its existing task/version/access keyed composition. No new persistence, event protocol, task editor or authorization owner is created.

`TaskEventText` is a small presentation-only component: literal saved text by default, explicit opt-in preview for comments, literal non-comment activity. It cannot mutate an event or infer a stored format. It reuses the canonical safe Markdown reader.

`MarkdownTextarea` remains the single formatting/link/preview composition. `useMarkdownTextarea` remains its selection, native Undo and queued-link lifetime owner. This slice generalizes field-specific wording and preserves required/empty behavior without copying the editor or changing Markdown semantics for existing descriptions.

## Test cohorts

The two new browser cohorts exceed the 400-nonblank-line review signal after formatting. The Settings cohort groups the requested Settings mutation acceptance scenarios through shared fixture setup; each case asserts a specific user action, receipt/read-back or refusal/lifetime boundary. The comment cohort groups one composer and its literal/explicit-preview compatibility, native editing and replacement lifecycle. They are cohesive feature acceptance tests, not production implementation modules or parallel runners. Assertions are independent of production algorithms; splitting solely to satisfy a line quota would not change responsibilities.

Exact current source/function fingerprints are recorded through the existing architecture review data. The 19 unchanged inherited findings remain unreviewed, visible and unwaived.
