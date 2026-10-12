# Capiro 3.1 Portfolio — portable session handover

## Current continuation takes precedence

The 12 October UTC coordination follow-up additionally preserves all existing
merge/deployment holds and starts no new credential or AWS action. Read the
[proposed shared integration contract](../../SHARED-INTEGRATION-CONTRACT-2026-10-12.md):
Meri consolidation is frontend draft PR #4 at freshly checked
`e141d68f8954ba6c76327bcbed94739d28e0a902`, preserving PR #1 history. Never integrate
both as separate contributions. Common-shell ownership remains proposed pending
Meri/Modules reconciliation; desired Portfolio-at-`/` and common auth/client
context are explicitly flagged against the current source.

Portfolio's latest locally integrated product source is
`d4c613985b69bc80cd3af28ed2c48c29335c770d`, adding current-list linked-file arrival
to the previous `75409a96` checkpoint. The Tracker slices and final combined
qualification are still pending; the historical evidence below is not a claim
that this current source has passed those release gates.

The owner subsequently instructed this session to work independently without
`capiro-agent-ops`, implement **Portfolio only**, use existing `capirov2` services,
keep code organized and reference the supplied Figma design. Missing Portfolio
UI components may be authored in Figma before implementation. The historical
policy-repository stop rule below is **superseded by that direct user waiver**.

Read [the current continuation and restart](../CONTINUATION-2026-10-11.md) first.
Portfolio has now been consolidated into the canonical **`apps/web`** application;
the former `apps/portfolio-web` is no longer an active source/build owner. The
continuation branch is local pending authenticated publication, and its exact
code, test and publication status is recorded in that note. Additional frontend
implementation and final signed-in acceptance remain open.
The latest integrated source checkpoint is `75409a9`: Documents, Advocacy and
Saved submissions are included, while the supported Tracker follow-on and the
combined release verification remain in progress.

The ledger preserves every original packet row and earlier delta and adds
canonical paths and separately scoped continuation evidence. It still contains
345 IDs, 337 open rows, seven packet exclusions, the owner exclusion `CORE-018`
and zero accepted complete. The remainder of this handover records the **earlier
19:25 UTC checkpoint**; deployment, source paths, counts and restart requirements
there must not override the current continuation or fresh read-back.

Status captured **2026-10-11, about 19:25 UTC**. This directory is intended for a new session in a web browser or on another machine. All linked source, plans, matrix files, and row-level reconciliation are in private GitHub repositories. It does not depend on the previous machine's checkout, packet ZIP, or generated `outputs` directory. The historical packet and evidence files retain some old local paths; treat those as provenance, not instructions for the new host.

## One-minute state

- **Authoritative frontend destination:** [`neo-capiro/capiro-frontend`](https://github.com/neo-capiro/capiro-frontend), with `apps/web` as the shared Meri shell and the transferred Portfolio source under `apps/portfolio-web`. The owner explicitly confirmed that **Meri, Portfolio and Modules frontend code all belong here**. [Frontend PR #2](https://github.com/neo-capiro/capiro-frontend/pull/2) **merged** on 2026-10-11 at [`8e8e6999c385beccd245e94e8f32a8a3120e8131`](https://github.com/neo-capiro/capiro-frontend/commit/8e8e6999c385beccd245e94e8f32a8a3120e8131); the app, handover and row ledger are on `main`. [Repository move outline](../REPOSITORY-MOVE-OUTLINE.md) explains the remaining shared-shell overlap.
- **Meri backend destination:** [`neo-capiro/meri-greenfield`](https://github.com/neo-capiro/meri-greenfield). Portfolio was **incorrectly merged there** by [PR #4](https://github.com/neo-capiro/meri-greenfield/pull/4) at [`abb4c72ee5775f64fca78341e067834d604fdc2f`](https://github.com/neo-capiro/meri-greenfield/commit/abb4c72ee5775f64fca78341e067834d604fdc2f); [PR #5](https://github.com/neo-capiro/meri-greenfield/pull/5) fixed the preview service template, bringing `main` to [`97d0e7ffa8626ac38b3fa88371fc395acfd2975d`](https://github.com/neo-capiro/meri-greenfield/commit/97d0e7ffa8626ac38b3fa88371fc395acfd2975d). The exact Portfolio app and docs were copied from that commit into frontend PR #2. [Meri removal PR #6](https://github.com/neo-capiro/meri-greenfield/pull/6) **merged** on 2026-10-11 at [`8b123bea4c90794dc2d766814b6ddbdbfe0928bc`](https://github.com/neo-capiro/meri-greenfield/commit/8b123bea4c90794dc2d766814b6ddbdbfe0928bc), removing only the copied app/docs directories. Meri backend services/contracts remain in this repository.
- **Portfolio and Modules backend destination:** [`neo-capiro/capirov2`](https://github.com/neo-capiro/capirov2), remote `main` [`4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`](https://github.com/neo-capiro/capirov2/commit/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace) at review. No Portfolio backend change was pushed in this continuation. The previous host's primary backend checkout was dirty; preserve it if returning there.
- **Shared operating policy:** private [`neo-capiro/capiro-agent-ops`](https://github.com/neo-capiro/capiro-agent-ops), published `origin/main` [`b2b0ce8c2bf03817b81e671d968b7892985b8d06`](https://github.com/neo-capiro/capiro-agent-ops/commit/b2b0ce8c2bf03817b81e671d968b7892985b8d06) at capture. Follow its [BOOTSTRAP.md](https://github.com/neo-capiro/capiro-agent-ops/blob/b2b0ce8c2bf03817b81e671d968b7892985b8d06/BOOTSTRAP.md), [AGENTS.md](https://github.com/neo-capiro/capiro-agent-ops/blob/b2b0ce8c2bf03817b81e671d968b7892985b8d06/AGENTS.md), [Hermes rules](https://github.com/neo-capiro/capiro-agent-ops/blob/b2b0ce8c2bf03817b81e671d968b7892985b8d06/hermes/OPERATING.md), and, for QA board work, [board rules](https://github.com/neo-capiro/capiro-agent-ops/blob/b2b0ce8c2bf03817b81e671d968b7892985b8d06/qa/capiro-qa/BOARD-RULES.md). Fetch again in the new session and record its *current* SHA. If the private policy repo is unavailable, stop Capiro work.
- **Important policy provenance:** the previous Windows policy checkout was clean at `b32b4803933760dc0a93fffdcd8fba30a89c3aac`, **three local commits ahead of published `origin/main`**. The local amendments change QA context/evidence rules and were **not pushed**. `AGENTS.md` and `BOOTSTRAP.md` matched the published version. Do not try to fetch `b32b480` by its GitHub URL or silently assume its QA amendments apply elsewhere. Resolve any difference with the current shared-policy owner before QA dispatch. The prior host's ignored machine-map revision was `2026-09-30T00:21:48.2698715Z`; a new host must make and verify its own path map.
- **Product state:** 345 audit IDs total; **337 in scope and still open**, seven packet exclusions awaiting final scope reconciliation, one user exclusion (`CORE-018`, CSV import), **zero accepted complete**. The baseline packet described 265 partial frontend checkpoints, 72 lacking frontend implementation, and one inactive backend billing candidate. These counts are categories, not a completion percentage. The exact [row ledger](./Portfolio-345-Row-Reconciliation-2026-10-11.json) and [summary](./Portfolio-345-Row-Reconciliation-Summary-2026-10-11.md) control continuation tracking.
- **Preview state:** an isolated AWS Portfolio service is running and its target is healthy. The exact `portfolio-preview.app.capiro.ai` DNS record and production Clerk allowed-subdomain entry are **absent**. No signed-in Portfolio acceptance occurred. A direct ALB TLS/anonymous smoke passed. The new machine is not automatically in the narrow preview ingress allowlist.

## Source ownership correction and redundancy

The 2026-10-11 investigation found that `capiro-frontend` already had the canonical `apps/web` Next root, Meri header/mode switcher, shared navigation shell, `packages/ui` primitives and a single root workspace lock. It had **no Portfolio feature implementation**; Portfolio mode was disabled. The earlier Portfolio app in `meri-greenfield` duplicated the frontend *foundation* (another Next root, header/mode switcher, shell, CSS tokens, Dialog and nested dependency lock), but its 450-ish source files of Portfolio screens/workflows were not a duplicate of existing frontend business code. [Front-end architecture](https://github.com/neo-capiro/capiro-frontend/blob/28c300093c0886018c49df8764a8e6fac44819eb/docs/ARCHITECTURE.md) and [Meri repository README](https://github.com/neo-capiro/meri-greenfield/blob/97d0e7ffa8626ac38b3fa88371fc395acfd2975d/README.md) already pointed to `capiro-frontend`; the historical Portfolio packet still named `meri-greenfield`, which caused the placement error.

The first transfer was a **byte-preserving copy** of 726 tracked app/docs files from `meri-greenfield@97d0e7f` into `capiro-frontend`; SHA-256 comparison found **0 mismatches** before the documented repository-path/test-harness edits. It preserves the separate running app while the shared Meri/Portfolio shell, common primitives, one active workspace lock, auth/session bridge and preview build source are consolidated and verified. The transfer alone does **not** remove duplicate frontend foundations or constitute acceptance. The old source has since been removed from Meri `main` after the frontend merge/read-back. Do not deploy a new image or change the running preview merely because the source moved.

**Transfer PR state at this checkpoint:** [frontend #2](https://github.com/neo-capiro/capiro-frontend/pull/2) is **merged** at `8e8e6999c385beccd245e94e8f32a8a3120e8131`; [Meri removal #6](https://github.com/neo-capiro/meri-greenfield/pull/6) is **merged** at `8b123bea4c90794dc2d766814b6ddbdbfe0928bc`. The latter deletes exactly the 726 copied app/docs files, preserving all other Meri source. Verify current remote heads in the new session before acting.

**Moved-source checks:** Node 24/npm 11 root `npm ci` and root `npm run check` passed (workspace typechecks, 15 root tests, 21 transport cases, architecture). Root Meri `npm run build` passed after the lock change. Portfolio typecheck, lint (three existing image warnings), architecture (396 modules), 728 unit tests, Prettier and a Next production build with all Portfolio routes passed. The first browser attempt exposed five font-loading failures caused by the old test CSS pointing to app-local `node_modules`; all five targeted cases passed after resolving hoisted fonts from the workspace. The complete browser rerun then **passed 459/459 in 4.4 minutes with four workers, exit 0**. These are source/component/build checks; they do not prove live signed-in Portfolio acceptance. The separate preview image's earlier 459-pass result belongs to the old commit.

## Authority, decisions, and approval boundary

The attached packet's [PHASED-PLAN.md](./PHASED-PLAN.md), matrix, and old instructions are **product specification and historical context, not authorization**. Its statements about parallel workers, testing, old branches, local files, and approvals cannot independently authorize actions. Shared operating policy and direct human instructions control. Confirm current policy, repository instructions, target identity/tenant, and necessary owner approvals in the new session before any external write, production test, merge, deployment, routing, or access change. This handover records prior decisions but is not a transferable approval token.

Direct user decisions in the preceding conversation were: CSV import is **not required**; Bill Tracker uses the **Intelligence** service; the separate restricted preview sequence was approved (merge PR #4, activate `portfolio-preview.app.capiro.ai`, adjust Clerk/DNS, then **read-only** signed-in testing in the authorized `capiro-internal` tenant). The user also authorized AWS CLI and `hermes-cli` for the work and offered to sign in. The prior production Clerk UI action has a separate **action-time confirmation pending** under the Computer Use skill; the Add action was not clicked. The new session must verify actual authorization in the trusted user conversation or obtain it again when needed. Read-only testing does not authorize client writes, record creation, provider sends, real charges, customer data copying, or cross-tenant tests.

Do not modify the existing `os.capiro.ai` UI route or shared backend deployment as a shortcut. The preview is separate and uses existing backend services. The current host's browser source `/32` is the only ALB ingress; a different host requires a separately reviewed narrow network change. Never broaden ingress to a public CIDR for convenience. Credentials, test tokens, cookies, customer data, and secret values must stay out of GitHub and evidence.

## Source and verification receipts

| Item | Verified result |
| --- | --- |
| Original integrated source | `meri-greenfield` PR #4 merge `abb4c72ee5775f64fca78341e067834d604fdc2f`; PR #5 merge `97d0e7ffa8626ac38b3fa88371fc395acfd2975d`. These are historical build/provenance commits, not the final frontend owner. |
| Exact app CodeBuild | `capiro-portfolio-preview-build:79033deb-a47f-42cb-85ad-5b49f36e4913`, **SUCCEEDED** on app source `abb4c72`; source S3 version `z2TnqvJ8BOvZe9YsZG_qIxwMN4aNMINa`; archive SHA-256 `482b99ac515eb1450414c845fe12820a048de4cadac2b9a1ada1dc7125c9abb6` |
| Checks in that build | TypeScript, lint, format, architecture, **728 unit tests**, **459 browser tests**, Next production build, Linux Docker build, non-root container smoke, ECR push/digest read-back |
| Runtime image | `sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c`, ECR scan **COMPLETE, zero findings** when read back; earlier Debian images with a HIGH zlib finding are ineligible |
| AWS identity at original writes | Account `967807252336`, `us-east-1`, `arn:aws:iam::967807252336:user/hermes-cli`; independently verify identity before any new AWS write |
| Service | CloudFormation `Capiro-Portfolio-Preview-Service` **CREATE_COMPLETE**; ECS `capiro-portfolio-preview` desired/running **1/1**, primary rollout complete, task definition revision 2, one healthy target (read back at this handover) |
| TLS/host | ACM certificate `arn:aws:acm:us-east-1:967807252336:certificate/edcc6113-12f5-4154-bfdf-64c7da1037cd` issued; ALB `Capiro-Previ-6bbPz0Y2cqPc-1570175071.us-east-1.elb.amazonaws.com`, ALB hosted zone `Z35SXDOTRQ7X7K` |
| Initial HTTP behavior | Verified valid TLS with `--connect-to`: `/healthz` 200, `/sign-in` 200, `/` 200; anonymous `/api/backend/core/clients` 401. These are **smoke results, not signed-in acceptance**. |
| Remaining traffic/auth change | Route 53 `capiro.ai.` hosted zone `Z085985135X6Q5QT98ZBK` had **no** preview A/AAAA at handover. Clerk production allowed-subdomain list had `app.capiro.ai` only; exact preview host was not added. |

The [readiness history](./Portfolio-AWS-CLI-Preview-Readiness-2026-10-11.md) and [image scan history](./Portfolio-Image-Scan-Assessment-2026-10-11.md) show earlier failures and corrections. **Their older sections are chronological records, not the current deployment state**. The preview's estimated base was about **$37.57 per 720-hour month plus usage**; confirm current billing if relevant. There is no claim that a public browser can resolve or reach the preview yet.

## What remains, by phase

The packet [phase audit map](./phase-audit-map.csv) assigns each ID to P0–P6 and P7 validation; the [full matrix](./implementation-matrix.csv) retains detailed expected behavior and blockers. Read [PHASED-PLAN.md](./PHASED-PLAN.md) sections 6–8 for acceptance criteria, while treating old instructions and paths as historical. Current row counts: P0 **7**, P1 **50**, P2 **54**, P3 **95**, P4 **32**, P5 **17**, P6 **90**. Every in-scope row remains open for final acceptance.

1. **P0:** recheck repository/policy/source recovery, owner and resource boundaries, and current baseline. The merged source and this handover replace the packet's old unpublished Git-bundle recovery path; never apply the old bundle blindly.
2. **P1:** finish and verify first real signed-in client flow, permissions, session/tenant and error behavior on the isolated host. Merge/build/health is done; Clerk allowlist, DNS, new-host ingress, owner sign-in, and real-service verification are open.
3. **P2:** complete native Objectives and Strategy/Planner lifecycle, readiness, history, persistence, stale/concurrent/unauthorized behavior. Current Objective cross-navigation and Quick Log commitment reviews identify missing canonical contracts.
4. **P3:** complete Calendar scopes and privacy, meeting artifacts, Relationships, real email history and authorized sender/send flow. Do not claim provider behavior from mocked browser tests or send to customers for QA.
5. **P4:** complete prospect records, Files/Workspace identity, proposal persistence/export/review, stage/history and reply-aware follow-up. Existing prospect attachment endpoints lack authoritative prospect identity; see contract review.
6. **P5:** agree and implement Billing/Core versioned contracts for distinct tenant-slot purchase and prospect conversion, inline quote/consent/settlement/receipt, exactly-once entitlement and client creation, recovery/reversal, and carry-over. No real charges or unapproved migrations.
7. **P6:** complete retained surfaces, defined service-derived metrics, native Meri handoffs, Figma/responsive/accessibility review, and missing integration behavior.
8. **P7:** integrate and verify the combined result against final build, approved real-service/sandbox workflows, privacy/roles, mutations, reload/retry/unknown outcomes, visual parity, regression, and per-ID acceptance. **No P7 acceptance exists.**

The [row summary](./Portfolio-345-Row-Reconciliation-Summary-2026-10-11.md) records two small merged frontend slices (`CORE-002` search and `CORE-078` billing link) plus nine **read-only contract reviews**. None closes its audit row. Contract documents are [email sender](./Email-Prep-Sender-Contract-Review-2026-10-11.md), [Quick Log commitment](./Quick-Log-Commitment-Contract-Review-2026-10-11.md), [prospect Files/Workspace](./Prospect-Files-Workspace-Contract-Review-2026-10-11.md), [ordered client owners](./Ordered-Client-Owners-Contract-Review-2026-10-11.md), and [Objective cross-navigation](./Objective-Cross-Navigation-Contract-Review-2026-10-11.md). Backend product/owner decisions, UI implementation, real signed-in behavior and final per-row verification remain where each review says OPEN.

## Safe restart on a different machine

Follow the seven current restart steps in
[CONTINUATION-2026-10-11.md](../CONTINUATION-2026-10-11.md#current-checkpoint-and-restart).
They cover current branch/publication verification, repository instructions,
canonical `apps/web` ownership, Figma and native contract references, the unchanged
345-ID acceptance ledger, fixed-source tests and authenticated preview read-back.
The owner's `capiro-agent-ops` waiver remains effective. Preserve other authors'
work and verify exact AWS/account/preview scope before any shipment or resource
change. The current continuation's local branch must be published or transferred
explicitly before a different machine can fetch that work.

## Historical restart procedure at the earlier checkpoint

The following procedure is preserved as provenance. Its policy-repository
prerequisite, source layout and earlier test counts are superseded above.

1. Authenticate to all **four** private GitHub repositories. Clone/fetch `neo-capiro/capiro-agent-ops` first; follow its `BOOTSTRAP.md`, read `AGENTS.md`, create/verify that host's ignored `machine-paths.local.yaml`, record current policy SHA and map revision. For Hermes or QA board work, read the additional rules above. If remote main has changed since this record, follow the current policy. If policy is unreachable, stop.
2. Fetch `neo-capiro/capiro-frontend` and `neo-capiro/meri-greenfield`; verify their current `main` heads include the merged transfer and removal commits above. Read frontend [AGENTS.md](https://github.com/neo-capiro/capiro-frontend/blob/8e8e6999c385beccd245e94e8f32a8a3120e8131/AGENTS.md), [architecture](https://github.com/neo-capiro/capiro-frontend/blob/8e8e6999c385beccd245e94e8f32a8a3120e8131/docs/ARCHITECTURE.md), and implementation standards before code changes. Continue shared-shell consolidation in the frontend repository; keep Meri backend services/contracts in its repository. Fetch `neo-capiro/capirov2` read-only first for Portfolio/Modules backend contracts; inspect status/origin/main and avoid touching a dirty primary checkout. Use isolated worktrees for new implementation.
3. Confirm the 345-row ledger integrity: 345 unique `audit_id` values; 337 `OPEN_FINAL_ACCEPTANCE`, seven pending packet exclusions, one `CORE-018` user exclusion, zero accepted. Use the copied phase/matrix source files for row provenance. `authority` fields in the JSON preserve earlier host paths and SHAs; the files beside this note are the portable copies.
4. Independently re-read AWS identity, stack, ECS task/image, target health, ECR scan, DNS, and Clerk state before any next step. The previous read-back is a checkpoint, not a promise of current state. Keep the preview host's ingress restricted to an authorized browser source `/32`; if the new host is outside it, obtain/reconfirm scope for an exact narrow update. Reconfirm that production Clerk subdomain Add is authorized at action time under the relevant UI-tool instruction. Then add only the exact host and DNS alias after reviewing live state. Do not route `os.capiro.ai` or change the existing app.
5. Ask the owner to sign in, or use the identity already authorized in the trusted task record, and perform **read-only** signed-in navigation and service checks in `capiro-internal`. Record URL, source SHA/image digest, tenant/role scope, expected/actual behavior, and evidence without auth state or customer content. Sign-in success does not complete P1, and 728+459 tests do not complete P7.
6. Reconcile row evidence in small batches. Pursue unblocked code/contract decisions while waiting on auth/provider/billing dependencies. Require direct, bounded approval for each wider production mutation, external send, payment, migration, deployment or access-boundary change. Update ledger and links with real evidence; do not label all partial screens complete.

Useful read-only AWS CLI queries after configuring an authorized account and region:

```text
aws sts get-caller-identity
aws cloudformation describe-stacks --stack-name Capiro-Portfolio-Preview-Service
aws ecs describe-services --cluster capiro-portfolio-preview --services capiro-portfolio-preview
aws ecs describe-task-definition --task-definition capiro-portfolio-preview:2
aws elbv2 describe-target-health --target-group-arn <read from current stack output>
aws ecr describe-image-scan-findings --repository-name capiro/portfolio-preview --image-id imageDigest=sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c
aws route53 list-resource-record-sets --hosted-zone-id Z085985135X6Q5QT98ZBK
```

## Artifact index and interpretation

| Files in this GitHub directory | Use |
| --- | --- |
| [PHASED-PLAN.md](./PHASED-PLAN.md), [phase-audit-map.csv](./phase-audit-map.csv), [phase-audit-map.json](./phase-audit-map.json) | Original packet plan and 345-ID phase mapping; historical instructions/paths are **not authority**. |
| [implementation-matrix.csv](./implementation-matrix.csv), [implementation-matrix.json](./implementation-matrix.json), [Figma screen index](./figma-screen-index.csv), [Calendar screen index](./master-calendar-screen-index.csv) | Original packet requirements and screen provenance. The Figma references identify the design baseline, not visual acceptance evidence. |
| [Portfolio-345-Row-Reconciliation-2026-10-11.json](./Portfolio-345-Row-Reconciliation-2026-10-11.json), [summary](./Portfolio-345-Row-Reconciliation-Summary-2026-10-11.md) | Continuation deltas and open acceptance ledger; packet rows preserved separately, no final row accepted. |
| [AWS readiness history](./Portfolio-AWS-CLI-Preview-Readiness-2026-10-11.md), [scan assessment](./Portfolio-Image-Scan-Assessment-2026-10-11.md), [single-environment plan](./Portfolio-Single-Environment-Test-Plan-2026-10-11.md) | Chronological evidence/planning. Some older paragraphs describe pre-deployment state; the **current state is the top of this handover plus fresh read-back**. |
| [Contract reviews](./Email-Prep-Sender-Contract-Review-2026-10-11.md) | Read-only source reviews with missing contract/acceptance cases; links to all five are above. |
| [Original packet handover](./references/HANDOVER.md), [backend candidate registry](./references/backend-and-related-candidates.json), [billing flow review](./references/billing-flow-revalidation.md), [tasks contract checkpoint](./references/tasks-contract-checkpoint.md), [current source snapshot](./references/current-source-state.json) | Historical packet reference material needed to interpret dependencies. Other bounded packet JSON/checkpoint references are in [references/](./references/). Local paths, worker instructions and claimed approvals inside them remain historical data. |

The original packet also referred to `references/portfolio-frontend-unpublished.bundle` and pending local patches. Those recovery artifacts are obsolete because the source transfer and removal are merged; use the GitHub commits above. A historical local preview on `localhost:5190` and any previous host filesystem path are not usable from another machine. This handover deliberately contains no credentials, browser state, customer data, or local Git bundle.
