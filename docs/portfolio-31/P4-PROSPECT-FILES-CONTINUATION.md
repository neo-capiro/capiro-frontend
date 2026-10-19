# P4 prospect overview and file-read continuation

## Implementation outline recorded before edits — 2026-10-11

The owner explicitly authorized independent continuation without the unavailable agent-ops repository. Frontend work stays in `capiro-frontend`; this slice does not activate backend candidates, deploy AWS resources or perform provider actions.

### Canonical ownership and boundaries

- `features/prospects` owns prospect presentation and local interaction. The existing Business Development API remains the owner of stage, history, owner, company fields and authorization. Use the exact record returned for the requested prospect; do not substitute another identity or interpret a legacy stage as a new one.
- Restore the current Figma overview's compact company/next-step layout, stage position, separate Activity and Notes, and keyboard-accessible activity filters. Keep the existing saved brief and template access available lower in the overview. Cohesive `ProspectStageProgress` and `ProspectNotes` components compose current feature hooks; they introduce no persistence or route.
- `features/files` remains the canonical client attachment presentation/read boundary. Validate returned client/attachment identities, derive selected actions from the current authorized list and remove stale previews when a file disappears, is restricted or is no longer ready. Backend ACL, scan policy, signed URL creation and mutation authorization remain authoritative.
- Reuse the repository's CSS tokens, Dialog, QueryState, TextareaField, QueryClient and existing public Portfolio member APIs. No new dependencies or shared foundation changes.

### Design reference and deliberate limits

Current high-fidelity context and screenshots were fetched from file `Zc2dEN5aLU47dVdsewDmiJ`: Overview `411:64863`, prospect list `411:44124`, and Prospect Files `411:65071`. Overview stage tracker `411:64925` and Notes `411:65043` are the direct targets. Download and reuse the exact stage marker SVGs and badge dots at their native dimensions. Existing shell assets remain owned by the root integration lane.

The tracker shows pipeline order and the current authoritative stage; it does not claim that every earlier stage was visited, infer a stage-entry date from `updatedAt`, or map legacy values. The Figma statement that closed won automatically bills/converts is superseded by the verified backend's stage-only behavior and the handover's explicit separate conversion/charge requirement.

The 2026-10-11 Prospect Files/Workspace contract review remains blocking for `PROS-019`–`021`: neither a prospect attachment parent nor an authoritative prospect/draft association is published. Full prospect registration/profile fields, a rich second editor, generic tenant drafts, proposal admission/send and reply-aware reminders are not fabricated. The current backend DTO/controller/service were re-read through GitHub in this session; their public basic prospect fields and legacy stage vocabulary match the reviewed boundary.

### State and failure behavior

- Browser state is limited to filtering, open panels and unsaved drafts. Data comes from the existing API.
- Notes remain firm-scoped and are clearly labelled; no private-note ACL is invented.
- Query failures with previously cached records must not leave sensitive metadata or signed URLs displayed. Mismatched identity/parent responses fail validation before rendering. Failed notes retain text.
- Identity changes remain subject to the shared provider's session boundary; this slice does not create an alternative authentication mechanism.

### Verification required

Targeted unit cases for stage grouping, history order and client/record boundaries; targeted browser cases for stage changes, note/activity refresh, legacy preservation, mobile layout, exact SVG geometry, wrong-parent data and stale/revoked file previews. Preserve existing prospect, brief, contact, conversion, template, file and upload coverage. Run applicable TypeScript, lint and architecture checks; root owns integrated build and signed-in acceptance. Report unrun live gates separately.

## Results

### Implemented existing-service frontend slice

| Audit IDs | Changes in this continuation | Remaining acceptance limit |
| --- | --- | --- |
| `PROS-004`, `PROS-011`, `PROS-037` | Current Figma overview spacing/type scale and native marker assets; responsive six-position tracker with explicit current stage. Legacy stages and a missing new-stage catalog remain unmapped. | Full profile fields and new-stage backend activation/mapping remain separate. |
| `PROS-005`, `PROS-010`, `PROS-011`, `PROS-012`, `PROS-013` | Basic detail reads and edit/stage/owner/next-step/archive receipts reject a different prospect ID. | Backend authorization and signed-in mutation acceptance remain required. |
| `PROS-014`, `PROS-015` | Separate Figma Notes card; chronological Activity with exact-kind filters and explicit refresh. One existing note POST invalidates the shared history for both views. Cached note/activity content is hidden after a failed authorization refresh. | Notes remain firm-scoped; private notes and arbitrary email/meeting activity creation have no approved contract. |
| `CORE-052`, `CORE-053`, `CORE-062` | Attachment lists require the requested client parent and unique file IDs. Failed lists no longer leave old metadata displayed. | Real signed-in lists, ACL and version/readiness behavior remain unrun. |
| `CORE-056`, `CORE-057`, `CORE-058`, `CORE-063` | File-access reads and move/access receipts require the exact selected attachment ID. Unavailable member options disable access submission and do not display stale member names. | Server mutation authorization and native retry/concurrency acceptance remain required. |
| `CORE-061`, `CORE-118` | Preview/action selection is resolved from the latest successful list. Removed or inaccessible files lose their open dialog; readiness changes discard old extracted text and signed links. The same behavior applies to public EntityDocuments composition. | This is local response handling; it does not revoke an already-issued URL or replace server ACL/scan enforcement. |

No canonical ledger row was marked accepted. No changes were made to the backend, a provider, AWS, Modules or Meri features.

### Module and design review

`overview.ts` owns prospect-specific display ordering and stage-position derivation, separate from transport schemas. `ProspectStageProgress` renders that display model; `ProspectNotes` owns the existing note-entry interaction; `ProspectHistory` owns read/filter/refresh presentation. Both use the canonical history hook and cache. Existing page containers retain their page-level composition responsibility and remain below 400 nonblank lines; functions above the 80-line review signal are declarative page/card composition rather than mixed transport/authority/business responsibilities. No dependency, public cross-feature API or cycle was introduced.

The broken Figma asset URLs returned 195-byte HTML with HTTP 200. Those files were rejected. A read-only `use_figma` call used the documented Plugin API `exportAsync({format:'SVG'})` for the exact already-inspected nodes, and the exported bytes were saved unchanged. No canvas nodes were changed.

| Exact source node | Local asset | Native size | SHA-256 |
| --- | --- | --- | --- |
| `411:64928` | `public/design/411-64863-stage-earlier.svg` | 14 × 14 | `5e283faeddf044f632bf2b9e98ad2f497ca10cbc3568c71f1d9e0f16314c2f2a` |
| `411:64943` | `public/design/411-64863-stage-current.svg` | 14 × 14 | `20996ffef01263b40aee852c61a59f2b70816a468138d6cec975032f053db795` |
| `411:64949` | `public/design/411-64863-stage-later.svg` | 14 × 14 | `9ac453ec9593b06ff91e1c9c9ded14c8709d27141e7d3548cb42d5bd07187899` |
| `411:64885` | `public/design/411-64863-prospect-dot.svg` | 5 × 5 | `371f1929c6bf0dafcd29dbdbc45ce407f91a0cc656dc7009b3bd812151a8dbfc` |
| `411:64985` | `public/design/411-64863-note-dot.svg` | 5 × 5 | `0d2608de462d08a381d23f649fb1052fe23b43c7cbd5ac21034eb2415f289ad0` |

### Current source evidence

Current default-branch files were re-read through the GitHub connection. Their returned blob SHAs were:

- [Business Development DTO](https://github.com/neo-capiro/capirov2/blob/main/apps/api/src/business-development/business-development.dto.ts): `04dc181cc66f46ed0bf6298525602a47a49b21f4`.
- [Business Development controller](https://github.com/neo-capiro/capirov2/blob/main/apps/api/src/business-development/business-development.controller.ts): `912f8fb85d89feeafdb8b7466c1a8df61b5b75b9`.
- [Business Development service](https://github.com/neo-capiro/capirov2/blob/main/apps/api/src/business-development/business-development.service.ts): `bc4b6ba052bdcfcaa1780a166585e30ab550c701`.

The DTO retains legacy stages and the bounded company/owner/next-action inputs; `history` is an existing prospect-authorized ascending activity query, and `addNote` is the existing firm-scoped note write. No generic draft or client endpoint was used to fake a prospect association.

### Verification

- **PASS:** TypeScript for the Portfolio app after the implementation and added tests.
- **PASS:** 8 targeted unit files / 69 cases, including 9 new stage/history/response-boundary cases and the existing files/upload, brief, contacts, conversion, templates and inactive proposal-contract cases. The 9 new cases were rerun after extracting display behavior into `overview.ts`.
- **PASS:** Portfolio architecture guard (403 modules at that run; concurrent lane work can change the count). Public boundaries, foundation direction and cycles checked.
- **PASS with advisories:** Changed-source/test ESLint had zero errors and three standard Next.js `no-img-element` performance advisories for the exact local Figma SVGs, consistent with the existing static asset convention.
- **PASS:** 42 affected browser cases across `prospect-overview`, `files-boundary`, `prospects`, `prospect-brief`, `prospect-contacts`, `prospect-conversion`, `prospect-proposals` and `files`, including all nine new boundary/overview cases. The only collector issue was a test fixture import that pulled a Next.js component into the Playwright Node process; an explicit server catalog fixture resolved it without an application change.
- **PASS:** Post-review overview rerun after correcting crowded phone stage labels. The tracker becomes vertical below 680px while the desktop layout and exact native 14px marker assets are preserved. Desktop and 390px-wide phone screenshots were opened and compared with the current Figma overview reference; stage labels remain single-line and the page has no horizontal overflow. A test verifies actual text geometry. The isolated component harness uses synthetic responses; these results do not constitute signed-in acceptance.
- **PASS:** Final changed CSS/test formatting and `git diff --check`.

The machine initially lacked Chromium; the root coordinator provisioned the executable and corrected the Fontconfig runtime. Browser checks used `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/158b6018a5d3/browser-runtime/runtime/chromium` and `FONTCONFIG_PATH=/etc/fonts`. The 42-case result and screenshots are in `outputs/evidence/portfolio-p4-prospects-files-20261011/browser-full`; the final responsive screenshot rerun is in `browser-final`. The reference PNG was exported read-only from the exact Figma node at 0.4 scale and reconstructed from bounded export chunks because direct screenshot asset downloads returned HTML. Live signed-in service acceptance remains open.

### Remaining contract blockers

`PROS-006`–`009` still require published prospect field/logo/registration ownership; `PROS-016` needs typed arbitrary activity/provenance; `PROS-017` depends on activation of the existing contact candidate; `PROS-019`–`021` require prospect-file and prospect-draft bindings; `PROS-024`–`026` need native Workspace binding to the exact brief/proposal version; `PROS-027` firm-template management and `PROS-028`–`031` generation/send/stage/reply-aware follow-up remain owner-contract dependencies. `PROS-032` existing-client linking remains available separately, while `PROS-033`–`036` paid conversion, carry-over and entitlement semantics remain unqualified. Existing new-stage activation and legacy mapping remain required for the new-stage controls. Signed-in acceptance remains open for every changed workflow.
