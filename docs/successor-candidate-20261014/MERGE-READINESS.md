# Later merge readiness and exact preserved sequence

Candidate runtime/test source: **`6eeac2b95f5775447e9dd8ec25b9c556686d39e4`**, branch `integration/capiro-successor-candidate-20261014`. This dedicated branch includes every exact PR26–32 head by ordinary ancestry. Its publication adds qualification documentation only. Do not cherry-pick or replay these fixes again. No merge, retarget, draft promotion, deployment or AWS build was performed.

Frozen PR25 head `257cf5b5db673b31c98264f9da33759c68066ba4` and shipping source `5ca42049325881782bc9d2ac557450d642eccee8` remain unchanged. Deployment reports belong to the shipping owner; no live/image acceptance was performed here.

## Inspected GitHub state

At inspection, PR25–32 are drafts, `MERGEABLE` and `CLEAN` against their current bases. Their `reviewDecision` and head `statusCheckRollup` are null: there are no reported hosted checks or approval decisions. GitHub Actions workflows: zero. Repository rulesets: empty. The current token receives HTTP403 `Resource not accessible by integration` reading classic main branch protection; GraphQL protection read is likewise forbidden. Thus exact required checks, approvals and branch-protection policy **remain unverified**, not absent or passed. This harmless read was denied by GitHub integration permissions, not automatic approval review. No wider permission was requested.

Default `main` was `02c02d95bdf3949662b9123f425271c6491ffdab`. A local `git merge-tree --write-tree main candidate` is conflict-free and returns the exact candidate tree `7d889e643a070021f9376d92136a9fa1d4e9a270`. This proves source integration at inspected heads only; it does not authorize merging or establish protection/review/native readiness.

## Sequence for the release owner

First integrate/verify the existing foundation through PR25, preserving reviewed donor history and inspecting overlaps. PR25 currently bases on PR24 `23df0b04fe643ba7ab64395d7a471ddb20172db6`; do not treat PR25 as a direct main-only delta. Then use history-preserving merge commits in this order:

| Order | PR  | Exact publication head                     | Current base |
| ----- | --- | ------------------------------------------ | ------------ |
| 1     | 26  | `348bf98481268a5f06e26a924f0985b242265cbb` | PR25         |
| 2     | 27  | `4465f5f1cfb1b807c97106433b70a0ccd480c4a2` | PR26         |
| 3     | 28  | `38c53fb0c8f05f598d835122c0ce7fd0f30a04fc` | PR27         |
| 4     | 29  | `247de58f00a1fea50c25a3400463103885014f4f` | PR28         |
| 5     | 30  | `93ad8792a95bfc1a15a691c608b5fe98f0ca7956` | PR29         |
| 6     | 31  | `3059abec94e2d6b9790758bb9563afdb8091b143` | PR30         |
| 7     | 32  | `6eeac2b95f5775447e9dd8ec25b9c556686d39e4` | PR31         |

After each predecessor merge, retarget only its successor to the actual receiving branch; inspect the reduced diff, source ancestry and any required checks. Do not merge missing-predecessor deltas, squash/rebase away the exact reviewed history, or duplicate the consolidated branch after the stack has merged. The consolidated branch is one source/qualification reference for the entire successor, not an additional patch requiring another implementation PR.

Before any later release, a repository owner must read classic protection with appropriate existing access, identify actual required reviews/checks, and obtain release authorization. Local qualification cannot be represented as hosted required checks. Requalify if source, dependencies, integration tree, configuration or build input changes. Select and qualify a successor image separately; leave frozen PR25 image/source untouched.
