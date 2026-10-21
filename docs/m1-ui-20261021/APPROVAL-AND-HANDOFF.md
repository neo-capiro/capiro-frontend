# Agent 4 v1 — approval and remaining owner handoffs

## Current approval

Neo's direct approval at 2026-10-21 20:13:10 UTC authorizes the named M1 shared-shell, conversation/action-followthrough API route and test exceptions, the MF-07 retention policy, publication of frontend commit `91d399d5414760e0da5399845c8bd76bc7baac4a` as a draft PR, and the bounded Phase0 Core qualification-metadata task. The earlier pending-policy statements in the implementation and validation documents describe the original `91d399d5` snapshot; they are superseded by this approval.

No merge, deployment, production migration, runtime/dependency change, or broader lane expansion is authorized.

## Frontend publication

Before the one authorized retry, remote `main` was verified at `84f5ba29fe868b6b1ec701a9a3f383e0d14cb352`; the proposed branch and matching PR did not exist. The retry used the shell executor in the frontend worktree: `git push -u origin 91d399d5414760e0da5399845c8bd76bc7baac4a:refs/heads/codex/agent4-m1-chat-ui-20261021`. Target: `https://github.com/neo-capiro/capiro-frontend.git`. It passed automatic approval review, then exited 128 with `fatal: could not read Username for 'https://github.com': No such device or address`. This was missing CLI authentication, not a new approval denial, GitHub permission rejection or demonstrated transport outage. No further Git push was attempted.

The connected Git-data route is available for frontend. A valid idempotent `github_create_tree` call reproduced the existing base tree; an earlier empty-entry probe returned 422 `Invalid tree info`, which was an input validation error, not an access denial. The verified approved 26-file tree was then published using `github_create_tree`, `github_create_commit`, `github_create_branch` and `github_create_pull_request`, all successfully. No credentials were created, configured or requested. The API assigns commit metadata, so this was disclosed before publication and the PR records both identities.

Frontend draft PR: https://github.com/neo-capiro/capiro-frontend/pull/119

- Approved local source: `91d399d5414760e0da5399845c8bd76bc7baac4a`.
- Published API commit: `1cec16f18d359ef9152f996dc4dd0f976a2780eb`.
- Exact source/published tree: `01682c03b3e7813bc19676cab0c4be048159b5b1`.
- Base commit: `84f5ba29fe868b6b1ec701a9a3f383e0d14cb352`; base tree: `0b75155b30dae22e45107fba41e4470456556eab`.
- Target branch: `codex/agent4-m1-chat-ui-20261021`, draft against `main`.

The verified `agent4-m1-91d399d5.bundle` also preserves the exact original commit and branch, requiring the base commit above. Bundle SHA-256: `8bc1846aac54208d04909ca4429fdc7e9d70dc995e517ca0ea912ea3d54d5ad3`. Publication is no longer blocked; the bundle is a preservation/handoff artifact rather than a request for another push.

## M1 integration ownership and implementation outline

Fable's ownership clarification in issue202/comment6326945491 supersedes the earlier agent3 routing and fits Neo's existing M1 approval. Agent4 now owns these exact integrations; no next phase or new backend behavior is added. The initial integration was stacked on PR119 at `1cec16f18d359ef9152f996dc4dd0f976a2780eb`. Fable subsequently requested a next-head review in PR119/comment6327902663. This integration remains a separate draft, mechanically reapplied on the corrected PR119 head; no PR120 verdict is inferred. See `REVIEW-119-R1.md` for correction receipts and the two held MF-06 claims.

- `apps/web/src/shared/session/ApplicationBoundary.tsx`: synchronize the resolved Clerk user/session/organization identity before any Meri journal hydration; purge on confirmed signout and application expiry. Keep query disposal and request cancellation behavior intact. Loading is not signout and route navigation never purges.
- `apps/web/src/app/meri/layout.tsx`: compose the Meri capability provider from the canonical server configuration reader. Capabilities remain off by default.
- `scripts/architecture/dependencies.mjs`: permit only the named `capabilities.server.ts` to `preview/backend-policy.server.ts` import; retain all other boundary denials.

The journal owns bounded, versioned, exact tenant/actor/client/conversation session-storage records and generation fencing. A module-local successful identity synchronization is required on every page load; a stored marker alone never unlocks reads or mutations. A replaced identity purges before hydration. Public `/forms/**` and `/it/:token` routes do not mount Meri or read its journal. The two executable signout controls (`/register` and `/accept-invite`) remain under `CurrentSession`; no new public-route auth hook is introduced.

The existing draft owner preserves raw unsent text separately from captured immutable request/ACK identity and edit revision. Canonical query and turn journals retain exact request identities before dispatch and recover uncertainty through the existing server readback/reservation paths. Continuation captures and turn intents share one request identity generated inside the command gate, so a failed turn write cannot attach a newer draft to an older recovered request. Restored bytes grant no authority. Storage failures preserve mounted text and block mutations; exact conversation revocation clears its storage and cached recovery owners while signout/expiry clears all Meri recovery. No unload handler is added: session storage supplies the approved same-tab lifetime.

Verification includes the existing 59-file/872-test preparatory receipt, focused recovery and identity tests, new public-route→different-signin regression, meaningful mutation checks for mismatch/signout/revocation, capability/config/route agreement, TypeScript, lint and architecture checks. Browser, production build and native/live qualification are separate gates and will be reported as passed only if actually run successfully at this source.

Lifecycle SDK/API activation remains held on supported runtime composition/readback and public-package/boundary allocation. The current UI continues to explain that the operations are unavailable.

The earlier local preparatory retention commit `b4b0b871c74f4baa6937a877544886011b3c112a` was separate from PR119: canonical submit/selection/turn recovery, bounded session-storage envelopes, and global/per-conversation stale-writer fencing. Independent review found and verified fixes for pre-dispatch generation checks and outcome-neutral post-dispatch storage errors. That exact isolated snapshot passed 59 files / 872 Meri tests, including 9 new tests qualified by 10 killed mutants. Focused TypeScript, lint and architecture passed; no boundary policy changed. At that preparatory checkpoint production callers still omitted storage. The current integration opts them in after the identity barrier; its final receipts are in `INTEGRATION-VALIDATION.md`.

## Core publication and qualification

Draft PR: https://github.com/neo-capiro/capiro-backend/pull/107

Base: `8d9958f75ba2fefe8edcf5e21a459ae97187ac8a` (`backend-import`). Published head: `51e265bd5b5170abffb32a62ffc39a52a788fe60`. The published tree `4ac54093d3dc477e08249ded10bc7a07972637e6` is byte-identical to the local reviewed Core commit.

Exactly three qualification files changed. The unchanged generator produced 516 nodes, 1,022 edges and zero unresolved edges. A second invocation reproduced identical contract bytes. Existing qualification suites passed 120/120 with zero skips; both schema-formatting paths used pinned Prisma 5.22.0.

Docker is absent. The requested image build exited 127; runtime and isolated DB probe scripts exited 64 at their unchanged missing-Docker guard. The required `PASS_COMPILED_ENTRYPOINT_REACHES_ISOLATED_DB_GATE; FULL_API_STARTUP_UNVERIFIED` output was not obtained. Neo confirmed Claude can perform this Docker qualification. At that local checkpoint, qualification remained held for those unchanged commands on a native AMD64 Docker host; Fable’s subsequent receipts are recorded below. No database was accessed and no gate was weakened.

Fable subsequently reported native-amd64 CodeBuild `44ca9614` qualification PASS at the same frozen head (PR107/comment6327083675): exact archive/source and all11 migrations, image build and static probe, runtime probes, isolated entrypoint DB gate, image architecture/digest and scan. The gate printed exactly `PASS_COMPILED_ENTRYPOINT_REACHES_ISOLATED_DB_GATE; FULL_API_STARTUP_UNVERIFIED`. Reported image: `capiro/preview-core@sha256:543472c7803aaa18a84e19f20481bed637beb9a3fd650e8ca7dcf370d0ab183e`; exact-digest scan had zero findings. This is Fable’s reported qualification, not a locally rerun Docker result or full API startup verification. The subsequent generator review ACCEPT is recorded below. PR107 stays frozen; no further pushes, merge or deployment are authorized here.

Fable then reported review **ACCEPT** at the same head (PR107/comment6327156707). Its clean LF archive regeneration was byte-identical to contract SHA-256 `a7c1a4243eefc3750d08a18bd7d6437b98c907f77f240e66921f383836ff3505`; it independently recomputed all four Prisma pins and confirmed unchanged assertions. Its qualification-suite selection passed103/103 (base101/103); the full x64 environment still includes arm64-specific fixtures, with unchanged baseline failures apart from the two repaired pin tests. Fable’s103-test result and the earlier local120-test receipt are recorded separately; their counts have not been reconciled, and no combined total is claimed. Review ACCEPT and Docker PASS do not authorize merge/deployment or establish full API startup.
