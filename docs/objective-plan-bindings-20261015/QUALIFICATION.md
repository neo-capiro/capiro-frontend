# Affected qualification

## Scope

This increment starts at ready shipment9da and changes only Objective operational receiving/presentation, current-resource navigation, manual Plan receiving/authoring and their tests/review records. Meri/Fable, backend implementation, preview permissions, image/release execution and mobile remain separate. Run only affected checks unless a new input/failure justifies broader work; the historical190/589/600/1304 inventories are not this increment's test set.

## Retained local results

- Physical locked dependency installation passed with `npm ci --ignore-scripts --no-audit --no-fund`; no lockfile edit.
- Five affected Vitest files passed50/50:24 Objective contract/receipt/type,8 current-resource navigation render,18 Plan receiving. After the two-file React lint correction, all18 affected Plan cases passed again. The other production bindings remained unchanged.
- Changed TypeScript lint: the full32-file check found one render-ref error and one effect-dependency warning; both were corrected, independently reviewed and the two affected files then passed with no errors/warnings. The unchanged other30 files had no diagnostics in that full check.
- The formatting command covered36 changed authored app paths:34 matched files passed and2 canonical schema/fixture JSON paths retain exact custody ignore entries. The exact exported SVG has no formatter parser and is preserved by its source hash; the final browser case contains an explicit15×15 assertion.
- Canonical `node scripts/architecture.mjs` passed:520 signals,501 reviewed,19 inherited/unreviewed and zero blocking findings or boundary errors. Its first registration attempt detected a duplicate explicit EngagementScreen review; the existing fingerprint record was updated instead of registering the same responsibility twice. Scanner/policy/transfer baseline were not changed.
- Public package boundaries passed.

## Browser and build gates

The canonical affected browser map contains18 cases from `objective-operational.spec.ts`, `objective-operational-navigation.spec.ts` and `engagement-plans.spec.ts`. Use the unchanged `apps/web/test/browser/playwright.config.ts`, one worker, zero retries and its canonical30-second case timeout. The bounded combined run uses a240-second overall timeout. It uses synthetic local responses and the actual app components; it is not a native/live API test.

Development evidence is retained, including11 passed desktop cases, a held-read loading test setup/label correction, and later cold-bundle/resource failures. The final combined attempt could not start its server: the Rust allocator failed a1,081,360-byte allocation and the server exited3221226505 before any case ran. Windows free virtual memory was about692MiB at the capacity check. No incomplete run is admitted as an18-case result.

Shipping then released a browser-only sequential slot. Fresh available commitment was5,546,758,144bytes, with15,143,165,952bytes available physical memory. The complete rerun passed18/18 in55,982ms: exact inventory IDs, zero skips/retries/flaky/global errors and zero unhandled page exceptions across18 runtime observations. All38 authored app inputs stayed byte-identical before/after. Actual runtime was Windows, Node24.19.0 and Chrome155.0.8059.40; this is neither the earlier153 host observation nor Shipping's Linux149 target. The two passing-case desktop screenshots were visually inspected. The local server/worker exited and port5197 was clear.

The canonical default `npm run build` remains held by shared-host capacity and the separate Shipping slot. After browser cleanup, available virtual commitment was5,602,320,384bytes, less than the proposed6144MiB heap maximum before native/parent margin. No build was launched and no unrelated process or OS setting was changed. Heavy processes are serialized with Shipping. The build includes fresh Meri-client declarations and full Next/web typing as canonical prerequisites; this does not allocate Meri implementation work. Earlier initial typecheck diagnostics are retained and their source fixes are independently reviewed, but are not a full final typing pass.

## Scope-label source successor

Visual inspection of the passing Plan capture exposed an empty-catalog fixture gap and a real existing selector presentation edge. A valid selected URL ID absent from the options could visually show the first all-client label while queries retained the selected ID. The successor adds only a matching **Selected client (name unavailable)** option; IDs, queries, disabled/error conditions and permission boundaries remain unchanged. Independent exact source review is `01f4d07798f93f34c9b44903b8f6f6f10f2179bab319aa85d855e1f3d6909dd8`.

Three rendered regressions passed for matching catalog, missing/foreign-only catalog and empty URL scope. All three changed source/test paths passed lint and formatting. The existing first Plan browser case now checks native select value and checked-option label; six affected Plan browser cases await rerun. Their immediate capacity check at01:08:41UTC found3,445,075,968bytes available commit, below the unchanged4096MiB heap plus1GiB parent/native margin; no browser started. The earlier18-case evidence stays frozen atbd13. Shipping subsequently assigned the next bounded slot to Objective typing, so neither this browser nor the6144MiB default build may overlap it.

## Invocation

From `apps/web`, the targeted unit command is:

```powershell
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts tests/objective-operational-contract.test.ts tests/objective-operational-contract-receipt.test.ts tests/objective-operational-contract-types.test.ts tests/objective-operational-navigation.test.ts tests/engagement-plans.test.ts --maxWorkers=1 --no-file-parallelism
```

From repository root, with the approved existing local browser executable and report path supplied by the runner:

```powershell
node node_modules/@playwright/test/cli.js test --config apps/web/test/browser/playwright.config.ts apps/web/test/browser/objective-operational.spec.ts apps/web/test/browser/objective-operational-navigation.spec.ts apps/web/test/browser/engagement-plans.spec.ts --workers=1 --retries=0 --global-timeout=240000
npm run build
```

Capture exact inventory/result IDs, runtime identity, source hashes before/after, process exits and owned cleanup. Check fresh host capacity after the browser before admitting the build. Native target backend ACL/RLS/concurrency, real Clerk, Linux, image/scan and deployment still require separate qualification even when these local gates pass. Plan backend016e is the reviewed migration-only successor to9a151; the receiving wire is unchanged and full application/live qualification is not inferred.
