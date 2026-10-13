# Preview configuration and bounded visual acceptance

This successor removes production API/Clerk fallback from the proposed preview configuration and corrects the Modules Hub against the current Figma 3.1 frame. Qualified PR20 source/evidence remains preserved. This is a bounded source and local-render acceptance batch; all **337 native Portfolio rows remain open**.

Source: `e63de78f394209de3fbd045a13cc06e1f8c5a8c3`; root tree `5af5f7c0239fc68fc1a4f2b437e815635c173d50`; application tree `7c5764d859f348256d5a0f8308e5a81d2783d2ce`. Branch: `integration/capiro-preview-visual-20261013`, based on PR20 publication `890a993a26dcee66ca3190ee6af4611e33171240`. The complete prior qualification remains bound to `e837b3341e7c31dd8b349438c7d9c5086fa4eb0e`, documented in [its preserved report](../workspace-brief-copy-20261013/qualification-e837b334/README.md). Later evidence publication does not change this application source.

## Preserved input heads

The final read-only remote refresh found these unchanged heads; each remains an ancestor of the successor. No original branch was rewritten.

| Input | Exact head |
| --- | --- |
| Frontend main | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Portfolio continuation | `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` |
| Meri frontend PR4 | `3cc30ff3182e8050d563516607866cf07efe2aef` |
| Modules PR5 | `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a` |
| PR20 publication | `890a993a26dcee66ca3190ee6af4611e33171240` |

## Changes and ownership

The Modules Intelligence card now uses the authored 646px width at a 1440px viewport. Four card SVGs retain their native 24px geometry; their immutable asset bytes remain exact. The missing 16px information mark has a 24px keyboard target and a readable explanation. An optional PageHeader title accessory preserves the original markup of every caller that does not supply it. The adopted Tooltip/Trigger and Radix Portal/Content/Arrow share their native context; the feature-owned portal container keeps the explanation within the existing main region. Feature CSS supplies its effective surface and stacking. No copied vendor implementation or dependency/lock change is included.

The UI package exposes its existing Tooltip entry. Architecture approval adds only that exact public entry, with a positive public-import control and three private-path rejection controls. Existing guard rules, meaningful tests, source lanes and branches remain preserved.

The local `preview-config.mjs` accepts only an explicit closed public-metadata record: Test Clerk issuer/application ID and three designated preview ARN references. It returns a proposal, validates all nine exact configuration parameters and refuses omitted/unknown/duplicate parameters, `UsePreviousValue`, production values, credential-valued inputs and ambient environment fallback. It never reads secret payloads or calls a service. The CLI works through physical and symlinked worktree paths.

The deployment template restricts Core, Workspace and Intelligence to `https://portfolio-preview.app.capiro.ai` with their distinct `/api`, `/workspace-api` and `/intel-api` paths, fixes Tracker ownership to Intelligence, and keeps Strategy, Onboard and Meri unavailable. Existing IAM/network/security resource definitions and secret-reference statements remain unchanged; only reviewed configuration constraints and explicit held-service environment values change. This is not a complete apply request or proof of installed Test Clerk metadata/payloads.

The governing backend proposal is [PR2483](https://github.com/neo-capiro/capirov2/pull/2483), refreshed at `0f1e663d5c23ed3f6f02bde801da8f5bb3f8ccba`: three backend services remain held at desired count zero. Meri owner [PR65](https://github.com/neo-capiro/meri-greenfield/pull/65) was refreshed at `efacbfd9b599e458250f9bb624a72626f4e769d2`. Frontend public contracts remain **0.1.3**; receiving review/adoption of 0.1.4 is not part of this batch.

## Exact-source checks

| Gate on e63de78f | Result |
| --- | --- |
| Root local controls | 106 passed; zero failed/skipped |
| Types and public-package checks | Passed |
| Focused lint and formatting | Passed; zero lint errors/warnings in checked files |
| Architecture | Zero errors/blockers; 488 signals, 466 reviewed, 22 inherited unreviewed |
| Focused browser cohort | 22/22, one attempt each, zero retries/skips/flaky/report errors |
| Fresh corrected Modules compositions | 5/5: 1440/390 light and dark preference, 320px reflow |
| Production build | Passed in 55.19 seconds |
| Actual standalone server | Passed in 10.24 seconds; 30 observations, zero page errors |

Every final gate records the same source before and after execution. The focused cohort covers seven new Modules geometry/tooltip cases, eight existing primary Module routes, three existing cross-mode/history/session/client controls and four existing full-default home axe cases. The actual server uses no credential, fixture identity or service interception; its four ancestor dependency paths are absent. It exercises canonical/compatibility/deep links, setup/unavailable responses, shared navigation and browser history. It does not exercise native sign-in or prove backend isolation.

A new clean install, full transport/unit suites, both complete browser cohorts, container/musl and deployed gates were deliberately not repeated for this bounded change. Their prior qualification remains at e837; no old full-suite count is presented as a new-source pass. The new build was warranted by the shared public Tooltip entry; the failed description checkpoint's earlier build is preserved separately.

## Figma and accessibility evidence

Fresh contexts and exact returned target images cover Portfolio `411:41421`, Meri Home `442:81437` and Modules Hub `411:93787` in file `Zc2dEN5aLU47dVdsewDmiJ`, under the 3.1 page. The target images are the returned 1024×740 rendering of authored 1440×1040 frames. Direct full-resolution screenshot URLs returned 403; full-resolution pixel parity is not claimed. Published context copies omit temporary asset URLs; exact returned PNGs and provenance hashes survive.

Before changes, the preserved qualified application completed 15 fresh composition captures: each home at desktop/phone light/dark preference plus 320px reflow. The root inspected desktop and phone renders; native asset dimensions, loading, overflow and real keyboard focus were retained. All three 320px cases ran full-default axe with zero violations and retained incompletes. Synthetic data, visible unavailable states and authorized additional destinations explain content differences from Figma; no backend counts or identities were invented. Final-source Modules repeats all five closed compositions and all five open-tooltip interaction variants. Independent asset review covers 25 unchanged assets. Modules retains its existing light palette under dark preference; this is not a new dark-theme implementation.

An independent reconciliation of 32 existing e837 cases resolves the old R1–R3 captured contrast/name follow-ups without rerunning qualified suites: 186 recomputed contrast records, minimum 6.155:1, and 42 focus records. Those findings apply only to their captured states.

A separate fresh Workspace review uses the preserved e837 harness: four variants at 1440/390px and light/dark preferences, 44 sequential focus records, Undo/Redo and Bold/Italic/Underline behavior. Undo's conservative contrast minimum is 19.798:1; Save copied tab's is 15.523:1. The original two contrast and five name axe incompletes per report remain in raw output and receive bounded manual disposition; no rule is suppressed. Both preferences render the existing same palette. All 394 harness files, 67 embedded Workspace sources and seven helpers remain exact. No Save/Core/external operation was sent. This is neither a new Workspace source qualification nor screen-reader speech acceptance.

## Preserved failures

The three original Modules assertions failed against the qualified baseline: 624px instead of 646px, four 18px instead of 24px SVGs, and absent information control. Their corrected geometry/control checks passed.

Independent opening review then found ineffective tooltip utility styling. The expanded cohort preserved 17 passing cases and five open-portal axe failures; five explicit surface baselines also failed. Opaque feature CSS corrected the surface. A named-aside experiment passed earlier checks but failed all five strengthened exact-description controls at `62c5e26c`: only the landmark name was announced. That checkpoint passed its own build/runtime but remains failed. `96d20dcc` restored description text but retained five default-axe region failures; no production build was run for it. Intermediate unqualified edits are preserved in history. The final existing-main portal removes the failed composition. The full explanation, native ID relationship, surface, geometry, Escape/focus and unfiltered axe assertions remain; only the experimental complementary-landmark assertion was replaced by actual main containment.

The first four Workspace probe cases reached passing contrast/names/Undo–Redo checks but assumed toolbar focus remained after the editor's intentional `focus()` call. Both probe versions and traces remain. The corrected probe reacquires each control using real sequential Tab and passes four cases without changing application source or weakening assertions. The preview CLI symlink defect and initial template control failure are also retained alongside the correction. Initial lint command-path, formatting and missing exact Tooltip architecture allowance failures remain separate from final passing gates.

## Remaining acceptance and owner work

All 337 native rows remain open. Full Figma parity across the complete product, manual assistive technology/touch behavior, native authorization/RLS/revocation, durable transaction/recovery/provider behavior, Office fidelity, container/musl and deployed write E2E remain unrun or unresolved. This batch does not narrow those criteria.

The next native preview batch requires backend/shipping owners to provide reviewed public Test Clerk bindings and independently establish payload, issuer/audience, routing/data/identity isolation and zero-count activation prerequisites. These inputs are not available here. Public 0.1.4 receiving work must start from a published reviewed contract/artifact rather than PR metadata. No AWS action, auth implementation/security resource change, secret installation, database operation, production merge, provider message, billing or paid model workload occurred.

## Evidence

The portable evidence packet retains raw failed/passing reports, screenshots, traces, source receipts, Figma provenance and independent reviews. Generated bundles/builds/caches and duplicate base64/temporary-URL originals remain local and are explicitly excluded; they are not silently replaced. See `EVIDENCE.json`, `MANIFEST.json` and `PARTS.sha256` for exact hashes and member counts. Reassemble the parts in an empty review directory, check their hashes and the archive hash, then extract with a standard tar reader. The original evidence remains preserved in the execution environment.


The archive contains **1,040 regular files**, 187,860,555 uncompressed bytes,
and two recorded symbolic links that are not followed or recreated. The archive
is 140,033,841 bytes in six parts, SHA256
`911426f23796d62da3b1803dfd3ae16c2ef64185324dfe6d586afb638c106d94`.
Manifest SHA256:
`8df8496cf4e8ed2c530dee40ee39f6204610c69dc044bba71259cfbf7da6a29d`.
Every published member was read back and every original file rehashed; the
reassembled parts match the archive. File-mode restoration is not claimed.
The separately copied [packaging review](packaging-review/REPORT.md) reviewed
the helper before execution.

```sh
sha256sum -c PARTS.sha256
cat evidence.tar.gz.part-* > evidence.tar.gz
sha256sum evidence.tar.gz
mkdir evidence
tar -xzf evidence.tar.gz -C evidence
```
