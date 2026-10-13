# Shared frontend integration contract — proposed v0.1

**Status: proposed, pending reconciliation with Meri and Modules/Settings.**
Prepared for the user's 12 October 2026 UTC coordination follow-up. The proposed
common-shell/integration owner is the Portfolio integration session; that role
has not been assigned by this document. It grants no permission to merge,
deploy, discard, overwrite, start a credential flow or change AWS resources.
Current product ownership and release holds remain effective. Coordination uses
the existing user/assistant relay and repository artifacts; no new communication
channel or external message is created.

## 1. Authoritative source checkpoints

| Contribution | Exact checkpoint and state |
| --- | --- |
| Common published base | `neo-capiro/capiro-frontend@02c02d95bdf3949662b9123f425271c6491ffdab` |
| Portfolio integration snapshot | Branch `codex/portfolio-continuation-20261011`, HEAD `85aa5c0a816f52e23a0def34e91353ba41eda163`, latest product `75409a96d6c58a53c7d44eb6053cc291995caf80`; 29 local/unpublished commits at the snapshot |
| Active Meri consolidation | [Draft PR #4](https://github.com/neo-capiro/capiro-frontend/pull/4), branch `task/meri-ui-publish-20261011`, fresh GitHub metadata HEAD `e141d68f8954ba6c76327bcbed94739d28e0a902`, base `02c02d95bdf3949662b9123f425271c6491ffdab`; open, draft and unmerged |
| Meri PR #1 | Preserved history inside PR #4, not a separate contribution to integrate again |
| Modules/Settings | Exact branch, base, HEAD, publication state and shared-file diff await that session's handoff; do not infer absence of its work from this branch |

The Meri PR #4 metadata was freshly read on 12 October UTC. Its description admits
`SOURCE_PRESERVATION_ONLY` and requires the Portfolio consolidation and a combined
preview qualification. Its reported checks are that session's evidence, not a
root rerun. Refresh all moving heads immediately before integration. Portfolio's
watchlist, alert-channel and linked-file lanes are not included in the
`85aa5c0` snapshot and must arrive through final frozen manifests. Linked-file
arrival has since been integrated at
`d4c613985b69bc80cd3af28ed2c48c29335c770d`; the Tracker lanes still await final
integration. These later checkpoints do not change the shared-file comparison
below or turn this contract into a merged application.

## 2. One application and route contract

`apps/web` is the only Next.js application/build owner. Do not restore
`apps/portfolio-web`, add a second product document root or publish separate
frontend images over the same preview service. Route components compose feature
public entries and remain thin.

| Route | Proposed combined behavior | Current Portfolio snapshot / reconciliation |
| --- | --- | --- |
| `/` | Portfolio landing/index under the common application shell and auth boundary | Currently synthetic Meri by default; the Portfolio image sets `CAPIRO_DEFAULT_PRODUCT=portfolio` and redirects to `/portfolio`. Direct Portfolio rendering at `/` remains an explicit integration change. |
| `/portfolio` | Compatibility entry to the same Portfolio landing; a redirect to `/` is proposed | Existing real Portfolio index. Preserve old links while choosing one canonical landing URL; do not create two independent index state owners. |
| `/portfolio/[clientId]/**` | Existing Portfolio client routes and deep links | Preserve canonical client IDs, search parameters, history and feature ownership. |
| `/portfolio/prospects/**` | Existing Portfolio prospect routes | Preserve current routes until their own reviewed routing change. |
| `/meri` | Meri owner's public feature entry | Route exists as a disconnected foundation in Portfolio's branch; PR4 supplies its consolidated UI. Connected runtime acceptance is separate. |
| `/modules` | Modules owner's public feature entry | Not present in Portfolio's branch; incoming session owns implementation. |
| `/settings` | Settings owner's public feature entry | Exact sections and scope await the Modules/Settings handoff. |
| `/calendar` | Existing shared entry to Portfolio's Master Calendar capability | Keep the canonical Calendar owner; other products navigate through the agreed public route. |
| `/sign-in/**` | One designated application sign-in entry | Currently inside the Portfolio route group; move/composition must preserve Clerk behavior and return destinations. |
| `/healthz` and `/api/backend/**` | Existing health check and narrow backend adapter | Preserve finite/no-store/error behavior and explicit service allowlists. |

The root-route change is a proposed integration diff. Until owners reconcile it,
retain existing routes and flag the mismatch. Internal navigation should use
the adopted Next Link/router behavior so shell, focus and scoped styles survive
same-document product transitions. A mode is enabled only when its actual route
and supported state exist; synthetic/unavailable states retain accurate labels.

## 3. Application authentication and session scope

The combined application should compose one designated Clerk provider above
product routes. The current Portfolio provider lives in
`apps/web/src/app/(portfolio)/layout.tsx`; adopting a common boundary must remove
duplicate live providers through a deliberate reviewed change, while keeping
the existing loading, failure, signed-out and expired-session behavior.

Portfolio's `SessionBoundary` currently replaces its `DataProvider`/query cache
when Clerk `userId`, `sessionId` or `orgId` changes. Preserve this isolation when
sharing the shell. A replaced session/organization cannot retain another scope's
records, open editors, selected client, provider attempts or pending UI results.
Already dispatched native operations remain subject to native semantics; a
browser abort is not server cancellation.

One sign-in does not mean one invented token contract for all services.
Portfolio's existing server route obtains the designated Clerk `capiro` JWT;
each other backend retains its actual public audience/claim/authorization
contract. Keep Clerk subject, native database user ID, tenant ID and client ID
distinct where the native owners distinguish them. The backend establishes
authority; browser context, URL parameters and role labels do not grant access.

Auth integration is held until the Meri and Modules owners expose their current
composition and requirements. Do not derive a new identity, hard-code a tenant,
introduce a second identity application, or widen credentials to resolve a
layout conflict.

## 4. Selected-client interface

Propose one small application-selected-client interface with explicit states:
no selection, loading/revalidating, current authorized client, and unavailable.
Its data comes from existing `capirov2` client/identity services. Its contract
must distinguish the chosen ID from a successfully verified current record.
Keep the interface in an agreed shared owner with deliberate public exports;
do not import a product's private hooks from another product or create a second
client catalog solely for the shell.

For existing Portfolio client routes, the route's `clientId` determines that
view and is validated by the canonical service. The shared selection may mirror
that successful current context. A product switch may carry the same authorized
ID through an explicit public interface. Tenant/session replacement clears it;
failed or ambiguous reads cannot silently fall back to another client. A Meri
or Modules action requiring a client stays unavailable until that action's
current selection is established. Products that support an unscoped workspace
must represent it explicitly rather than infer an all-client permission.

Portfolio's `client-profile/*-public.ts` entries already expose narrowly owned
read/identity contracts. They are candidate reuse seams, not a declaration that
an application-wide selected-client provider has already been implemented.
No new speculative context framework is part of this documentation change.

## 5. Shell, styles and reusable components

The canonical shared header geometry is
`apps/web/src/shared/shell/HeaderFrame.tsx`, with explicit brand, modes, actions
and optional leading slots. Product modules own product-specific interaction;
the common navigation owner supplies the route map and current mode. Reconcile
PR4's header/asset variants with these slots and retain all exact Figma assets
and provenance. Do not substitute an older Header over the other contribution.

The [exact PR #4 seam review](./portfolio-31/MERI-PR4-SEAM-REVIEW-2026-10-12.md)
examined all 120 changed-file records against Portfolio `85aa5c0`. Exactly three
paths changed on both sides:

| Path under `apps/web/src` | Preserved integration intent |
| --- | --- |
| `shared/shell/Header.tsx` | Resolve the textual conflict by retaining `HeaderFrame`, the Next brand link and real Portfolio link while adding Meri's optional `assetSet` and icon propagation. Meri's incoming `ProductShell` already passes that prop. |
| `features/meri/MeriFixtureEntry.tsx` | Resolve the textual conflict by combining Meri's Home/cited-answer entries with the current, accurate Portfolio availability copy. |
| `shared/shell/shell.module.css` | The preserved-copy three-way merge is textually clean. Keep both root geometry delegation and Meri's new-conversation icon inversion. |

PR #4 has no package, lockfile, Next/TypeScript configuration, proxy or public
package change. Its only added app route is the cited-answer fixture entry.
These facts narrow the required source reconciliation; they do not supply the
missing application-wide authentication or selected-client interface.

Root layout owns one document, global fonts and genuinely global foundations.
Portfolio styling currently uses its `data-portfolio-root` marker and scoped
dark tokens, including portal dialogs. Preserve product isolation until shared
tokens have a reviewed common meaning. Verify Meri → Portfolio → Meri without
a document reload, stylesheet leakage or dropped fonts. Use feature CSS modules
for feature geometry instead of unqualified global element overrides.

`packages/ui` remains the reusable adopted component owner. Shared hooks,
contracts and utilities need real callers with matching semantics; keep native
Core/Intel differences explicit. Feature entry files compose cohesive field,
read, interaction and request owners. Existing size/semantic responsibility
checks require exact reviews and do not justify arbitrary fragmentation or
rubber-stamped exceptions. Preserve upstream license/pin records.

UI work uses the current Capiro Figma file
`Zc2dEN5aLU47dVdsewDmiJ`; Portfolio's page is `411:40601`. Missing Portfolio
components may be authored there before implementation under the user's
existing instruction. A synthetic screenshot is not connected-service proof.

## 6. Configuration and public backend boundaries

One integration owner composes application configuration while each backend
adapter owns its actual validated transport contract. Keep config modules pure
on import, service origins server-side, and public display configuration free
of secrets. Missing/invalid configuration retains the existing unavailable
behavior; never install fixture fallback that appears connected.

Portfolio currently validates `CORE_API_BASE_URL`, `STRATEGY_API_BASE_URL`,
`WORKSPACE_API_BASE_URL`, `INTELLIGENCE_API_BASE_URL`, the designated Clerk keys
and explicit `TRACKER_BACKEND`. Its generic service vocabulary also names
`MERI_API_BASE_URL`, but the existing proxy's Meri allowlist is empty. That name
does not establish an active Meri API integration. Reconcile Meri through the
backend's published contract and explicit adapter instead of enabling an
unrestricted proxy. Existing optional `CAPIRO_*_URL` destinations must distinguish
same-application product routes from an external Workspace/existing-app URL.

| Responsibility | Existing authority / integration rule |
| --- | --- |
| Portfolio and Modules business services | `neo-capiro/capirov2`; consume authorized Core, Engagement, Strategy, Workspace and Intelligence APIs as applicable |
| Meri runtime/control/operational state | `neo-capiro/meri-greenfield`; consume deliberate versioned public interfaces |
| Meri browser transport | Existing public0.1.0 contract/`packages/meri-client`; candidate retrieval contracts or fixture UI do not implicitly activate runtime features |
| Canonical clients, business records, documents and institutional knowledge | Existing Capiro data/service owners; reuse canonical IDs, permissions, provenance and actual version semantics through their APIs/connectors |

Sharing the existing database means sharing authoritative service-backed
records. No frontend opens SQL connections, carries database credentials, copies
customer data into a substitute store, or copies another backend's private
implementation. Meri's own conversation/run state is distinct from authoritative
Capiro business knowledge. Generated output becomes canonical only through the
existing reviewed publication/update contract.

## 7. Lockfile and one build/release pipeline

Use the root workspace install and the one active root `package-lock.json`.
Node 24/npm 11 and exact package pins are the current repository baseline. Product
sessions describe dependency additions; the integration owner reconciles
manifests and regenerates/validates the lock from that combined intent. Preserve
historical qualification locks as evidence, not active install inputs.

The current root commands are `npm ci`, `npm run check`, `npm run build`,
`npm run test:production` and `npm run test:browser`. Qualification must name the
actual exact commit, input inventory, commands/environment and raw outcomes.
Retain baseline failures, meaningful original assertions and actual captures;
do not add overlapping subset counts into a claimed full-suite pass.

One reviewed repository-root source archive produces one `apps/web` standalone
image containing the selected Portfolio, Meri and Modules/Settings contributions.
The existing `apps/web/deployment/portfolio` pipeline is the starting owner, not
a separate product deployment that each session may overwrite. The intended
shared preview remains `https://portfolio-preview.app.capiro.ai/`; its present
DNS, ingress, Clerk and service state need authenticated inspection later.

The shipment identity chain is committed source → archive hash and immutable
S3 source version → CodeBuild execution → ECR image digest and completed scan →
preview task/service digest → exact hosted release checks. Capture the previous
preview task/image/configuration for rollback. Preserve existing preview/production
route and account boundaries. No source branch may independently replace the
shared image. Current credential/AWS/merge/deployment holds stay in effect.

## 8. Reconciliation and admission

1. Collect exact Meri/Modules heads and shared diffs; assign the common owner
   through the existing coordination relay. Refresh PR4 again at action time.
2. Import/review Portfolio's source-preserving checkpoint and later qualified
   slices in an isolated integration branch. Do not reset another worktree.
3. Integrate Meri PR4 as one consolidated contribution, preserving its PR1
   ancestry. Reconcile Header/root/layout/styles/configuration changes explicitly.
4. Integrate Modules/Settings through their owned feature routes and agreed
   common interfaces. Do not infer their work from stale or inaccessible sessions.
5. Resolve the proposed `/`, common auth/client context/navigation/config and
   lockfile changes once. Record the final path owner and both sides of each
   conflict resolution; do not use a blanket ours/theirs resolution.
6. Run the combined build, route, meaningful behavior, full browser, actual
   Next navigation/style, keyboard/phone/dark and public-boundary checks at one
   committed source. Validate session/client changes across product transitions.
7. Publication, merge and shipment proceed only when their existing holds are
   resolved. Hosted auth/service/runtime acceptance is distinct from source
   preservation and disconnected fixture qualification.

## 9. Exact publication blocker and smallest supported recovery

Observed in this Portfolio session: GitHub reads succeed, but the earlier
connector branch-creation request returned HTTP 403 with
`Resource not accessible by integration`. The installed official GitHub CLI
is unauthenticated, and the unauthenticated Git push could not obtain
credentials. No Portfolio continuation PR or branch has been published.

GitHub's [official troubleshooting documentation](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#resource-not-accessible)
identifies that error as insufficient token permissions. Its
[create-reference documentation](https://docs.github.com/en/rest/git/refs#create-a-reference)
requires repository Contents write access (and, for applicable workflow changes,
the documented additional permission set). The connector's actual installation
grant, user grant and organization controls are not exposed by this error, so
this document does not pretend to identify a specific uninspected admin toggle.
ChatGPT action-permission settings are not GitHub OAuth/installation scopes.

**Smallest supported recovery:** through the existing coordinator, give an
already authorized publisher the verified bundle and exact branch/base/HEAD
receipt. That publisher can verify/import it into an isolated branch and, once
the publication hold is resolved, publish a draft preservation PR. This requires
no new credential flow in this session and changes neither main nor PR4. It is
a proposed handoff, not a tool action performed by this session or a new command
sent to another person.

The available snapshot bundle is `portfolio-continuation-85aa5c0.bundle`,
requiring base `02c02d95` and containing HEAD `85aa5c0`. SHA-256:
`e20a45c16b40200c9d7178be3c4aff4d24c18d775cd3646e003f38ea6cb3e7f2`.
It does not contain later unfinished Portfolio lanes or this newer contract.
The next complete handoff must include a new exact bundle/receipt. If an
authorized publisher is unavailable, the owner may later restore the existing
GitHub connection's supported repository permissions or authenticate the CLI
through its normal secure flow when the credential hold is explicitly revisited.
Do not start either flow, solicit tokens, or perform AWS actions from this request.

## 10. Open reconciliation items

The common owner assignment, Modules/Settings exact checkpoint, final root alias,
Meri/Modules auth and selected-client interfaces, shared token/style decisions,
and combined release admission remain proposed/pending. Record each resolution
with its contributing source commits. This contract intentionally makes those
gaps visible while preserving all three sessions' existing work.

Related records: [coordination snapshot](./portfolio-31/COORDINATION-HANDOFF-2026-10-12.md),
[shared preview/backend guide](./SHARED-FRONTEND-PREVIEW-GUIDELINES-2026-10-11.md),
[Portfolio continuation](./portfolio-31/CONTINUATION-2026-10-11.md), and
[restart handover](./portfolio-31/handover-2026-10-11/HANDOVER.md).
