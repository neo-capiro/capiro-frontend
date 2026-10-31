# Newsletter parity: reviewed source handoff, 31 October 2026

Source is independently accepted and ready for publication with the final
metadata and documentation commit. This is not a deployment or acceptance
receipt. Earlier implementation handoffs remain in Git history.

## Exact custody and scope

- Repository: `neo-capiro/capiro-frontend`, integration branch `main`.
- Worktree: `C:/dev/fe-newsletter-parity-20261031`.
- Branch: `hermes/newsletter-figma34-parity-20261031`.
- Accepted source: `8fe393504bf51fb5910c0ae730625aeba6ea8e62`.
- Accepted source tree: `ab511b03d2e1aece7bd06d6e369c8ce0befa75ab`.
- Integration/test base: `6d1465cf903b7a85bc716590eacc33dc2a81c570`.
- Source commits retain original history: `d54e4904e` implements parity and
  corrections; `8fe393504` removes eight unused prop-plumbing lines.

The original nine staging pathspecs expand to eleven files: six newsletter
source/style files, two browser specs and these three docs. The user explicitly
approved only `scripts/architecture/reviewed-size-findings.json` as an additional
file, limited to seven independently accepted records. Final scope: twelve
files. No other source, shared shell, backend, lockfile or configuration change.

The six dirty PNGs in `docs/meri-chat-first-20261030/screenshots/` are unrelated.
Preserve their bytes and never stage them. Stage only explicit owned paths;
never use `git add -A`. The old server on port 5197 is unowned: do not kill it.
Completed owned tests used port 5207 and all owned handles are closed. The
retained scoped stash is historical evidence, not unapplied work.

## Independent review and final corrections

Independent Codex `/root/lane5_review` accepted the exact source above and all
seven responsibility fingerprints. The metadata identities are Workflow file
and NewsletterEditor function, Comments function, SelectTemplate function,
Staging file and StagingSelection function, and the scoped CSS file. Four
existing records are replaced and three added. No blanket size exemption.

The accepted source preserves guarded Workspace exit, makes Modules a static
breadcrumb, restores subject/preheader review, and makes Drafts/Saved tabs
navigate to canonical Workspace/Templates owners instead of an incomplete
inline library. Shared Tabs owns keyboard behavior; one review query feeds
comment counts and rows. Narrow layouts fit at 390px. Save, staging, receipt
recovery and authorization stay with their existing owners.

`README.md` records the Figma frames, visible `NL/*` layers, geometry and
responsibilities. `PR-BODY.md` includes the complete deliberate deviations and
measured checks, ready for publication.

## Completed checks and baseline disposition

Evidence lives in the delivery orchestrator's `work/newsletter-finish-20261031/`;
immutable review reports are in its `outputs/`.

| Check                            | Actual result                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------- |
| Final TypeScript                 | Exit 0 at accepted `8fe393504`                                                    |
| Touched ESLint/Prettier          | Pass                                                                              |
| Corrected parity cases           | 5/5 pass; exact behaviors listed in PR body                                       |
| Existing staging and atomic save | 33/33 pass                                                                        |
| Focused browser set              | 47 pass / 5 rich failures, same five on untouched `b9eb11fa`                      |
| Asset/brand/provider families    | 48/48 pass                                                                        |
| Delivery/receiving               | Same 13 failures on candidate and untouched `6d1465cf`                            |
| `test:capiro`                    | Candidate and base: 843 pass / 15 fail, seven failed suites                       |
| Full lint                        | Candidate and base: 14 errors / 93 warnings                                       |
| Full format                      | Candidate and base: exact same 114 flagged paths                                  |
| Architecture                     | Seven touched records reviewed; same 140 unrelated blockers and 11 errors as base |

The earlier missing-family run had 51 passes and 14 failures, including mobile
overflow subsequently fixed and covered by the five passing parity cases. No
assertion was weakened. Reuse unaffected checks without broad reruns.

Four `final-captures/` images were inspected against retained Figma exports.
They establish scoped layout with documented deviations, not pixel-perfect
identity or live functionality. Final verification preserves eight accepted
source/spec blobs, six unrelated PNG hashes, exactly seven changed metadata
identities and exactly twelve PR paths.

## Publication, release and acceptance

Publication and merge are authorized after exact review/scope checks. Push the
existing branch and use `gh pr create --body-file` with `PR-BODY.md`; preserve
history. Refresh main and remote PR/check state before merge. Behavior-affecting
drift requires independent review and appropriate checks.

The existing CODEX Release chat `01a17ae6-0f6a-73c2-8fe8-3d79c44a3051` is sole
cloud/build/deployment owner. Queue the immutable merge through its existing
pipeline; Meri has first priority on a shared builder. No competing build or
replay of DNS, credentials or migrations.

Before production UI checks, obtain Release's actual serving source ancestry,
immutable image digest, task definition and healthy UTC handback. The user has
authorized five read/local-state checks on one new owned page in the existing
restored Chrome session, with naturally bound Neo/capiro-internal identity and
role. Record baseline before/after and close only the owned target.

1. Inspect template geometry, filters and gallery.
2. Apply a preset to local editor state only.
3. Inspect builder columns and responsive controls.
4. Open Preview and inspect review tabs/comments.
5. Open the unsaved Stage dialog without submitting.

No save, stage submission, send, provider write, login, organization switch,
browser restart or other owner's page. Full saved-version 760px-dialog
acceptance requires read-only binding of one existing eligible user-owned
synthetic draft/version. If none is bound, report that criterion not run; do not
create a fixture. A canary request does not authorize an outbound recipient.

Return exact PR/merge, serving tuple, per-criterion results and remaining limits.
No feature is Done from source review, local tests or a build alone.
