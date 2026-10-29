# Prospect saved-source generation

Open a prospect document, save its edits, then select the current saved version in History. Choose the saved sections to supply as evidence and enter a writing brief. Generate proposal creates a reviewable proposal without changing the document.

Accept and save draft version saves the reviewed content with source and author provenance. Reject leaves the document unchanged. Publication remains a separate action. Later edits prevent stale acceptance. Load current saved document refreshes the editor only on an explicit action with no unsaved local edits.

The UI uses the shared operation registry, version history, sanitized section preview, actor checks and encrypted retained-intent journal. An interrupted generation or decision can recover the original request after reload. Recent server proposals support recovery without the original browser record. Checking an unresolved generation reads its original native request; Retry original generation retains the same identity. Revoked access removes displayed proposal content.

Requires the Core prospect-generation endpoints and native optional writing-brief transport. Source, output, decision and saved-version hashes are checked before confirming acceptance. Unsupported copied-brief sources remain with their original owner. No Objective, Strategy or Planner workflows are changed.

Validated with focused contract/recovery tests, actual Chrome interaction in the synthetic component harness, affected lint and TypeScript without emitting application output. No deployment or live model execution is represented by these checks.
