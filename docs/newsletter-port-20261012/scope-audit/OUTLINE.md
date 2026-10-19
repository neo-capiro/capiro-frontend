# Bounded successor implementation outline

This is a proposed scope/ownership handoff. It does not add authorization for native actions or expand PR15. Root has separately started an asset-only sparse worktree at `/workspace/capiro-newsletter-port`, based on exact frontend adbc. No application work was performed in this audit.

## Slice 1 — immutable public assets

Root owns exactly the 179 paths in `asset-paths.txt`, plus cohesive provenance/byte-verification evidence. Resolve bytes from original C, independently verify Git blob + SHA256 + byte length against `asset-extraction-manifest.json`, preserve filenames/URLs and both license/attribution files, and reject missing, extra, mismatched or substituted content. The W identity provides the second original-history check. No generator run, image re-encoding, dependency change, UI restoration or backend mutation belongs in this slice. Static-byte preservation does not establish deployed origin behavior or full rich recovery.

## Slice 2 — existing public export distribution

Backend public-package owner identifies or supplies an immutable governed artifact for existing `@capiro/shared@0.0.0` exports `./newsletter` and `./newsletter-render`, preserving the exact five-source-module closure and current export names. Do not invent another DTO, renderer or version. Bind producing commit, compiler/build input, JS/declaration entries, relative closure, licenses, SHA256 and byte count. Root owns frontend vendor/manifest/lock changes and packed-consumer/architecture acceptance through the established public-package mechanism. Source suitability was inspected; compilation/packing/consumer execution was not performed in this audit.

## Slice 3 — revisioned rich authoring

Modules Workspace owns a cohesive rich-newsletter feature alongside the existing generic Workspace newsletter flow. Root coordinates its thin Next entries, authenticated application/session lifetime, fixed `shared/capiro` operations and shared primitives/styles. Persist canonical campaign config/design through the restored document API and integer revision CAS. Separate draft/revision ownership from canvas/selected-block controls, assets, review and stage interactions based on responsibility, not file-size quotas. Preserve original source-client restrictions, branding, nested design/sanitization and late-result lifetime controls. Do not silently translate rich designs into generic `NewsletterBody` or alter `WsDocVersion` staging.

Prove create/load/save/conflict/preview with inert fixtures first. Preserve unknown/disallowed field behavior and contract-backed validation; authoritative rich types/render behavior remain backend-owned. No stage action is complete until its returned rich stage and destination are handled truthfully. Current successful saved-version/receipt/recovery controls and immutable prospect-origin refusal remain unchanged.

## Slice 4 — rich destination and adjacent lifecycle

Modules Engagement owns rich `newsletterStage`/`newsletter` dispatch and legacy record recognition, current-source/actor checks, recipient preparation, immutable `OutreachDraftVersion` preview, explicit send/test intents and status/cancellation/recovery. Root coordinates fixed operation descriptors, safe inbound routes and the existing generic Outreach list's newsletter metadata distinction. Reuse current directory/session primitives where semantics match; preserve private recipient copies and server refusals. Do not restore old router/auth/Outreach monoliths or route stage UUIDs through OutreachV3.

Backend retains current authorization, draft creation, delivery workers, public recipient HTML and asset-token serving. Review GET and account-status GET are effectful boundaries; intercept them in fixtures. Unknown outcomes do not authorize automatic resend/reinvite. No native send/upload/provider/account action is included.

## Remaining editor facets and acceptance

The `path-map.json` groups assign all 43 original runtime files: authoring 7, brand 3, assets 4, image editing 11, review 3, social 2, content tools 7, survey preservation 5 and rich Outreach 1. Preserve all 37 test histories as refs/maps and port meaningful assertions into the adopted current stack as each behavior is implemented. Keep original hosted-survey/new-product and capability-disabled behavior; do not enable historical/dormant branches by file presence.

For each bounded source change, qualify current-read errors, actor/session/tenant/client/route replacement, pending/conflicted/uncertain saves, stale upload/rewrite/editor results, sandboxed HTML/link/capability isolation, explicit immutable-version acknowledgement and no duplicate effect after lost response. Add focused desktop/mobile keyboard/accessibility and appropriate pinned visual comparison; no new Figma backup is part of this task. Root owns combined gates and exact size/fingerprint reviews. Native backend/parser/migration/deployment and public-origin serving remain separate acceptance items.
