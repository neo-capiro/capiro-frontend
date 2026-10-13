# Capiro integration — e837 source qualification

The combined source passed the fresh install, canonical checks, production build, actual-server checks and both complete browser cohorts. Independent runtime and raw browser audits passed. This is source qualification; native acceptance and shipping remain separate gates.

The combined application source is `e837b3341e7c31dd8b349438c7d9c5086fa4eb0e`, root tree `742bba63f01e67d3f4601166085c4fcd3b044a1c`, apps/web tree `91e226f6286ae5af91b49e929e36474687bc7287`, production source tree `9cb4e5c29b3957a6325d34c104eefcd49f439d15`. It is published to [draft PR20](https://github.com/neo-capiro/capiro-frontend/pull/20). All 337 native Portfolio rows remain open; zero accepted.

## Integrated source references

The preserved frontend source heads last refreshed at 20:41 UTC were:

| Input | Exact head |
| --- | --- |
| Main | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Portfolio continuation | `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` |
| Meri PR4 | `3cc30ff3182e8050d563516607866cf07efe2aef` |
| Modules PR5 | `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a` |

All four are ancestors of this integration. The Portfolio handover at `c953bc08a9cabc6e38fdacd019017d2e891a3284`, Modules handover at `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a`, and Meri frontend context at `c57b7d26df7de2acbd8c7d8edc7098f7d495053a` were read before integration. Portfolio implementation came from its published feature continuation, not documentation-only PR7. The final read-only refresh and ancestry proof are preserved in `FINAL-INPUT-REFRESH.json`.

The governed backend references remain separate from the frontend merge:

| Interface/reference | Exact source |
| --- | --- |
| Workspace/Core receiving contract, PR2472 | `e0446e3f865899b03d654657db903cea54dfaf0a` |
| Meri public interoperability baseline | `93845774d352fc9a0ad12cc7bc8bd3d4612a322c` |
| Meri owner PR63, public contract unchanged | `693372018f3aaaf01a5be11e5df9f797926888f8` |
| Cached regulatory comment-calendar contract | `46aa2164c299151225c6cdb9f3cc565fee347657` |

Meri public contracts remain `0.1.3`, tarball SHA256 `dc1a4c09b0e5f1f6b09f9df1ce2846b24b24abe401c84a8f448c3e58d585ad1b`. No private lifecycle interface or activation is inferred from the later Meri owner source. Current PR metadata is retained in `REMOTE-PR-REFRESH.json`; mergeability is not qualification.

## Scope and preserved boundaries

One Next apps/web application composes Portfolio `/`, Meri `/meri`, Modules `/modules`, Settings `/settings`, `/portfolio` compatibility, existing deep links, Calendar, sign-in, health and narrow backend routes. Shared HeaderFrame, Meri home/cited-answer assets and all-mode navigation survive. One application session/client boundary clears old caches/editors and cancels old subscriptions on user/session/org/client replacement. No selection, loading, verified client and unavailable remain distinct; browser selection never grants backend authority.

The integration deliberately resolves Header.tsx and architecture scanner/test collisions. Modules sibling-host assumptions were adapted to the canonical shared app, retaining the union of meaningful architecture rules. Core and Intel transports, Modules fixed operations and Meri public contracts remain separate. Original Meri PR4 preserves PR1 ancestry and was integrated once. No legacy backend agent implementation was copied.

The earlier Intel watchlist normalization/explicit partial-rejection defect, phone requested-code copy and Core-404 disabled preference/no-Intel defect have preserved failing baselines and passing corrections. The successor adds governed Meri conversation receiving, Activity-to-Outreach linkage, Calendar Day, five native funding deadline rails, selected-range cache-only Federal Register comment deadlines, and independent Workspace copies of exact saved Core brief versions.

Workspace copies are independently editable and pinned to the exact saved Core version being viewed; the frontend does not write back to Core. The UI consumes four published native operations, validates actor/tenant/client/source receipts, preserves complete ordered body JSON and keeps original source evidence separate from edited text. Atomic association/body/version/replay enforcement remains backend-owned. Submitted uncertain intent is retained for explicit recovery under the same scoped browser journal and cross-tab execution lock; an old receipt is followed by fresh current reads. Bound tabs stay outside legacy mutation/restore paths. Ordinary/manual and Newsletter saves retain their separate non-atomic limitation. Rich section controls are available; nonsection structures are edited as full JSON, and preview remains section-only. Unsubmitted edits remain local rather than durable autosave; whole-draft history is read-only while a bound copy is present.

## Completed exact-source gates

Fresh npm ci installed 854 packages from unchanged manifests/lock/vendor bytes. Canonical check passed: 100 root, 84 transport, 2,129 web, 442 Capiro, 385 Newsletter and 8 declaration controls; public packages, types and formatting passed. Lint: zero errors, 82 warnings. Architecture: 488 findings, 466 reviewed, 22 inherited unreviewed, zero blockers/errors. Architecture rules retain their thresholds; the one Calendar assertion adaptation is documented below.

Cross-repository: 13; Elements: 15; public Newsletter browser: 116 renderer plus 130 receiving controls. The production build completed in 55.48 seconds. The actual standalone server passed 30 observations, 179 served Newsletter asset byte/hash comparisons, 23 further HTTP checks, six Onboard assets and two viewport/history checks. Four borrowed ancestor dependency paths were absent during actual-server execution.

Post-install Workspace focused browser: 12/12. The current Calendar disclosure correction passed both Files/Calendar focused controls (2/2) before installation. These are subsets/control runs, not additional unique full-suite cases. Full shared: 399/399, every discovered case exactly once, no retries/skips/flaky results/report errors. Full Portfolio: 1,278/1,278 across shards 322 + 322 + 320 + 314, every discovered case exactly once, no retries/skips/flaky results/report errors. Independent review reconciled all raw reports and ten source-bound discovery/shard receipts. The original timeouts remain: shared 399 × 30 seconds; Portfolio 1,274 × 30 seconds plus four existing 90-second slow cases.

The shared browser cohort includes cross-mode navigation and Back/Forward (`integration.spec.ts`, Meri navigation), org/session replacement and sign-out (`session.spec.ts`), idle expiry and held responses (Meri lifetime/workflow), tenant/client replacement and interrupted writes (Newsletter, Prospect and Workspace), and desktop/mobile accessibility/layout controls. These are synthetic browser fixtures. The standalone checks exercise the compiled app with external integrations unavailable; neither cohort proves native backend authorization, transaction behavior or provider delivery.

## Preserved failures and corrections

The `6034d5b4` checkpoint completed shared 399/399 and Portfolio 1,277 passing cases with one failure: an obsolete Calendar assertion expected the former fixed 50-record disclosure after the feature deliberately adopted selected-range, paginated regulatory dates. All 1,677 discovered cases ran exactly once without retries/skips/flaky results/report errors. Portfolio shards 3/4 were findings collection after the original gate stopped, and this checkpoint remains failed. Its original trace is retained. The corrected test explicitly checks cached-source dates, incomplete coverage and read-time-not-publisher-freshness on the regulatory status. Every other byte in that file and all other 19,733 tracked path records are unchanged; this is a documented semantic assertion adaptation. Production source is unchanged.

The first Workspace candidate failed lint because test setup names resembled React hooks; seven identifier-only replacements preserved all assertions. Compact identifier disclosure exposed a real mobile toolbar focus clip; three scoped CSS lines restored native scroll clearance, with failing geometry and unchanged passing assertions preserved.

At `0e9cdc3a` the shared browser run had 380 passes and 18 failures/timeouts caused by Playwright fake Intl interacting with the Temporal polyfill. Three date fixture sites now freeze Date.now and default Date construction without replacing Intl or timers. Every one of the 159 existing affected assertions/events remains intact. The clock correction passed 45/45 focused cases at `6034d5b4`; that historical control run is separate from the e837 full gate. The same candidate's Portfolio shard was stopped cleanly for low storage: 98 passed, two interrupted, 222 unattempted. Those results remain separate from the successor's complete gate.

The tool session handle disconnected during the final Portfolio shard, while the original driver and test process continued. No gate or shard was restarted. All eight original source-bound shard receipts record exit zero and both complete aggregates reconcile. The original producers later closed; the unavailable top-level tool-session exit status is not fabricated.

Earlier successor build/module-resolution, fixture typing/import/formatting and protective storage failures remain in the evidence packet at their original status. The final candidate has its own fresh installation, check, completed production build, runtime and browser receipts; historical passes are not substituted. Inactive historical dependencies were losslessly archived and read back before retirement. A transient inaccessible shell caused one safety refusal before cleanup; a fresh complete inventory/process check then passed. Later fresh installation used the owner's explicit permission to replace reproducible packages; actual logs and source/lock/branch evidence remain preserved. During the final browser run, the separate inactive Newsletter installation was retired under that same authorization after source/lock/vendor/branch and borrower checks. Its installed lock remains preserved; two historical fixture aliases require reinstallation before future execution. The current app installation and all recorded source state remained unchanged. The initial sandbox process-visibility refusal caused no mutation; the unchanged cleanup passed with approved visibility.

## Limits and next owner work

All 337 native rows remain open. Backend Workspace owner reports 19 native controls passing after restoring the existing ws_source_action fixture prerequisite; product source/receiving contract did not change. This report does not independently reproduce that native gate or establish its sealed cleanup/catalog evidence.

The preserved Figma structural comparison at `93b3617f` covers Meri Home, Portfolio overview and Modules Hub at 1440×1040 using synthetic Portfolio/Modules fixtures and the compiled disconnected Meri Home; later follow-up captures carry their own source and synthetic-fixture provenance. Those bounded historical comparisons remain historical rather than claiming new complete pixel parity.

Current desktop/mobile Workspace axe reports have no violations but retain two contrast and five label/name incompletes per viewport. Full Figma parity, manual assistive technology, native authorization/RLS/revocation, Office fidelity, live workflow activation, container/musl qualification and deployed write E2E remain open. The historical clock-focused evidence retains six unconfigured agenda-feed fixture HTTP 500 console observations; these are not native server results or a total for every later browser run.

portfolio-preview.app.capiro.ai is the single eventual preview hostname. Existing deployment defaults are production-bound; a separate hostname does not prove backend/Meri/database/auth isolation. Shipping/backend owners must establish isolated routing/data and separate automation/manual identities before native write E2E. No main merge, image/deployment, AWS operation, new credential/resource, security/database change, real provider message, billing or paid model workload is included.

## Portable evidence and reproduction

This documentation publication preserves the qualified application source unchanged. The qualified code commit is `e837b3341e7c31dd8b349438c7d9c5086fa4eb0e`; the later documentation commit is not described as a separately rebuilt source.

The archive contains **2,887 regular evidence files from 55 selected roots**, plus its embedded manifest: original failed runs, corrections, complete final reports, screenshots/traces and independent runtime/browser reviews. Five symbolic links are recorded as metadata and are not followed or recreated by extraction. The full generated build, Elements and historical dependency archives remain separately preserved in the execution environment, identified by their hashes and restoration manifests; this packet is portable evidence, not a complete executable environment backup.

The archive is **151,131,241 bytes**, SHA256 `3a44a2dc684ae5ec496fde85839b4f3dde5da5a2098edddf8e414d49242d0ea9`. Its manifest SHA256 is `e0d9156bbc46d99a8bc19559402498b14be29603330486cb0338ddacf6babab4`. Every member's content and recorded metadata was read back, the exact member set was compared, and a fresh original inventory matched at sealing time. All originals remain preserved.

The files are split into seven parts of at most 24 MiB for publication. In a new review directory containing these parts:

```sh
sha256sum -c PARTS.sha256
cat evidence.tar.gz.part-* > evidence.tar.gz
sha256sum evidence.tar.gz
mkdir evidence
tar -xzf evidence.tar.gz -C evidence
```

Compare the joined archive hash with the value above before extraction. [The manifest](EVIDENCE-MANIFEST.json) indexes every retained regular file and records original paths, modes and modification times. The archive's internal `EVIDENCE-MANIFEST.json` is byte-identical. [Package receipt](PACKAGE-RECEIPT.json), [part hashes](PARTS.json), [runtime review](RUNTIME-REVIEW.md) and [browser review](BROWSER-REVIEW.md) are directly readable alongside the archive.

The current gate is under extracted `capiro-unified-calendar-final-gate-20261013/`; the failed 6034 checkpoint is under `capiro-unified-final-gate-20261013/`. Each `*-exit.json` records the actual command, environment overrides, source before/after and outcome. Canonical commands include `npm ci --ignore-scripts --no-audit --no-fund`, `npm run check`, `npm run build` and `npm run test:production`. Both browser configs were discovered in full and executed in four sequential shards with two workers and zero retries. The archived drivers bind the exact additional package, asset, server and browser invocations.

After archive sealing, one existing 270,372,695-byte historical dependency archive was relocated to make room in the checkout. Its full compressed hash and metadata were verified before replacing the old path with a destination alias; both preexisting aliases were retained. Those later receipts are published separately in [post-package-relocation](post-package-relocation/COMPLETED.json) and are intentionally outside the earlier archive inventory. This preserved archive move is separate from retirement of the reproducible inactive Newsletter installation described above.

The final publication review is in [PACKET-REVIEW.md](PACKET-REVIEW.md). No source acceptance, native acceptance or deployment is inferred merely from archive preservation.
