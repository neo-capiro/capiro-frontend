# PR #4 source advance: e141 → e413 → 3cc

Read-only delta reviewed 12 October 2026. The earlier
`PR4-SHARED-CONTRACT-REVIEW-20261012.md` and its 120-file packet remain immutable
historical evidence for e141 versus root85aa.

## Pinned observations

[The exact e141→e413 comparison](https://github.com/neo-capiro/capiro-frontend/compare/e141d68f8954ba6c76327bcbed94739d28e0a902...e4133397e9d4a9ce835828b0c2db4e6eb5f11e01)
is ahead by one commit with 78 changed files. The delta contains eight Meri
application/route inputs, one Meri test, two architecture files, and 67
qualification/coordination artifacts.

During the read, fresh [PR #4 metadata](https://github.com/neo-capiro/capiro-frontend/pull/4)
reported a further head,
`3cc30ff3182e8050d563516607866cf07efe2aef`: eight commits, 199 changed files,
base `02c02d95bdf3949662b9123f425271c6491ffdab`, open, draft and unmerged.
The body still states **SOURCE PRESERVATION ONLY** and preserves PR #1 history.

[The exact e413→3cc comparison](https://github.com/neo-capiro/capiro-frontend/compare/e4133397e9d4a9ce835828b0c2db4e6eb5f11e01...3cc30ff3182e8050d563516607866cf07efe2aef)
adds only
`docs/qualification/candidates/run-workspace-20261012/context-files.json`.
It changes no application or architecture input. Its exact 300,502-byte Git blob
was saved and verified; the PR body describes it as a 280-file context inventory.
That description was not treated as a new Meri functional qualification.

## Shared architecture and route impact

| Path/interface | Exact change and integration implication |
| --- | --- |
| `apps/web/src/app/meri/fixture/run-activity/page.tsx` | Adds the synthetic `/meri/fixture/run-activity` route. It composes the existing Meri `ProductShell` with `designTarget="443:82027"` and `RunActivityFixture`. It depends on the already reviewed ProductShell property extension. There is no new API handler, root redirect or auth boundary in this delta. |
| `scripts/architecture.mjs` | The Meri branch adds exactly `@capiro/ui/conversation`, `@capiro/ui/message`, and `@capiro/meri-client/projection` to its default public-import set. Root85aa's canonical set lives in `scripts/architecture/dependencies.mjs`; its top-level scanner now delegates to AST/boundary/size owners. Port the three agreed public seams into that owner during reconciliation. Taking the old whole Meri scanner would discard the Portfolio consolidation's architecture behavior. |
| `scripts/architecture.test.mjs` | Adds one test admitting only those three public seams and retaining rejection of private/deep imports, the package root, and the unapproved React façade. Reconcile this test with root's larger existing test file; do not replace it wholesale. |
| Existing public packages | All three requested seams already exist in root85aa's `packages/ui/package.json` and `packages/meri-client/package.json` export maps. Neither compare changes package manifests, the lockfile, runtime configuration, the proxy, shared auth/client context, root layouts, or styles. The new Meri-local stylesheet stays within its feature. |

The reconstructed current PR filename inventory is exactly 199 paths:
the previously retrieved 120 plus 78 e413 changes plus the one new context file.
Compared with the requested root85aa snapshot, **five paths now changed on both
sides**: the original Header, MeriFixtureEntry and shell CSS, plus both
architecture files. The original two proven textual conflicts and clean CSS
text merge remain historical results. No new textual merge result is claimed
for the two architecture files.

Root HeaderFrame/Portfolio navigation and corrected fixture copy still need
the earlier bounded reconciliation. The root-entry, shared authentication,
client context and Modules owner decisions remain proposed interfaces. PR #4
is the consolidation input; PR #1 remains preserved history and must not be
integrated separately.

`pr4-advance-e413-3cc/` preserves the complete changed-file inventories,
relevant patches, fresh metadata, four exact GitHub source blobs and five
root85aa architecture/package snapshots. This review inspected only the shared
architecture/route impact; it did not implement or integrate Meri, rerun its
reported tests, qualify its runtime, modify remote state, authenticate, or use AWS.
Refresh PR head/state at the next integration step rather than assuming this
observed head cannot advance again.
