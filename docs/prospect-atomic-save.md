# Prospect save and recovery

Manual prospect edits use the Workspace atomic state/save contract. Saving creates content and a version together; the UI binds the receipt to the actor, tenant, prospect, draft, request and exact payload. Ordinary and prospect receipts share the public canonical snapshot encoding and browser SHA-256 adapter.

The existing encrypted retained-intent journal keeps the original request before preflight or dispatch. An uncertain outcome can only recover that exact request; merely reading current content cannot authorize a replacement. A definite stale-state refusal permits comparing current saved content with retained edits, then explicitly saving a new version. Legacy retained edits keep their old key and require current-content review before a new atomic save. No automatic write retry is introduced.

`ProspectSaveRecovery` owns recovery/status/readback presentation; `useProspectDraftSave` owns this single save lifecycle and uses the existing journal/actor owners. The hook remains above the repository size signal because authority hydration, retained request state and acknowledgement updates must stay coordinated. Existing larger editor functions remain visible in architecture output; no size exception or review record was fabricated. No independent review was run, as requested.

Copied briefs continue to use their dedicated editor. Generation, publication and unsupported transfers remain separate requirements. Source checks do not qualify deployment or live provider behavior.

## Published proposal templates

The prospect creation form can browse visible templates, select a published version and preview its definition before creating a draft. The chooser uses the existing catalog contracts and public parsers. `BlueprintDefinitionRead` is shared with Template Studio so both surfaces display the same sections, intake questions, evidence rules and theme. Choosing or previewing a template sends no mutation.

Creation retains the exact template pin in the existing encrypted journal before preflight. A lost response recovers the same request and selection; a returned draft with a different pin cannot acknowledge the retained request. The editor shows the retained version, and proposal sections start empty for manual editing. Generation and publication remain separate work.

Validation includes four Chrome cases for read-only preview and exact adoption, reload after a lost receipt, mismatched receipt refusal and unavailable content. Ten prospect contract cases pass, alongside the earlier template/recovery compatibility checks. Full web no-emit compilation, affected lint and diff checks pass. The shared preview extraction reduces duplication; the existing large editor/create-function size signals and four existing preview-route dependency findings remain visible. No build, deployment or independent review was run.
