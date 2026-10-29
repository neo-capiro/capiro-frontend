# Exact website task selection through conversation recovery

The installed public contracts 0.1.32 and UI stream 0.1.19 pin is supplied by
Frontend323 / Runtime357. The canonical draft, initial-submit and next-turn
journals retain `siteWorkflow` as the published exact site ID, task ID, version
and manifest digest. They freeze that selector, preserve it across reload and
retry, and refuse changed identity under an uncertain request. No manifest,
credential, cookie or browser session is persisted by this change.

Changing or clearing a quick skill preserves a separately selected website task.
The admitted-request receipt shows the website task beside an applied document
revision or skill, and does not claim that website execution has occurred.
The installed public receiver already rejects changed/removed/added website
selectors during history recovery; no additional SDK identity checker was needed.

Responsibilities remain with their current owners: the published receiver admits
wire shapes, Core authorizes current configuration and conversation access, the
runtime checks the exact configuration at execution, and frontend journals own
local nonsecret input/retry state. This change adds no authority or session store.

The existing skill picker and journal file exceed structural review thresholds.
The implementation author's assessment retains these cohesive owners: the new
member follows existing immutable selection behavior, and the picker preserves
one independent choice. This is an author assessment under the current source-only
instruction; it is not an independent review or release qualification.

Verification covers the installed public input receiver, draft recovery and scope
withdrawal, initial/follow-up lost acknowledgements, changed-selector refusal,
stored-history replay, installed conversation-client history checks, and receipt
composition. Mounted Chrome tests use the real picker and draft owner with a
synthetic selection, and verify preservation after applying/clearing a skill and
reloading. Synthetic fixtures cannot authorize or execute a website workflow.

The ordinary-user chooser still needs a browser-facing Core catalog boundary.
Existing `/clio/site-workflows/runtime/list` requires verified service identity;
the Settings list requires an administrator. Neither guard is bypassed here.
The missing boundary is recorded for the Core A3 owner. Site/task/action/retention
choices remain deferred by the user. Host qualification and activation remain
held. No app/image build, deployment, provider/model call or independent review
was performed, and public manifests, lockfiles and vendor pins are unchanged.
