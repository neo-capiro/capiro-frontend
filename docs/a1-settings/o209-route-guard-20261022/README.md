# O209 form harness API-route correction

Bounded test-only follow-up to #117 `ef412274af6e02b2ec90d5fc45886584ba11591f`, paired with unchanged #118 `248baf5dad008ff0f50fa31c61d791a3363da083`.

## Finding and evidence attribution

Fable's [CodeBuild 51c7e27f report](https://github.com/neo-capiro/capiro-frontend/pull/117#issuecomment-6352018268) has the first form scenario passing and the second failing before the form renders. Portfolio browser is 39/40; typecheck, lint, architecture and units passed (741 passed/36 skipped). That composed gate remains FAIL.

Chromium is unavailable in this agent's environment. I [requested the offered trace](https://github.com/neo-capiro/capiro-frontend/pull/117#issuecomment-6352076937). Fable then [reported a fresh local reproduction](https://github.com/neo-capiro/capiro-frontend/pull/117#issuecomment-6352133815), updated 2026-10-22T21:53:05Z, on the composed `7f8a3969` tree and locked Playwright Docker setup. His diagnostic showed:

```text
GET http://127.0.0.1:5191/@fs/w/apps/web/src/shared/portfolio/api/provider.tsx
```

The former `**/api/**` glob intercepts that Vite source-module request. Aborting the import prevents the component from mounting. This is not an identity/capability/list API read, so no synthetic service fixture is appropriate.

CodeBuild uploaded no trace artifacts; Fable corrected that earlier offer and generated fresh local artifacts on neomart. The exact request above is **Fable-reported browser evidence**, not independently observed here. His suggestion that this passed locally is not adopted: the previous and current author browser attempts both stopped at missing-Chromium launch, with zero execution.

## Change and preserved boundary

Only `apps/web/tests/browser/settings-security-form.spec.ts` changes outside evidence:

- Intercept by `url.pathname.startsWith('/api/')`, the application endpoint root. Vite module paths remain ordinary source loading; there is no GET or extension exemption for real API endpoints.
- Keep the exact tenant-create path and POST condition, abort-and-throw for every unexpected application API request, one-request counter and deferred response.
- Include the actual method and complete URL in the thrown diagnostic.

All eight complete assertion expressions and both test names are unchanged. Original `security-form.test.tsx` stays byte-identical (SHA-256 `c4c7a907d3c4a9591b440d60850f0aa440cb3d360f859a7c45e74ba9aebd5fa8`). No additional fixture, product, Workspace/backend, provider, dependency, config, registry, importer or evaluator change. No positive accepted-receipt coverage is claimed.

## Actual checks

- Final formatting, touched-file lint and focused TypeScript dependency closure: exit 0.
- AST parity: all eight assertion expressions and two names match exactly; the POST/path guard condition matches with indentation ignored. Six pure predicate cases retain real API interception, including unknown `.tsx` API endpoints, and exclude source-module paths. These are not browser cases.
- Composed fixture: baseline merge tree `9bd59332467616082c645229b6702d452e016432`, 2,317 relevant source/test/config blobs verified against the merge of the two pinned PR trees, then only this candidate spec overlaid.
- Composed collection: exit 0, two exact scenarios collected.
- Composed Playwright attempt: **exit 1, two missing-Chromium launch failures, zero scenarios and zero assertions executed**. Raw JSON and verbatim logs are retained; no local reproduction or browser PASS is claimed.
- Diff whitespace check passes. Reused matching-lock dependencies; no clean installation, full build or duplicate central qualification.

The initial scratch parity helper compared raw indentation in the moved route callback and failed; its corrected comparison normalizes whitespace in the guard expression only. All eight assertion expressions still compare byte-for-byte. That setup failure is retained in `raw-logs.json`, not counted as a pass.

## Handoff

Dot exact-head review and Fable's fresh composed gate are required. From repository root:

```sh
npm run test:browser --workspace @capiro/web -- --list tests/browser/settings-security-form.spec.ts
npm run test:browser --workspace @capiro/web -- --workers=1 tests/browser/settings-security-form.spec.ts
```

The required list must include this spec. Require both exact scenarios passed, all eight assertions reached, zero failed/skipped and raw JSON; listing alone is insufficient. The prior composed FAIL and older head's PASS are not qualification for this changed head.

Fable's isolated 57/57 exact-identity joined receipt (6351998797) carries only while relevant backend/Workspace code is unchanged, as it is in this patch. It was not rerun here. Frontend deployment remains held on the fresh composed gate and coordinating release process. A2 HOLD and STOP2/6 remain; no merge/deploy, live SQL or model/acceptance turns.
