# Meri document canvas

Meri-generated Word and text documents open beside their chat. The canvas uses the existing pinned Tiptap 3.31.4 packages and Capiro's UI primitives, Geist typography, theme variables and 10px controls. Office editing remains available for imported documents and formats the canvas cannot preserve. Presentations and spreadsheets retain their existing workflows.

## Ownership and data flow

- `features/meri/canvas` owns the editor, local draft and split view. It uses canonical typed Word content, not an HTML-to-DOCX converter. Supported paragraphs, marks, quotes and plain-cell tables round-trip through the existing document contract. Unsupported blocks/attributes make the source read-only; unchanged blocks retain their exact original data.
- `shared/meri-documents/canvas-access.ts` consumes the public `document-canvas` receiver over the existing bounded session transport. The conversation port lends its credential and abort lifetime. Tenant, actor, conversation and General/client receipt checks prevent adoption of mismatched results; Meri/Core remain authoritative.
- The Meri runtime owns editable-source reads and immutable revisions, including current access, retention, byte verification, head conflicts and retained evidence/assets. No new database, agent loop or conversion service is introduced.
- The canvas saves before selecting `documentRevision` for Ask Meri. The existing composer, attachments, send journal and SDK revision path retain their owners. Clicking Ask Meri selects the saved version and focuses the composer; it does not automatically send a message.
- QueryClient retains drafts only in memory under the canonical identity/client boundary. Revoked conversation access clears cached canvas content. An uncertain save fences further writes across credential and run replacement; closing the canvas retains the draft.
- Check save only reads the retained parent and current head. It clears uncertainty when the head is the parent's direct child and its canonical content matches the captured save attempt, even if the local draft was later discarded. A different or unchanged head remains unconfirmed; checking never resends the write.

## Updates and limits

The canvas observes published `artifact.available` versions. A new version never replaces a dirty draft; the user can save/discard before opening it. This is publication-driven updating, not token-level document streaming. Existing wire events do not carry partial document content. Native Office imports, images/charts and unsupported formatting stay on the existing Office/download path.

The new `canvas-save` route is a derived edit to an admitted document, available through the configured conversation/document connection like preview publication. It does not enable the unrelated create/revise workflow family. The runtime rechecks current write authority and source ownership; browser flags and version IDs grant none.

## Verification

Author checks target real ProseMirror schema round-trips, draft replacement/unknown-save behavior, public producer/receiver correlation, same-origin proxy and runtime current-access/retained-provenance boundaries. Final counts and exact commands are recorded in the task handoff. Windows checks are supplementary; Linux/container, authenticated preview and visual acceptance remain with the existing release/QA owners. No preview deployment is made by this implementation task.

Author results: 130 focused frontend tests, 136 transport tests, 31 architecture scanner tests, 17 runtime/source/routing tests and 5 public canvas contract tests pass. Frontend typechecking, touched-file lint, package intake validation and the canvas generator check pass. The aggregate architecture check still has inherited blockers; same-environment base/current source comparison found no new boundary errors. Existing aggregate contract typing and Windows generator metadata failures remain recorded rather than waived.

Six exact function fingerprints have author implementation design records. Formal independent review remains pending. Canvas presentation, credential transport, draft state and runtime authority remain separate; no Meri-to-Workspace private import is introduced. Integration must retain current-main architecture metadata, including later Directory records, instead of replacing it with this branch's older snapshot.
