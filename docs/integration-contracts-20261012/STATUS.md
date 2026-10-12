# Shared frontend integration — exact-source qualification complete

[Draft PR9](https://github.com/neo-capiro/capiro-frontend/pull/9) is the active integration, based on preserved PR8. Application source is `2d50edd8f3c5ea232db8e1338566f0667db4b4bd`, tree `d7986d01b5f5aca3a8e4c824556315a82b692e92`, application tree `faf8af48ba71d9152cbd2e2010ddb950fd8e2bfb`. Subsequent evidence-only publication does not change those application bytes.

## Completed qualification

[The exact-source report](QUALIFICATION-2d50edd.md) records a clean 847-package install, combined source/type/lint/format/architecture/public-package gates, 58 root / 1,141 application / 94 gateway / 21 transport tests, one production build, 929 Portfolio and 120 Modules browser passes, 15 fresh Elements passes, actual standalone/Meri audits and unchanged reviewer controls. Both full browser suites have zero failed, skipped or flaky cases. Failed launcher and historical failed/interrupted attempts remain available with their original receipts.

The separately accepted f4e9e1f checkpoint and [its evidence](QUALIFICATION-f4e9e1f.md) remain intact. The coordinator relayed independent bounded acceptance of that application tree. The coordinator has now also relayed an [independent bounded PASS for exact 2d50edd](INDEPENDENT-REVIEW-2d50edd.json): 40 browser and 13 unit cases, types/architecture/public packages, no new blocking findings. Two reviewer fixture-setup failures and fixture-only corrections remain explicitly recorded. This does not accept broad visual/native/image criteria.

## Preserved integration and bounded additions

One Next `apps/web` application serves Portfolio `/`, compatibility `/portfolio`, Meri `/meri`, Modules `/modules`, Settings `/settings`, existing deep links, calendar, sign-in, health and narrow API routes. Shared HeaderFrame and mode navigation preserve Meri assets and Modules presentation. One auth/session/client boundary cancels obsolete requests and clears editors/caches on identity, organization and client replacement. Browser selection never grants backend authority. Portfolio Core/Intel, Modules fixed operations and Meri public contracts remain separate interfaces.

The original three Portfolio defects have failing regression baselines and fixes: normalized Intel acceptance and explicit partial rejections, requested-code acknowledgement copy, and a visible disabled Core-404 preference entry that makes zero Intel calls. Meaningful original tests, feature files, root lockfile and Portfolio historical archive survive. Meri PR4 retains PR1 ancestry. Modules' existing CommitmentView is unchanged; Quicklog Commitment/Weowe/Theyowe/counterparty UI remains excluded by the current owner instruction.

Published bounded contracts add selected sender, ordered owners, memory wording, generic follow-up, prospect Files/manual Workspace, saved Newsletter staging, effective-date Calendar and existing Objective destinations. The latest change opens only existing Strategy, explicit-client Planner tasks and explicitly selected saved Workspace revisions. Each open/reload/history/recheck resolves current owner authority; bound views do not mount ordinary editors or invent creation/association/write fallbacks. See [the implementation scope](OBJECTIVE-WORK-DESTINATIONS.md).

Durable local recovery retains original command keys and bodies with current-scope validation. It does not protect against same-origin script/profile access or invent cross-device recovery. Prospect draft PATCH and snapshot remain separate operations without invented CAS. Provider sends, generation and other unavailable actions remain unavailable.

## Acceptance and release work still open

[The active ledger](PORTFOLIO-337-ACTIVE-LEDGER.json) retains every historical ID: 337 in-scope rows and eight prior exclusions. Full/native accepted rows remain zero. [Thirteen scoped Figma comparisons](VISUAL-ACCEPTANCE-2d50edd.md) map to 53 rows and record concrete component passes, partial matches and explicit failures. Ordered-owner dialog presentation and other documented visual differences remain open. Related executed tests alone are not row acceptance; unassessed frames remain marked as such.

The independently accepted backend composition is pinned at PR2406 `243248e726243c44bd4b9d24fd1ed220da18c56a`, tree `d8f01afa7eca0e6571e7ed3669905fea3491bbdd`. [Source compatibility](evidence/backend-243248e/FRONTEND-COMPATIBILITY.md) verifies 194 manifest entries, nine migration entries and 19 candidate ancestors. Corrected Workspace migration paths remain unapplied. Native PostgreSQL/RLS/role/MVCC/client-grant lock-order, real Clerk/provider qualification, full Cleanup and unpublished Engagement reporting remain open.

[The exact image-build proposal](IMAGE-BUILD-PROPOSAL.md) is prepared for the designated shipping session. It includes reproducible archive metadata, recipe hashes and a single-build request template. The last local official Alpine index probe returned proxy 403. No image build/push, main merge, deployment, AWS resources/credentials/security/database changes, provider messages, billing or paid workloads have occurred. Shipping requires its designated review and authorization after the applicable gates.

## Source provenance

- Main: `02c02d95bdf3949662b9123f425271c6491ffdab`.
- Portfolio implementation: `abaeab37b36d60b3e5185755e1b2c9169d7c92f3`; full owner archive: `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0`.
- Meri PR4: `3cc30ff3182e8050d563516607866cf07efe2aef`; PR1 was not separately integrated.
- Modules PR5: `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a`, preserving implementation `e717867300e8568d467ac1cc9a54cab6540f4312`.
- Preserved PR8 base: `d393f08a551f00ee507636264a01657ff0f64655`.

Feature owner branches and original mounted repositories remain untouched. No resets, force pushes, branch deletion or duplicate rebuilds were used.
