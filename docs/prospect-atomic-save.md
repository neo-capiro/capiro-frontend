# Prospect save and recovery

Manual prospect edits use the Workspace atomic state/save contract. Saving creates content and a version together; the UI binds the receipt to the actor, tenant, prospect, draft, request and exact payload. Ordinary and prospect receipts share the public canonical snapshot encoding and browser SHA-256 adapter.

The existing encrypted retained-intent journal keeps the original request before preflight or dispatch. An uncertain outcome can only recover that exact request; merely reading current content cannot authorize a replacement. A definite stale-state refusal permits comparing current saved content with retained edits, then explicitly saving a new version. Legacy retained edits keep their old key and require current-content review before a new atomic save. No automatic write retry is introduced.

`ProspectSaveRecovery` owns recovery/status/readback presentation; `useProspectDraftSave` owns this single save lifecycle and uses the existing journal/actor owners. The hook remains above the repository size signal because authority hydration, retained request state and acknowledgement updates must stay coordinated. Existing larger editor functions remain visible in architecture output; no size exception or review record was fabricated. No independent review was run, as requested.

Copied briefs continue to use their dedicated editor. Generation, publication and unsupported transfers remain separate requirements. Source checks do not qualify deployment or live provider behavior.
