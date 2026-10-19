# Modules information activation

The Modules information button now shows its complete explanation after touch, mouse click, Enter and Space. It retains hover/focus access, the native description relationship, existing main-region portal, outside/blur/Escape dismissal and explicit scroll dismissal. This is a bounded successor to [draft PR21](https://github.com/neo-capiro/capiro-frontend/pull/21). All **337 native Portfolio acceptance rows remain open**.

Tested source: `7745bd4fce68421a3523a398d37e36a67b1aaf94`; root tree `28d9e1de96d54f0cbab4535f3d61ab7e886ce37a`; application tree `046e2636e30ed5f91bcd851d475a8e5a5732fb6b`; production source tree `555ca395f275fb754c8d600409ecdaa40fbdd964`. Evidence publication adds documentation and artifacts without changing this application source. Branch: `integration/capiro-input-accessibility-20261013`; base publication: `c045668da6fc3b630e6d83432e608c9d20c86afe`.

## Bounded changes

`ModuleHubInformation` controls the existing adopted Tooltip through its public `open`/`onOpenChange` interface. The information button prevents the adopted default click-close and opens the explanation. Repeated activation leaves it visible after activation; native pointer-down can close it before click reopens it. There is no claim of uninterrupted visibility during that sequence. No vendor implementation is copied, and shared component APIs, styles, navigation, session/client boundaries, transports, dependencies and contract artifacts remain unchanged.

Five regression cases exercise trusted browser touch input at 390px and 320px, mouse/repeated click, Enter/Space, native hover, outside input, blur, Escape and scroll. Each checks the full text/description, native tooltip ID, main containment and viewport bounds. They reject external requests, page errors and API mutations. Three activation cases add full-default axe. Actual-device touch, screen-reader speech and complete WCAG acceptance remain unrun.

The existing sequential `tabTo` test helper now waits for one browser animation frame after each real Tab input. This lets focus-induced scrolling finish before advancing to another control. It does not force focus, reopen the tooltip, retry assertions or alter timeouts. Existing tests and their content, focus, geometry, description, dismissal and unfiltered axe assertions remain intact.

## Preserved failures and diagnosis

Before any production edit, the first five-case probe against the preserved e63/PR21 bundle failed four activation checks and one hover-leave input sequence. Radix's pointer grace listener needed another real pointer movement. That probe, its original test, screenshots and traces survive under `evidence/baseline`.

The corrected test then failed all five cases at activation: two taps, direct mouse click, Enter after focus, and mouse click after successful hover/leave/re-enter. All 394 baseline bundle files remained byte-identical. The same corrected activation test SHA256, `ea4959027198fa820c0a31d0190bc5ad429942d7e651ef41653183a6b60e7c1c`, is in the final source. Space and later dismissal steps were reached by the passing implementation, not by the failed baseline.

The first corrected source `a2cf1d5e0204cf64ca8cbd9a32cb903cfdaecf29` passed all five new cases and 21 other cases, but one existing desktop keyboard case lost the explanation. Its 26-pass/1-fail cohort and passing static checks remain under `evidence/final`; that historical directory name does not mean qualified. No production build was run at that checkpoint.

Independent trace review found document scrollTop 71 during the penultimate Tab and a closed, focused information control before the screenshot began. Delayed delivery of the preceding sidebar-focus scroll is the supported explanation, but the original trace did not record native event timestamps. Three instrumented diagnostic runs passed and recorded Settings scroll before the information control opened; they do not reproduce or erase the failure. Their raw events and traces survive. The rendering-frame correction then passed the complete cohort without retries; explicit user-scroll dismissal still passes.

## Exact-source qualification

| Gate on 7745bd4f | Result |
| --- | --- |
| Root local controls | 106 passed; zero failed/skipped |
| Types and public-package checks | Passed |
| Focused lint and formatting | Passed, including the changed test helper |
| Architecture | Zero errors/blockers; 488 signals, 466 reviewed, 22 inherited unreviewed |
| Combined focused browser cohort | 27/27 in 52.27 seconds; zero retries/skips/flaky/report errors |
| Full-default axe | 12 reports, zero violations; incompletes retained |
| Production build | Passed in 54.04 seconds |
| Actual standalone server | Passed in 10.63 seconds; 30 observations, zero page errors |

Each gate records the same source before and after. The cohort preserves seven Modules geometry/keyboard cases, eight primary module routes, three shared navigation/history/session/client-interruption controls and four home accessibility cases, alongside the five activation cases. The unchanged application harness from a2cf is reused with its identical production-source tree and verified 394-file inventory; final tests execute the corrected helper. One production build was made for the final source in a new output directory. The previous e63 build was preserved and rehashed.

The actual server uses no credentials, fixture identity or service interception; its four ancestor dependency paths are absent. It covers canonical/compatibility/deep routes, visible setup/unavailable states, cross-mode navigation and history. It does not qualify native sign-in, tenant authorization or backend isolation. Shared session/expiry and interrupted-write checks in the focused cohort use explicit local fixtures.

Captured desktop and 320px activation renders retain the existing opaque explanation and readable full text. Existing 1440/390 light/dark preference and 320px keyboard geometry checks remain. No new Figma retrieval or complete product pixel-parity claim is made. Axe incompletes include the overlapping tooltip contrast, decorative information mark/name, decorative arrow, gradient action and inherited Meri composer; they remain visible in raw reports and receive bounded independent review. No accessibility rule is suppressed.

A clean install, full transport/unit suites, both complete browser suites, container/musl, native assistive technology and deployed gates were not repeated for this bounded slice. Historical full qualification remains at e837 and is not counted as a new-source pass. See the [preserved PR21 report](../preview-visual-20261013/README.md) for that chain.

## Preservation and scope

Before editing, all 1,040 original PR21 evidence files, the 140,033,841-byte archive and its six published parts were reverified. Storage cleanup removed only 22 ignored Vite dependency optimizer caches with generated metadata, recovering 304,405,375 bytes. Every deleted file hash, exact cache path and before/after source/Git state was recorded. Installed dependencies, Vitest results, source, branches, compiled builds and evidence were retained. After qualification the original evidence/archive/parts, previous build inventory and package/lock/artifact bytes were reverified again.

A fresh read-only remote refresh preserved these input heads:

| Input | Head |
| --- | --- |
| Frontend main | `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Portfolio continuation | `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` |
| Meri frontend PR4 | `3cc30ff3182e8050d563516607866cf07efe2aef` |
| Modules PR5 | `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a` |
| PR20 publication | `890a993a26dcee66ca3190ee6af4611e33171240` |
| PR21 publication | `c045668da6fc3b630e6d83432e608c9d20c86afe` |

Meri stays on published **0.1.3**. The owner's unpublished 0.1.5 metadata candidate and reported publication 401 are coordination context only. Neither 0.1.4 nor 0.1.5 was adopted. There were no merge conflicts in this bounded successor; the shared integration composition remains preserved.

All 337 native rows remain open. Real preview acceptance still requires reviewed public Test Clerk bindings and independently established payload, issuer/audience, routing/data/identity isolation and backend activation prerequisites. Full product design/accessibility coverage, native authorization/revocation, durable recovery/provider behavior, Office fidelity and deployed writes remain separate unresolved work. No deployment, resource/credential creation, main merge, security/database change, provider message, billing or paid model workload occurred. AWS shipping remains with its designated owner after qualification.

## Portable evidence

`MANIFEST.json`, `EVIDENCE.json` and `PARTS.sha256` bind the new raw failures, passing reports, screenshots, traces, source/storage receipts and independent review. Compiled outputs and temporary browser data remain local and are explicitly excluded. Symbolic links are recorded without following or reconstructing them. All archive members and original bytes are read back; file-mode restoration is not claimed.

Reassemble in an empty review directory:

```sh
sha256sum -c PARTS.sha256
cat evidence.tar.gz.part-* > evidence.tar.gz
sha256sum evidence.tar.gz
mkdir evidence
tar -xzf evidence.tar.gz -C evidence
```

Check the archive digest against `EVIDENCE.json` before extraction. Independent acceptance and packaging review are included under `review/` in the archive. The packet contains 230 regular files (48,550,064 uncompressed bytes), one recorded symbolic link and three explicitly excluded generated directories. Its 29,800,111-byte archive is published in three parts, SHA256 `7d525228ea19a8c175b8302cf1cd8170e40feead408b81e9ee34c5737ad507c8`. Manifest SHA256: `cd3f870299053c0f661e29b6c6e0b230698dd4b9b2f52f92fbd131924f9884c8`. Every original/member and reassembled part was verified. The [independent review](REVIEW.md) is also directly readable.
