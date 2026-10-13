# Rich newsletter lifecycle browser qualification

Added three feature test files in `/workspace/capiro-newsletter-port` on root head `977cf7b3b6bb4924c85d1cc5be5b31d93d94e026`, without a commit or source/shared/config edit by this lane:

- `apps/web/test/browser/newsletter-document-fixtures.ts`: public synthetic campaign factory, canonical fixture reuse, explicit owner interceptions, held replies and request/error/remote-effect observations.
- `apps/web/test/browser/newsletter-document-lifecycle.spec.ts`: six cases for explicit create/open/full CAS save and stage,409/503 edit preservation, explicit review/rebase/adoption and sanitized saved preview.
- `apps/web/test/browser/newsletter-document-navigation.spec.ts`: six cases for pending/unknown create and stage fences through Back/Forward, failed current detail after reopening an unknown save, and held-save client/session replacement.

`green-browser.log` and `green-results.json` record **12/12 passed**, no skipped/flaky/unexpected cases,20.5seconds, one worker, zero retries, inherited30-second timeout. Chromium is system154.0.8037.57, UTC. The existing43 tracked Modules harness/browser files are byte-unchanged from HEAD (`SOURCE-BINDING.json`). The final new test files contain116 assertion calls across their helper/specs, up from106 in the first candidate; counts are static call sites, not a claim of independent semantic assertions or additional executed cases. `ASSERTION-MAPPING.json` describes the additions.

## Meaningful failing evidence and correction ownership

The first run (`first-browser.log`, `first-results.json`) passed10 and failed2. Both stage cases failed at their original `page.goBack()` call after adoption, before reopening or uncertainty assertions. Their error contexts, screenshots and traces remain under `first-artifacts`; exact first test sources are preserved under `first-source`.

`history-diagnostic.spec.ts` performed an observational CDP probe against the same unchanged, pre-correction fixture bundle. It passed its observation checks; this is diagnostic evidence, not application acceptance. `history-inspection.json` shows Workspace history index1, editor push index2, detail review still2, and adoption adding a duplicate editor entry at index3. Native Back decremented3→2 while the parent URL remained the rich editor. Only child `about:srcdoc` navigation occurred at the content change. This was a real preview session-history defect, not absent prior history, replaceState, close confirmation or insufficient timeout.

Root added `key={document}` to the two inert preview iframes in `RichPreview.tsx`, replacing their browsing context on content replacement. This lane made no product correction. The corrected file SHA256 is `617d3c8ca4f9194cae14312192cfa4252405670a61782a3aaff3428a17c7a60f` and is independently bound in `SOURCE-BINDING.json`.

Before rebuilding the fixture, the final saved-preview history-length assertion ran against the still-running original bundle and failed: expected2, received3 after adoption (`history-regression-red.log`, JSON and trace). That assertion is unchanged in final green. The original Back calls/assertions also remain; no sidebar navigation substitution was made. New readiness checks observe the actual intercepted request before disposal; Forward now reopens the previous route, and repeated saved previews must not increase history length. No assertion was replaced by a sleep, retry or timeout relaxation.

## Bounded behavior exercised

The mounted feature/shared parsers admit synthetic intercepted owner responses. Tests prove no rich reads on mount/local edits, name-only explicit creation, local-content preservation, full reviewed name/config/design/revision CAS envelopes, exact stage revision with no automatic destination/open/prepare, no blind write repeat, and required successful current detail plus separate adoption/rebase. They inspect retained local input after409/503/lost responses; disposed input and late receipts cannot enter client/session replacements. Same-cache Back/Forward retains create/stage uncertainty, including equivalent UUID spelling. Unknown-save read refusal cannot unlock writes.

Saved preview sends only document identity and `liveMergeTags:false`, excludes unsaved fields, removes active HTML/form/iframe/link/image sources, retains sandbox/CSP, and emits no external request/dialog/page error. Two explicit saved previews preserve parent history length. This validates the intercepted browser display, not an email client or native preview/provider service.

## Runtime, structure and limits

The external server is a copy of the canonical Modules fixture harness, differing only in absolute package/root resolution and generated-output relocation. Its Vite fixture compilation is not a production Next build. Original and corrected fixture bundles remain local with per-file manifests. All outputs are separate from PR15/PR17 evidence. Root-owned old and new production sources are not modified by this test lane.

The first server PID1154358 and corrected server PID1156361 were stopped. `before-server-closed.json` and `LEASE-RELEASE.json` verify port5197 refused connections after closure; the runtime lease is released.

`TEST-SOURCE-REVIEW.json` contains exact source hashes and the sole new size signal: the cohesive synthetic fixture function88 nonblank lines, fingerprint `fa9917a8ab1044cdfedb876d9a0bacb5223ba3c52e7e62a3bd2c4f40009e561c`. The two spec files remain below400 lines, and their individual scenario functions below80. The included responsibility assessment is author review; root owns independent review and any registry record. Focused formatting and owned diff checks pass.

Not run by this lane: full Modules/Portfolio/old-rich preservation suites, complete application typecheck/lint/architecture gates, production build/actual Next routing, real authentication/backend persistence/invitation effects, provider delivery, Figma parity or complete accessibility qualification. Existing source unit37/37 and independent review remain separate source-bound evidence; these12 browser cases do not accept all original43 rich facets. No owner/provider endpoint was called; no commit, merge or deployment was made.
