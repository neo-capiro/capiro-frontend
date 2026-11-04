# Combined verification

Review PR: [frontend #556](https://github.com/neo-capiro/capiro-frontend/pull/556). Companion: [backend #464](https://github.com/neo-capiro/capiro-backend/pull/464).

The final frontend source checkpoint is `7cd13f6a0456b289cb86c35f806fac3d13892b05` (tree `bd9dd14bb81bb550852e7d3b4999b4395f49df6f`). It is byte-identical to the local integration used for these checks. Later documentation-only commits do not change that source.

Node 24.22.1 / npm 11.9.0; dependencies installed from the unchanged lockfile with `npm ci --ignore-scripts`.

| Check | Result |
| --- | --- |
| Full web TypeScript, `NODE_OPTIONS=--max-old-space-size=4096 npm run typecheck --workspace @capiro/web` | Pass. New test-fixture typing errors found during integration were corrected before the final pass. |
| Production build, `NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build` | Pass, including the shared client build, optimized Next.js bundle, TypeScript and route generation. |
| Focused unit/contract suites | Pass; exact commands and overlapping suite counts are recorded in the two lane documents. No aggregate sum is claimed. |
| Selected browser suites | 44 distinct cases pass; two unchanged failures reproduce on exact base `36359c4868ce95cddd48439f2524555b4cfd004f`. |
| Corrected F17 visibility assertion | Pass: the exact pulse region is visible in All and Clients before absence is asserted in Prospects. |
| File-dialog keyboard, narrow viewport and axe | Pass; three axe scans report zero violations. |
| Root `npm test` | 256 pass / 10 fail, exactly the same counts and failures on unchanged base. |
| `npm run architecture` | Same 21 existing error entries as base; no new errors. Size findings 983 → 985 received independent responsibility review. |
| Touched-file lint, formatting and diff checks | No new lint errors; targeted checks and exceptions are documented per lane. Whole-repository baseline lint has 61 errors / 105 warnings and is not claimed green. |

The ten inherited root failures concern upstream transport-error redaction, framework-patch byte assumptions, two asset-provenance checks, two preview-route/policy checks, and four installed public-export/version expectations. They were not weakened or repaired as part of this Portfolio assignment. The two inherited browser failures are the obsolete calendar forecast text expectation and a Customize 404 expectation that hides otherwise accessible cards; both failing assertions remain intact.

Independent review accepted the production contracts, authorization and stale-scope handling, source-owner metric binding, civil-date and facility-specific normalization, bounded history/navigation, modal composition and deletion of superseded folder-creation paths. Existing large canonical containers remain in their owning domains; no architecture exception or scanner weakening was added. The review also improved the scroll target, dialog identities, obsolete paths and the F17 test selector.

This is source and synthetic browser validation. It does not establish live authentication, provider recovery, production deployment, native Office/export fidelity, image qualification, or non-owner database RLS enforcement. The original opportunity outage, historical approved briefing and saved conversion fixture retain the specific acceptance limits in the finding map. No source data was fabricated or silently rewritten.

See [finding coverage](README.md), [Figma references](FIGMA.md), [workflow tests](frontend-workflows.md), [data tests](../portfolio-qa-20261104/frontend-data.md), and [browser evidence](../portfolio-qa-20261104/browser-validation.md).
