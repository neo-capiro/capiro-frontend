# Facility committee snapshot receiving

This source-only slice owns only new `FacilityCommittees.tsx`, `facility-committee-contracts.ts`, dedicated tests and this document. The root owner composes it for at most three deduplicated federal representatives; no Government/Facility detail, existing profile contract/query, CSS, shared Directory, API descriptor or registry file is edited here.

The existing public shared Directory schemas describe catalog/contact responses, not the member identity/snapshot/membership result needed here. The private Relationships member-detail projection also omits those fields. The local receiving projection therefore validates only the existing Directory detail fields this view consumes, without importing another feature's private code or inventing a new wire contract.

The exact backend source is `cd3c51e940f14e1b2a1040b0ffa445e85d68b332`, `apps/api/src/directory/{directory-detail.types.ts,directory-indexes.ts,directory.service.ts}`. The separately confirmed1b9 source has the same relevant blobs. The compatibility addendum SHA256 is `fece654d89db30dcf749d575abddb954e306290d03bc1649e274228c7e2e79df`.

Only an explicit load requests `GET core directory/members/<FederalMemberSummary.bioguideId>`. There is no numeric/name guess, whole-directory search, committee detail cascade or write. The source-proven official Bioguide namespace is validated on request and response; response identity is checked case-insensitively, source/identity numeric member IDs agree with the returned canonical member ID, and every membership matches that returned member ID/source ID with member membership/person type. Foreign associations fail the receiving schema rather than silently appearing as empty data.

The query key includes existing ProfileActor identity/role, client ID and normalized Bioguide. Actor assertions and abort checks run before/after the read; actor/client/member/enable replacements reset the on-demand local lifetime. Automatic retry, focus and reconnect reads are disabled. One manual reload/retry uses the same scoped reader. Backend authorization stays authoritative.

Only `endedAt === null` rows appear as current associations, reusing the Directory owner's criterion. Position, status, dates, sourceUpdatedAt, source snapshot ID/lastUpdatedAt, committee identity, party and rank remain available. Empty results expressly do not prove no memberships. Directory can cache for 30 minutes and serve stale data; no synchronized representation revision, checkedAt, freshness lease or exhaustive coverage is claimed. Snapshot failures do not replace already loaded representation/facility evidence.

`/modules/engagement?clientId=<UUID>` is an existing valid selector: `EngagementScreen` reads it and uses it for its current datasets; absent `view` opens Overview. This slice makes no Engagement caller changes.

Schema/render tests are authored separately. No compiler, browser, install, native/live Directory call or deployment is part of this source slice; Qualification owns subsequent rendered/browser/build execution.
