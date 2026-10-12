> Preserved independent review. The verbatim report below originated at
> `outputs/evidence/portfolio-shared-integration-20261011/PR4-SHARED-CONTRACT-REVIEW-20261012.md`
> with SHA-256 `2c0c15725e472ecb0cbc8d7ec3f7cd5ef26303f2881215d1f626ba52ce6c69f7`.
> Its adjacent raw directory references refer to that original evidence location.
> Snapshot receipt SHA-256: `c79a7ff241e4bf51512b0b61c318cfefff899a5b04f687af0fa4cd11a088e70f`.
> The [current proposed contract](../SHARED-INTEGRATION-CONTRACT-2026-10-12.md)
> incorporates these findings; ownership and all existing holds remain pending.

# Meri PR #4 / Portfolio shared integration seam review

Reviewed 12 October 2026. Read-only source comparison; no implementation, authentication,
AWS, build, test, or browser action was performed. This is input to the integration
owner's proposed contract, pending Meri and Modules owner reconciliation.

## Exact compared sources

- Meri consolidation: [frontend draft PR #4](https://github.com/neo-capiro/capiro-frontend/pull/4),
  head `e141d68f8954ba6c76327bcbed94739d28e0a902`, base
  `02c02d95bdf3949662b9123f425271c6491ffdab`. Fresh API metadata says open,
  draft, and unmerged. The body labels it `SOURCE_PRESERVATION_ONLY` and
  records preservation of PR #1 history. **PR #4 is the integration input;
  PR #1 must not be integrated separately.**
- Portfolio comparison: committed root
  `85aa5c0a816f52e23a0def34e91353ba41eda163`. Root subsequently integrated
  CORE-109 as `d4c613985b69bc80cd3af28ed2c48c29335c770d`; this note remains
  deliberately pinned to the requested earlier snapshot.
- All 120 PR #4 changed-file records were retrieved across both API pages.
  Ten relevant PR #4 files were retrieved at its exact head and verified
  against their Git blob SHA-1. Twenty-five root files were read from the
  committed object database. The adjacent `pr4-shared-contract-review-20261012/`
  directory preserves metadata, the full filename inventory, exact source
  bytes, and `snapshot-receipt.json`.

Compared against the common base, exactly **three paths changed on both sides**.
A read-only three-way text merge on preserved copies found two textual conflicts;
the CSS overlap merges textually.

| Shared path | Result and necessary reconciliation |
| --- | --- |
| `apps/web/src/shared/shell/Header.tsx` | Textual conflict. Add PR #4's optional `assetSet: "home" \| "cited-answer"` and propagate it to the existing icons/title, retaining root's `HeaderFrame` composition, Next brand link, and enabled `/portfolio` link. PR #4's old whole header has disabled Portfolio navigation and no shared geometry wrapper. |
| `apps/web/src/features/meri/MeriFixtureEntry.tsx` | Textual conflict. Preserve PR #4's Home and cited-answer entry links and explicit synthetic citations/copy limitations. Preserve root's corrected Portfolio availability copy. The PR's statement that Portfolio remains a future destination is stale relative to the consolidated routes. |
| `apps/web/src/shared/shell/shell.module.css` | No textual conflict. Retain root's header geometry delegation and PR #4's `.newConversation img` inversion rule. Do not restore the base direct-header layout in place of the canonical wrapper. |

The header mismatch is functional, not merely stylistic: PR #4's
`ProductShell` supplies `<Header assetSet={assetSet} />`, whereas root's
header currently accepts no props. A partial integration therefore has a type
mismatch. Taking PR #4's entire header instead would drop the real Portfolio
link and render a direct header using root's reduced `.header` rule
(`border-bottom-width: 2px`) without `HeaderFrame`'s height, flex alignment,
spacing, and padding.

## Interfaces to preserve or agree

| Responsibility | Actual source and proposed bounded contract |
| --- | --- |
| Shared header geometry | `apps/web/src/shared/shell/HeaderFrame.tsx` and `header-frame.module.css` own geometry through explicit brand/modes/actions/leading slots. Each product owns the meaning of those slots. Preserve this wrapper; do not turn Meri's fixture shell into Portfolio's session owner. |
| Meri presentation extension | PR #4's `DesignIcon.tsx`, `ProductShell.tsx`, and `Sidebar.tsx` add the optional asset set with the backward-compatible `home` default. The only added app route is `apps/web/src/app/meri/fixture/cited-answer/page.tsx`, composing `MeriCitedAnswer` with `designTarget="442:81682"` and the cited-answer assets. These additions are compatible after Header reconciliation. |
| Root and product routes | Root `apps/web/src/app/page.tsx` redirects to lowercase `/portfolio` only when `CAPIRO_DEFAULT_PRODUCT === "portfolio"`; otherwise it renders the synthetic Meri fixture entry. `/meri` remains the Home fixture. There is no implemented capital `/Portfolio` alias or `/modules` family in this reviewed source. Root-entry/case policy and Modules route ownership remain explicit owner decisions. The preview guideline's intended root redirect relies on its deployment configuration, not an unconditional source redirect. |
| Product-mode navigation | Root Meri Header already links to local `/portfolio`. Portfolio `shared/portfolio/shell/WorkspaceSwitcher.tsx` uses local `/portfolio`, but Meri and Modules come from configured destinations and are disabled when absent. No shared current-client value is passed in those links. Agree canonical in-app destinations and any client handoff before claiming seamless connected switching; do not enable an unimplemented Modules destination. |
| Authentication and query lifetime | `app/(portfolio)/layout.tsx` conditionally owns Clerk; `app/(portfolio)/(product)/layout.tsx` owns setup/session composition. `shared/portfolio/auth/SessionBoundary.tsx` keys the data provider by user, session, and organization. `src/proxy.ts` matches Portfolio, Calendar, sign-in, and backend-adapter routes, not `/meri`. PR #4 adds no shared authenticated session. A future promotion must preserve one session owner, current-identity cache replacement, and sign-out/tenant transitions; a visual shell merge alone does not supply that contract. |
| Canonical client context | `features/portfolio/client-profile/ClientFrame.tsx` receives the route client ID, reads the existing client owner, hides errored/noncurrent client content, and passes current display information to the Portfolio shell. Meri fixture identity/client strings are synthetic. There is no reusable authenticated cross-product selected-client provider in this diff. Meri's Sidebar reset event and return to `/meri` are local fixture behavior, not an authorized client handoff. |
| API and backend ownership | Portfolio `app/api/backend/[service]/[...path]/route.ts` and `shared/portfolio/api/proxy.ts` retain Clerk token projection, explicit service/path allowlists, same-origin mutation handling, and deadlines. The Meri service allowlist is empty; configuring `MERI_API_BASE_URL` alone does not activate runtime routes. Keep Portfolio/Modules existing service owners in `capirov2`, Meri's trusted runtime in `meri-greenfield`, and canonical records behind their service authorization. Do not widen the Portfolio proxy or imply a database connection during this frontend merge. |
| Shared CSS and theme scope | Retain root `app/layout.tsx`'s font variables, including Geist Mono. Meri's root `app/globals.css` is unchanged by PR #4. Portfolio legacy styles remain scoped to `:where(body:has([data-portfolio-root]))`, including portaled controls and the current dialog-grid exclusion. Keep the marker owned by the Portfolio layout; applying it around Meri would activate unrelated Portfolio form/grid/theme rules. Same-document transitions must remove the old product's marker and query/dialog state. |
| Workspace/configuration | PR #4 changes no package manifest, lockfile, TypeScript/Next configuration, proxy, or public package. Preserve root's canonical `apps/web`, merged dependencies and single root lock, standalone build/output tracing, security headers, tests, and deployment wiring. There is no evidence in this PR of a new dependency resolution requirement. Do not restore the older full application tree or superseded transferred app while integrating the feature diff. |

`packages/meri-client` has no PR #4 changes. Its published transport boundary
and version remain separate from the new synthetic cited-answer presentation.
The PR's local historical test/build statements were read as reported evidence;
this review did not rerun or independently qualify them, and they do not
establish a connected runtime.

## Review result and limits

The source can be reconciled through the two narrow semantic conflicts and the
compatible shell/asset additions above. No new root config or dependency
conflict was found in the exact PR inventory. A whole-file header replacement
or restoration of the stale fixture availability text would be a concrete
regression.

The reviewed shared-preview guideline at root85aa still names PR #1. Its
ownership, single-image, canonical service, and current-authentication rules
remain useful, but the integration reference must now point to PR #4 and retain
PR #1 only as preserved history. This note does not edit that historical source.

Before a combined release claim, the integration owner should qualify the
reconciled Home and cited-answer asset sets, working product links, shared
header geometry, root-default configuration, and same-document product
transitions in the one combined source/image. Route policy, authenticated
Meri runtime, cross-product client context, and Modules ownership are proposed
interfaces to resolve with their owners, not completed functionality or proof
of a native service failure. This review did not alter or activate them.
