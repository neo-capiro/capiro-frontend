# Independent public newsletter receiving-package review

Bounded PASS for the published receiving dependency. No additional source defect was identified in this read-only package/contract review. This closes the earlier absence of public rich receiving parsers; it does not accept a frontend implementation, deployed routes, rich UI, invitation effects, provider delivery or native authority.

## Immutable inputs and verification

- Frontend comparison pin: `7c87678730538958ace9762f824dc3e588bf445b`. Thirteen relevant files were copied using `git show <exact-source>:<path>`, with blob/SHA256 bindings in `FRONTEND-BASELINE.json`. The parent is implementing concurrently in the worktree; those uncommitted edits are not this review's accepted source.
- Backend publication: `9ffab390ef444d7ea0bf4eb0d68224f810245e25`; corrected source: `38fec5c83585850ed75a7d3693b3b90d517e70af`, tree `b5aef300e56fae9b523d7525f1abd0f9c6baec75`.
- Independently downloaded artifact: **532,178 bytes**, SHA256 **`3e435f280fac8fd301eb753e9fc7ead93691cf979fc1641792fedd88e1bfd6d5`**; Git blob `df067ad7e9a96125a33353aad50b8dabbde9e206`. All **187 regular members / 2,318,419 unpacked bytes** match the published path/mode/size/SHA256 manifest. No package code was executed. See `ARTIFACT-VERIFICATION.json` and `PUBLISHED-EVIDENCE-VERIFICATION.json`.
- Downloaded CJS, ESM and browser parser result records agree: **130/130**, including the legitimate historical-test case. The three original-C/packed/browser renderer result files are byte-identical and contain **116** entries. Relevant receipts/results also match the publication SHA256 index. These are independently checked published results, not tests rerun by this reviewer. The browser qualification was a browser-target bundle in an isolated VM, explicitly **not** a browser page execution. The legacy renderer namespace is deliberately projected; the parser corpus uses the complete new namespace.
- Twenty downloaded textual files have verified Git blob identities in `REMOTE-FILE-VERIFICATION.json`. Initial local text transport added a trailing newline to some snapshots; each was restored to the exact returned bytes and blob-verified before this packet was sealed. Public GitHub web access returned 404; authorized GitHub file reads succeeded. No signed download credentials were retained.

## Public boundary and migration scope

Use the existing `@capiro/shared/newsletter` export. The package adds ten parsers and `NEWSLETTER_RECEIVE_LIMITS`; there is no public `@capiro/shared/newsletter-receiving` subpath. Its private runtime closure gains `newsletter-receiving`, for six package modules total. Keep the current public import allowlist rather than admitting private dist/src imports.

`ARTIFACT-DELTA.json` compares the sealed old 697d826 artifact with the new artifact: five receiving files added, no removals, package metadata unchanged, and six existing newsletter-related files changed. Original renderer TypeScript and emitted JavaScript remain exact. The renderer declaration's sole change is equivalent union ordering (`32 | 24 | 40` to `32 | 40 | 24`); do not claim every declaration is byte-identical to the old frontend artifact. The producer's separate 37-declaration equality claim compares its intermediate receiving artifacts, not this older 697d826 artifact.

Canonical draft lifecycle types and `OutreachDraftVersionDto` are now public, reused by `NewsletterOutreachVersion` with `recipientEmail`. Reuse these exported types and parsers; do not copy private Core DTO implementations. Preserve supplied `sendable`, generation/audit/approval states, parent IDs and `sha256:` hashes as server facts. None creates client-side approval.

The current generic response owner must remain intact. Replace only the local reserved metadata/discrimination implementation with the public parsers, preserving optional/null ordinary behavior and existing unrelated-field handling. `parseNewsletterReservedMetadata` projects the two reserved fields. The richer full-record parser must not replace the generic `outreachRecord` schema.

The baseline RichNewsletterEditor is local-only and explicitly leaves save/stage unavailable. A bounded next slice can add fixed operations and request-bound receiving adapters without silently enabling UI actions. Keep saved Workspace `WsDocVersion`/OutreachV3 staging, generic Workspace draft editing and rich `WsNewsletterDocument`/`WsNewsletterStage` flows distinct. No copied UUID, inferred session or revision metadata bridges them.

## Exact first-slice operation contract

Workspace paths below are relative to the configured Workspace service prefix (`/workspace-api` upstream); Core paths are relative to its `/api` prefix. Reuse the existing fixed-operation registry and service configuration; do not duplicate prefixes in routes. The current published [receiving handoff](remote/receiving-HANDOFF.md), [routing contract](remote/routing-contract.md), [combined handoff](remote/HANDOFF.md) and [two-contract delta](remote/BACKEND-CONTRACT-DELTA.md) preserve the established requests. Exact request bounds/CAS behavior were previously reviewed from controllers at 62d057b4 and preserved in frontend `docs/newsletter-port-20261012/evidence/rich-contract-review/CONTRACT-REVIEW.md`; this review did not import or recopy private backend implementation. The older receiving handoff's 37-source/129-case header is historical and superseded by the current publication and correction.

| Method / fixed relative path | Request | Receiving and required binding |
| --- | --- | --- |
| GET `/newsletters/documents` (Workspace) | No body | `parseNewsletterDocumentList`, exact `{items}`. No public expected-client parameter; list visibility is server-owned and is not evidence every campaign belongs to the selected client. Can activate pending invitations. |
| POST `/newsletters/documents` (Workspace) | `{name?: string(max200), templateId?: string(max100)}` | Direct `parseNewsletterCampaign`. No clientId/owner/tenant/request-key fields in this DTO. Do not infer the newly returned ID or selected-client binding before receipt. |
| GET `/newsletters/documents/:id` (Workspace) | No body | Direct campaign with expected requested document ID and applicable known config.clientId. Can activate an invitation for a current eligible editor. |
| PATCH `/newsletters/documents/:id` (Workspace) | Full `{revision: integer>=1, name: string(max200), design: object, config: object}` | Direct campaign. Bind requested document ID, submitted config.clientId when intended, and nominal committed revision `submitted + 1`. A raced/mismatched or malformed success cannot confirm the attempted write; preserve uncertainty and explicit current readback. |
| POST `/newsletters/documents/:id/preview` (Workspace) | `{liveMergeTags?: boolean}` | `parseNewsletterPreview`; renders saved state, not local unsaved edits. No response ID/revision token and no controller recipient input. Bind request generation and saved snapshot lifetime locally; do not label it a receipt proving exact revision. |
| POST `/newsletters/documents/:id/stage` (Workspace) | `{revision: integer>=1}` | `parseNewsletterStageReceipt`, expected document ID and exact submitted revision. New stage ID unknown until receipt. Route is validated but must not be followed automatically. Receipt has no config.clientId. |
| GET `/engagement/newsletters/stages/:id` (Core) | No body | `parseNewsletterOutreachStage`, expected stage ID and independently known document/revision/client bindings. Not the stage-creation envelope. |
| GET `/engagement/newsletters/:recordId` (Core) | No body | `parseNewsletterOutreachRecord`, expected record ID plus applicable known stage/document/revision/client. Resolve existing candidate through this owner; a generic marker alone grants no action. |

Workspace document/client identities accept UUID versions 1–8. Core stage/record/version IDs and reserved stage hints accept versions 1–5. The baseline `richNewsletterId` schema therefore cannot be reused for Workspace document IDs. Public expected bindings compare valid UUIDs case-insensitively while preserving spelling; revision and nullable client bindings compare exactly. An omitted expected property supplies no binding. A selected UI client is not proof of actor, tenant, owner or access to all source clients.

The existing Zod response slot is request-independent and is invoked by both gateway and browser (`contracts.ts`, `gateway.ts`, `http.ts` in the baseline). A narrow Zod transform may adapt the public result to the existing slot; call the public parser again with exact request expectations in the semantic adapter/owner. Avoid a second hand-written receiving DTO, unchecked success cast, fake `{data}` wrapper or a fabricated campaign identity used to validate requests. Backend request validation remains authoritative for design/config normalization.

Do not extend this initial slice into POST stage/open, prepare, html-check, send/test, invitations, account status, asset uploads, generation or recipient actions. Stage/open explicitly creates/reuses a legacy record and is not routing. HTML-check invokes Mailtrap even though its parser is pure. Saved-version staging alone uses requestId/snapshotHash/expectedStateVersion; those are not fields of these rich operations.

## Action lifetime and uncertainty

Baseline `useCapiroQuery` hides superseded read results and aborts replacement requests; `CapiroBoundary` shares canonical session/client lifetime. Preserve these owners. Reset private material on actor/tenant/client replacement and reject late success, denial or malformed results before display/action eligibility. Current read failure must not revive a cached actionable record.

Baseline `useCapiroMutation` prevents overlapping calls and automatic retries, but clears its active request after failure. It does not itself retain a cross-attempt uncertainty fence. Create has no request key. Save CAS can commit and then fail during its response GET. A rich operation owner must retain local edits and block blind repeat creation/save after an ambiguous dispatch; use deliberate current-owner readback and explicit adoption/rebase. A 409 preserves edits for review. Current state does not prove which attempt caused it. Aborting the client does not roll back a committed write.

Bind the submitted draft independently of subsequent typing: either lock fields during an attempt or track draft generation so an older matching receipt cannot close/overwrite later edits. Saved-preview results need their own request generation and invalidation when document/saved revision/scope changes. HTML remains untrusted text and requires the existing browser sanitation boundary.

Document list/detail and review/account GETs are not universal read-only connectivity checks: they may activate invitations/grants or persist status/notifications; some account paths involve providers. Keep them intercepted in fixtures and require the appropriate explicit native intent before future real calls. No such call was made here.

The Core owner now rechecks persisted `outbound_campaign`, current primary client equal to stage, and present reserved revision valid/equal to immutable stage. Missing revision remains legacy-compatible. Clerk stage ownership, tenant, all source-client grants, record client authority and action-time sender/membership checks stay server-owned. Receiving a valid shape or hint cannot replace those checks.

Preserve the historical-test correction exactly: `tests[].versionId` may refer to a formerly prepared version absent from the current `versions` array. Do not reintroduce membership validation. Current sender binding, UUID checks, returned-version record parent and duplicate-ID checks remain. A historical test conveys no approval for current content.

## Limits and disposition

No implementation, test, build, install, browser, service/provider/native call or repository/index mutation was performed by this reviewer. Only public files/artifact bytes and existing frontend source were read; evidence was written in this new directory. Prior packages and packets remain untouched.

Native route availability, current backend revision/schema/grants, invitation effects, concurrency and rich delivery remain open. Existing gateway 2 MB request / 8 MB response limits are stricter than the public parser's generous JSON bounds; this review neither changes them nor claims all possible large producer documents are transferable. Any later limit adjustment needs bounded operation-specific review.

Accept the immutable receiving input for the parent's bounded consumption work. Frontend adapters, UI and future native operations need their own exact-source qualification. No blanket rich-builder or deployment acceptance follows.
