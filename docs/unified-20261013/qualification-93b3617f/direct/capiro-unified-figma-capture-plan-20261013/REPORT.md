# Canonical home captures and supplemental accessibility audit

All six requested composition captures are preserved at **1440×1040**, light theme, device scale factor 1, en-US, UTC, using system Chromium 154.0.8037.57. `CAPTURE-INDEX.json` verifies each PNG's dimensions and bytes. Every image has same-name JSON with route, frame target, time, viewport, font readiness, resolved font families, image loading, network observations, build identity and unchanged before/after source bindings.

Source remained clean at `93b3617f5d0599f34da373525a96dfc70eaa85d6`, app tree `46fb1aae65c1cdc640c965254b947a149e982c17`, source tree `9824460c1d8240815f506c9bf3b6ee998b6fc000`. Existing compiled build ID: `alGa7bLzyzdg3BJpx8qe2`. The copied build receipt binds that successful build to this exact source. No production rebuild, configuration file edit, source/test edit, dependency change or Figma baseline update was made.

| Original 3.1 target | Canonical path | Compiled state | Source fixture state |
| --- | --- | --- | --- |
| Portfolio `411:41421` | `/` | `captures/actual-portfolio-1440x1040-light.png`: actual setup-required boundary | `captures/fixture-portfolio-1440x1040-light.png`: existing Portfolio host, one Test Aerospace profile |
| Meri Home `442:81437` | `/meri` | `captures/actual-meri-1440x1040-light.png`: actual preserved disconnected Home | `captures/fixture-meri-1440x1040-light.png`: same feature composition in Modules fixture host |
| Modules Hub `411:93787` | `/modules` | `captures/actual-modules-1440x1040-light.png`: actual connection-setup boundary | `captures/fixture-modules-1440x1040-light.png`: existing ModuleHub with an empty synthetic client list |

The normal state comparison inputs are the **fixture Portfolio**, **actual Meri** and **fixture Modules** images. They are not equally authoritative runtime states. Compiled Portfolio/Modules intentionally cannot display authenticated data without configuration. Their setup gates were preserved, with no production identity injection or configuration bypass. Fixture captures are clearly classified by filename, JSON and this report; no overlay was added to alter the UI.

Known state deviations remain visible: Portfolio uses its existing singleton synthetic profile, default card/saved ordering, unavailable saved-order notice, unsupported pulse metrics and incomplete empty alert feed. Modules shows `All 0 client profiles` and the existing test notice. Meri retains sample Jordan/Anduril content, disabled disconnected functions and the additive Recommendation actions destination; no selected-client hint or verified identity was invented. Meri content height is 1093px and Modules fixture height 1111px, so viewport-only images naturally stop at 1040px. Nothing was cropped or resized after capture. Existing notices below that edge remain in the DOM.

All captures waited for their actual rendered state, `document.fonts.ready`, image decoding and pending API completion. Fonts were loaded; no broken images or horizontal overflow appeared in capture metadata. Compiled pages resolve GeistSans; source hosts use their existing TestGeist / Geist Test declarations. Input font/helper/source hashes are in `INPUT-BINDINGS.json`. These are preserved source host arrangements, not substitutions made to resemble Figma. Parent owns the separate original-frame comparison; this packet does not declare pixel fidelity or design acceptance.

Runtime collection was bounded and supplemental: three actual captures passed, the corrected Portfolio fixture capture passed, and two Modules fixture captures passed. The initial Portfolio attempt failed because my broad capture-only `**/api/**` guard also blocked Vite's `/@fs/.../shared/portfolio/api/provider.tsx`. Initial source/config, result JSON, blank screenshot, trace and log are preserved. The correction only limits that guard to `url.pathname.startsWith('/api/')`; readiness assertions and timing remain unchanged. No application defect is inferred from that setup failure.

Browser requests were confined to the exact local target origin and GET/HEAD; external and mutation paths were blocked. All completed capture metadata reports zero external, blocked or unexpected requests and no page errors. Actual compiled captures made zero API requests. Source fixture reads were fulfilled from existing helpers; none reached a native backend. Full browser qualification outputs and processes were never changed.

Owned standalone 5188 and owned Modules 5197 were stopped and verified closed. Borrowed Portfolio 5191 was only attached and remains running for root. Modules capture used the existing frozen fixture-server routine, which generated its normal ignored `.qa/modules-harness` bundle. The later axe run previewed that existing bundle without another compile. `FINAL-SOURCE-AND-PORTS.json` records final source and port state.

Commands actually executed from the source workspace:

```sh
node /tmp/capiro-unified-figma-capture-plan-20261013/run-actual-and-portfolio.mjs
TZ=UTC node node_modules/@playwright/test/cli.js test --config /tmp/capiro-unified-figma-capture-plan-20261013/playwright.config.mjs --project=portfolio-fixture
node /tmp/capiro-unified-figma-capture-plan-20261013/run-modules.mjs
node /tmp/capiro-unified-figma-capture-plan-20261013/run-a11y.mjs
```

These fixed output paths are now sealed: use a new output directory for any later run. The external configurations have no automatic `webServer`; wrapper scripts close only their own child processes. There is no permission to restart or stop the borrowed Portfolio server.

Accessibility findings are detailed in `A11Y-REPORT.md` and full raw results under `a11y/`. Collection succeeded for all six desktop/phone audits, but findings remain. This is **not an accessibility pass**, native-service qualification, deployment verification, final full-gate result or acceptance of any previously unaccepted row.
