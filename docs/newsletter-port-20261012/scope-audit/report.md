# Rich newsletter frontend scope audit

The frozen frontend **does not yet consume the restored rich-newsletter contract**. It has a working, separate generic Workspace newsletter builder and saved-version OutreachV3 staging flow. Its nine newsletter modules are not equivalent to the original rich campaign model, revisioned document API, editor, review/asset controls or rich Outreach destination. The first bounded preservation slice can be the **179 byte-exact public assets**, without waiting for a package artifact. Rich UI implementation then needs coordinated consumption of the backend's existing two public newsletter exports.

This is a read-only source audit. It neither ports code nor qualifies live rich-newsletter behavior. No browser, build, typecheck, package/install, native route, provider/model, database, deployment or subagent execution occurred. PR15 and prior final-gate evidence were not edited.

## Exact sources and inventory

| Input | Pin |
| --- | --- |
| Dedicated frontend | `adbc84b2251fe6b06cb7f75030026fba5b4ff498`; root tree `6c68390b07a62f22d017fdfe690fc8001a55123d`; app tree `d7c5735280ee9af18c57059425ccef169db390c2` |
| Backend reviewed handoff | [PR2424](https://github.com/neo-capiro/capirov2/pull/2424), exact head `5470c6df029c9553dd49e531229c3c91b26275ef`; source-neutral publication of frozen application `a247f7a02a9b94d95e9ee5a516b396202aea994b`, tree `b87c85a0fc0ae57f876b86a8018a953adbddb71c` |
| Original production C | `1e99f0921b207318c6d2abf03927b5c4daa5768b` |
| Original W | `193703e34f2bedbb69d87d6a8ee303f65ab8dbda` |

The audit independently compares every original family path and C Git blob against all **9,191 tracked files** in adbc. All **262** paths and original blobs are absent, including renamed locations: **43 runtime TS/TSX, 179 static assets, 37 tests, two CSS files and one generator**. This establishes exact source absence; the behavioral distinctions below establish where the new implementation is only a partial substitute.

All 43 C runtime source files were fetched at the immutable C ref and their bytes independently rehashed to their expected Git blobs. W directory/source reads independently confirm the same 43 runtime blobs. C and W asset directory reads independently confirm all 179 asset blobs and byte sizes against the published preservation manifest. The asset SHA256 values come from that pinned backend manifest; this audit downloaded only the two asset license/attribution text files, not all binary assets. Both editor-test histories are retained: C `902bbe86edd13a659b8cb231fd27425e1b36b33d`, W `a315b682643e13eb12fd9a384f87c8d16b3f0cc4`. The published 261/262 whole-family identity claim remains precise: the editor test differs in its Survey-button query.

`git cat-file -t` confirms C, W, 5470 and a247 objects are absent from both mounted `/workspace/capirov2` and `/workspace/capiro-remaining` object databases. Exact authorized GitHub source reads supplied the audit; no fetch or checkout was performed. See [local object receipts](evidence/local-object-availability.json), [full path map](path-map.json), [independent adbc comparison](evidence/adbc-inventory-comparison.json), and [source byte pins](source-pins.json).

## Current owners and real missing behavior

The canonical route is `/modules/[module]` → `WorkspaceScreen` → `NewsletterWorkflow`, with the newsletter entry at `WorkspaceScreen.tsx:113`. All paths below are relative to `apps/web/src` unless explicitly qualified. [The nine-module mapping](current-owner-map.json) includes their exact adbc Git blobs.

| Current owner | What exists | Rich contract still missing |
| --- | --- | --- |
| `features/modules/workspace/newsletter/NewsletterWorkflow.tsx`, `use-newsletter.ts` | Generic draft create, document update, metadata update and saved snapshot; subject/preview, client, local Undo/Redo and explicit saved-version staging. | `WsNewsletterDocument` list/create/load/save with revision CAS, canonical config/design, saved rich preview, stage receipt and dedicated rich destination. `use-newsletter.ts:40` and `:103` use generic draft operations, not rich document routes. |
| `NewsletterPaper.tsx`, `newsletter-model.ts` | Nine simple block kinds with text and optional URL, move/remove, safe links and image URL display. Code is displayed as text at `NewsletterPaper.tsx:41`. | Original 16-kind persisted design, nested columns/sections, typography/design/visibility/mobile settings, rich HTML/link review and canonical renderer. Current schema at `shared/capiro/operations/workspace-documents.ts:9` cannot represent this design. |
| `NewsletterTemplates.tsx` | Three local presets, local search/category/preview. | Persisted rich templates/sections, branding and source-client restrictions, folder/rename/delete and saved template publication. The current unavailable publication action (`NewsletterWorkflow.tsx:309`) is truthful for its current generic contract; do not simply enable it against a different document type. |
| `NewsletterComments.tsx` | Generic Workspace document comments. | Campaign/block/thread review, reviewer roles, invitations, account-request state and thread notification preferences. |
| `NewsletterStaging.tsx`, `staging-model.ts`, `useNewsletterStaging.ts` | Exact saved revision/hash, explicit existing V3 session, sponsor checks, acknowledgement, retained request and receipt/recovery controls. | These are intentionally independent; they should not be widened into a rich-stage adapter. |
| `features/modules/engagement/OutreachView.tsx`, `CampaignSession.tsx` | Generic legacy Outreach list/plaintext edit plus OutreachV3 session view. Sending from the generic edit form remains unavailable. | Rich stage-open, rich record review, recipient preparation, immutable rich draft versions, deliberate test/send intent, delivery status/cancellation and replay recovery. `EngagementScreen.tsx:33` consumes `draft`/`session`, not original `newsletterStage`/`newsletter`. |

An integration requirement extends beyond the 43-file name family: original `OutreachView.tsx:433` dispatches the two newsletter query parameters, and `:1006` uses `metadata.newsletterStageId` to reopen an existing rich record. The current `shared/capiro/operations/engagement.ts:114` record schema strips that metadata and the current form treats records as plain text. The port must preserve a contract-supported rich-record distinction before routing restored rich records through that form. This is a confirmed missing presentation/discrimination seam, **not evidence that a live record was modified or lost**.

Original `WorkspaceVNextRoutes.tsx:73` and `:272` owns `/workspace/newsletters/new`, `/workspace/newsletters/:id` and `/workspace/newsletters/:id/review`. adbc has no equivalent Next entries for those URLs. Preserve inbound links with thin same-contract entry routes, composed into current Modules owners. Do not restore the old Vite/React Router root, old authentication bridge or whole Engagement application.

## All 43 original runtime responsibilities

Every exact original path, C/W blob, current absence, source size and proposed canonical owner is in [path-map.json](path-map.json). The groups cover all 43 without overlap.

| Group | Count | Required port or preservation scope |
| --- | ---: | --- |
| Authoring and transport | 7 | Creation, editor, template chooser, API client, controls, model and reviewed links. Adapt to current fixed operations, shared session boundary, Next routing and adopted primitives. |
| Brand and fonts | 3 | Brand kit, font picker and brand context through canonical shared exports; retain logos, uploaded fonts, buttons and source design semantics. |
| Asset library | 4 | Content Studio, details, folders and revisions; these are Newsletter assets, not Portfolio Files or generic attachments. |
| Image editing | 11 | Crop/focus/rotation/scale/text, captured target, cancellation, replacement and immutable revisions; advanced editor has a separate external-origin/message boundary. |
| Review and collaboration | 3 | Review page, comments and thread notifications, including author/reviewer/account-request controls. |
| Social | 2 | Follow/share modes, safe share targets, icon styles and responsive layout. Recipient capability URLs must never leak into social sharing. |
| Content tools | 7 | Apps/link previews, local/manual alt/link/video controls and capability-bound stock/image/alt AI/check flows. Backend remains the provider owner. |
| Survey preservation | 5 | Preserve original source/history and existing representation/removal behavior. Do not enable new hosted surveys. |
| Rich Outreach | 1 | Rich stage/record lifecycle, recipients, immutable prepared versions and explicit delivery intents; adapt adjacent recipient/source/status owners rather than restoring the old Outreach monolith. |

The family is **not a complete dependency closure**. Original `NewsletterOutreach.tsx:9` imports recipient selection/targets/collision/sender types outside it; original creation/editor imports old scope/API/router foundations. These require deliberate adapters to current canonical owners. The existing Relationships rich-mail editor is a separate domain and is not evidence of rich newsletter parity.

The original editor alone is **3,296 nonblank lines / 135,143 bytes**; its CSS is 2,837 nonblank lines. Copying it wholesale would cross the repository's mandatory semantic/size review signals. Preserve the original as immutable reference while assigning cohesive draft/revision, canvas, selected-block editing, assets, review and stage responsibilities. Exact size/fingerprint review belongs to each resulting source change; splitting solely to meet line counts is not acceptance.

## Identity and route boundaries

| Identity | Trusted owner and use | Must not be substituted for |
| --- | --- | --- |
| Rich document UUID + integer revision | Workspace `WsNewsletterDocument`; PATCH `/workspace-api/newsletters/documents/:id` uses the observed revision. | Generic Workspace draft/document/version IDs. |
| Rich stage UUID | POST `/workspace-api/newsletters/documents/:id/stage {revision}` returns `NewsletterStage`; original target `/engagement/outreach?newsletterStage=…`; POST `/api/engagement/newsletters/stages/:id/open` opens/reuses legacy Outreach. | `WsDocVersion`, snapshot hash or V3 session ID. |
| Legacy rich Outreach record UUID | GET `/api/engagement/newsletters/:id`, prepare, test/send, and original `?newsletter=…` reopen. | V3 session ID. |
| Prepared `OutreachDraftVersion` UUIDs | Trusted rich prepare response; send/test uses `{requestKey,senderConnectionId,versionIds}` and audited immutable versions. | Workspace saved-version IDs, stage IDs or browser-authored HTML. |
| Generic `WsDocVersion` UUID + snapshot hash | Existing saved-version read and strict V3 `{requestId,draftId,versionId,snapshotHash,expectedStateVersion}` body. | Any rich-stage identity; no UUID conversion, association table or alias. |
| Recipient/asset capability token | Exact backend public capability paths and validation; authoring remains private. | User/tenant authorization or a broad public authoring route. |

The existing saved-version operation source remains `shared/capiro/operations/workspace-newsletter-staging.ts:68`. Rich source contracts are pinned in `original-api.ts:16`, `newsletter.controller.ts:185`, `newsletter-outreach.controller.ts:54` and `original-NewsletterOutreach.tsx:148`. Current and rich fields must not be mixed into a single permissive schema.

Backend `NewsletterPublicController` already renders archive, unsubscribe/preferences and survey confirmation HTML (`newsletter-outreach.controller.ts:91`). These do not require a new React public-page owner. Uploaded asset bytes/fonts are already backend-served under `/workspace-api/newsletters/assets/file/:token` (`newsletter.controller.ts:497`). Keep their exact public capability routing and headers; frontend work does not authorize changing infrastructure or bypassing application authentication.

## Static assets: bounded first slice

[asset-extraction-manifest.json](asset-extraction-manifest.json) gives **179 exact source/target paths, C/W blobs, SHA256, byte counts and GitHub blob/content URLs**. [asset-paths.txt](asset-paths.txt) is the minimal extraction allowlist. Total payload is **486,014 bytes**: 172 PNGs, five SVGs and two license/attribution files. Preserve each under its original `apps/web/public/newsletter/` path without re-encoding or regenerating it.

The source matrix is complete: 21 union follow/share platforms × eight styles = **168 social PNGs**, plus four fixed sample PNGs. [asset-url-coverage.json](asset-url-coverage.json) independently compares that allowed matrix with the inventory and finds no missing source assets. It retains the nine AST URL sites from the published source receipt and the additional template-preview SVG reference.

Concrete sites are shared `newsletter.ts:979`, `:1012`, `:1020`, `:1042`; renderer legacy SVG-to-PNG normalization at `newsletter-render.ts:167`, public-origin expansion at `:268`/`:287`, and social URL construction at `:380`. `NewsletterTemplateChooser.tsx:97` uses `/newsletter/template-preview.svg`. Preserve Font Awesome Free 7.3.1 attribution, CC-BY-4.0 terms and Capiro modification attribution. The generator is source provenance, not required to reproduce the existing bytes; do not regenerate as part of the byte-preservation slice.

Because the original objects are absent locally, the implementation owner should obtain each blob at the exact C ref through authorized GitHub blob/contents access (base64 bytes), or an owner-supplied archive/object set pinned to C. Validate the Git blob, SHA256, length and allowlisted path before writing the new isolated worktree. Do not silently fall back to the mounted older capirov2 HEAD. Binary downloads were not performed by this audit. No package install is required to preserve these static bytes.

Source byte preservation does **not** prove current frontend/CDN origin availability, emailed image resolution, deployment packaging, MIME/cache headers or retained old-origin URLs. Those require later explicitly scoped serving/release checks. No deployed origin was contacted here.

## Existing public package boundary and required acceptance

The backend already defines **`@capiro/shared` version `0.0.0`, `private:true`**, with deliberate exports `./newsletter` and `./newsletter-render` and their matching `typesVersions`. Both resolve to `dist` JS/declarations. `packages/shared/tsconfig.json` builds CommonJS targeting ES2022 with DOM types and includes the whole shared source tree. The large root barrel contains no newsletter re-export and is not a required browser import.

The two subpaths close over exactly five source modules: `newsletter.ts`, `newsletter-render.ts`, `newsletter-fonts.ts`, `newsletter-fonts.catalog.ts`, `newsletter-social-share.ts`. Font and social helpers are already exposed through the two existing subpaths. Inspection found no external runtime import, Node API, ambient credential requirement or network/client construction in this closure; the URL and font helpers are pure source computations. This is **source-level browser suitability**, not packed-consumer qualification.

No consumable newsletter tarball, packed-entry digest, output/provenance manifest or frontend packed-consumer receipt was identified in the exact handoff, plan receipts, PR2424's 280 changed paths or the dedicated frontend's vendor inputs. This is not a claim that no artifact exists anywhere in a private registry. The available artifact mechanism is the frontend's `vendor/README.md`, `vendor/meri-public-packages.json`, `scripts/public-packages.mjs` and its tests; current accepted artifacts cover Meri only.

The backend/public-package owner should supply or identify a governed immutable distribution of the **existing 0.0.0 exports**, bound to the frozen producing source and compiler/build inputs, with JS/declaration relative closure, entry allowlist and hash/size provenance. No new version or package namespace is proposed by this audit. The frontend owner then verifies actual packed-consumer imports, browser-safe runtime boundaries, render/type behavior and failure controls before recording dependency/lock/vendor changes. Preserve canonical DTO/render ownership and existing license/source attribution; do not import a backend checkout, hand-maintain another rich design DTO, re-export the whole old shared barrel, or silently substitute the generic `NewsletterBody` model. [package-boundary.json](package-boundary.json) records the inspected seam.

## Meaningful tests and functional limits

[meaningful-test-map.json](meaningful-test-map.json) records all 37 original test paths in the family inventory, selected source-read cases and the protected current suite. Original source cases include freshly saved revision staging, revision/link save retry, nested-parent move refusal, executable paste removal, stale upload/video/crop target refusal, late manual alt edit preservation, library/revision Insert semantics, reviewed immutable version IDs, held send refusal, ambiguous test-request key reuse and failed-status/read separation. Review-role tests permit edit navigation only to owner/editor. These are characterization requirements to port, not tests executed here.

The current saved-version suite has **16 unit cases** (four literals and two six-case tables) and **nine browser cases**. The existing parent adbc Modules log directly records all nine browser cases passing at lines 81–89; the completed Modules run is synthetic. Preserve exact revision/hash/session binding, lost-response recovery, no dispatch on storage/current-source/actor refusal, malformed receipt retention, fresh state acknowledgement and mobile keyboard controls. Also preserve `prospect-workspace.spec.ts:168` immutable prospect-origin no-sending behavior. None establishes native rich newsletter acceptance.

Do not turn preserved dormant data into new feature promises. Original `NewsletterEditor.tsx:1296` omits new survey/product/product-rec palette entries; its hosted survey message at `:1425` requires removal before staging. Backend `newsletter.service.ts:527` enforces that refusal. `capabilities()` at `:2027` gates AI/image/alt/HTML checks, always reports inbox screenshots unavailable and sends the user to Engagement for delivery. Preserve those truths. Group/list expansion UI tests do not override the backend handoff's current nonempty-group refusal; no broad group repair belongs to this port.

Review GET may activate a persisted invitation/grant and notify; account-status GET may read a provider or persist a receipt. Neither is an inert native probe. New tests must intercept/fake all such operations, uploads, sends, external editors/providers and worker effects. Later qualification must cover authorization/session/client replacement, current-read failures, revision conflicts, pending/uncertain writes and delayed responses, rich preview sanitization, exact prepared versions, unknown-no-repost behavior, back/forward entry restoration and desktop/mobile accessibility. This audit requested no Figma backup or new design capture and claims no new visual parity.

## Bounded successor plan and blockers

1. **Assets only:** create a new isolated branch/worktree stacked on adbc, preserve exactly the 179 public asset files with provenance and byte checks. Keep PR15, old worktrees, original evidence and generic saved-version source frozen. This slice is independent of the package artifact and is not full rich recovery.
2. **Public distribution:** coordinate the existing two subpath artifact with the backend owner and root-owned vendor/lock/consumer checks. The missing reviewable artifact/consumer acceptance is the prerequisite for rich model/render consumption, not for static preservation.
3. **Rich authoring vertical slice:** put revisioned campaign/library/editor interaction in a cohesive Modules Workspace owner, alongside the existing generic newsletter flow. Root coordinates fixed `shared/capiro/operations` entries, response validation against canonical exports, session lifetime and thin inbound routes. First qualify create/load/save/conflict/preview and original source-client/brand constraints; expose staging only with its truthful rich destination. Avoid a half-working stage button or routing it into V3.
4. **Rich destination and remaining controls:** Modules Engagement owns stage-open/record discrimination, prepared rich versions, exact test/send intents and status recovery. Port assets/reviews/advanced content tools as bounded cohesive slices with their original positive and refusal controls. Keep recipient capability HTML/backend provider logic canonical. No new backend endpoint, sender or authorization owner is needed.

The unresolved boundaries are package distribution/consumer qualification, the actual rich UI and inbound-route port, external/static origin serving, and backend full/native acceptance (including the handoff's exact `htmlparser2@8.0.2` cache/type gap and unapplied/native migration/runtime gates). These are distinct from the current PR15 qualification, which remains root-owned and incomplete; the latest parent update reports one current-projection presentation assertion failure. No final PR15 pass is claimed here.

All audit outputs are local under `/tmp/capiro-newsletter-port-scope-20261012`, not committed or published. The separate `/tmp/capiro-remaining-final-gate-review` packets remain preserved.
