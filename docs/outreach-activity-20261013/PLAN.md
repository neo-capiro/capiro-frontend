# CORE-109: Activity → Outreach source handoff

Base: published `1da8a551b00bba0f98e87954ef0a87566db236e6`. Isolated owner: `repair/capiro-outreach-activity-20261013`.

Responsibilities: Portfolio ActivityFeed owns source-link presentation; Modules OutreachView owns fresh record admission before the existing editor or rich-newsletter destination. Shared routing, session/selected-client boundaries, operation registry and backend DTOs remain with their existing owners. No new endpoint, transport, editor, persistence, send operation or authority is introduced.

Mounted native contract: capirov2 `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`, ClientActivityService.list derives `sourceType=outreach` and sourceId equal to Classic OutreachRecord.id. GET /engagement/outreach/:id uses tenant, current author, nondeleted and noninternal-record predicates and includes the client relation. This identity is distinct from an OutreachDraftArtifact, immutable OutreachDraftVersion or V3 session. The activity read has no version identifier, so this handoff opens the current Classic record only and cannot imply historical-version or send authority.

Implementation: reuse existing Next Link presentation and canonical `/modules/engagement?clientId=…&draft=…`; accept only supplied UUID IDs. Extend existing fresh GET ID check to require the returned client relation to match a requested client scope. Loading, denied/deleted/failed reads and mismatches mount no editor or replacement draft. Existing useCapiroQuery cancels replaced reads and the canonical application/feature keys own session/client replacement.

Verification: capture rendered source-link and destination-client-admission failures on unchanged production. Add focused browser controls for actual Activity navigation, exact record/client GET, missing/foreign/deleted responses, held reads and retry, actor/client/record replacement, no automatic create/update/generate/send. Preserve all original tests, including meeting/file/mail links and rich-newsletter routing. Lightweight Node checks may borrow the receiving worktree dependency graph read-only, with cache disabled; browser execution requires a root runtime lease. No installs/builds/full suites or native/provider calls.

All 337 native rows remain open. Native owner authorization/revocation and deployed service interoperability, historical immutable version workflows and complete selected-design/AT comparison require separate acceptance. Size triggers will be reported by exact changed-function fingerprint for root review, without editing shared review registries.
