# Onboard shared followup review

Disposition: **no new source defect found in this bounded static followup**. The four exact AST responsibilities are acceptable for root-owned review entries. This is an exact-file WIP review, not integrated runtime or native acceptance.

## Exact responsibility entries

[ARCHITECTURE-REVIEW-PROPOSALS.json](ARCHITECTURE-REVIEW-PROPOSALS.json) supplies the complete factual rationale and source hashes. [AST-FINGERPRINTS.json](AST-FINGERPRINTS.json) records an independent static parse of the three source files; all four fingerprints equal the supplied hydrated report.

| File / symbol | Nonblank | Fingerprint |
|---|---:|---|
| onboard-adapters.test.ts / native request and receipt describe |216|`df3410523e877164db7fb8a114061507e35b3ba0a86bbaeef6871ebf3c216232`|
| onboard-adapters.test.ts / public transport and navigation describe |104|`3ae4d00c51c7f5a936bd26db0c11451fba1c08da0211d70eef1ee4d4b62ae335`|
| onboard-core-api.ts / createOnboardCoreApi |105|`ee94ca8f78a55cc086db9fe832b3be7c2322b2bd068a3b182bbe57dd89cb4fef`|
| operations/onboard-contracts.test.ts / receiving contracts describe |119|`c7f83e4372bae32eadf5833c491240ab9074cb67c56eea974833f9f9b2569a7d`|

The factory is a stateless consumer facade over one canonical Capiro API, with small per-operation receipt bindings. It adds no transport, schema catalog, retry, authorization, persistence or UI lifecycle. The three describe callbacks group positive and negative compatibility cases; splitting them only for a threshold would fragment the contracts without reducing responsibilities.

## Shared boundary changes and package admission

ApplicationBoundary, CapiroBoundary, gateway, HTTP client, operation authentication policy, route/proxy, corrected Core adapter and adapter tests are byte-identical to the applicable prior snapshots. The two changed existing app composition files add only the server pricing projection prop; see [prior-to-current.diff](prior-to-current.diff). The earlier UUID/name receipt correction remains exact at SHA256 `c7fbf99299408ecc1e0508bf64c56c2eb5eb6938f93ab4e3d854d623e110bbcc`. The prior sealed native-source evidence supports UUID creation and preservation of the submitted name; no broader Settings identifier narrowing was introduced. The prior author3-red→55-green receipts are historical author evidence, not a new reviewer test run.

The new `onboard-pricing.server.ts` imports `server-only` and exactly `PRICE_LOCK_COPY` / `PRICE_CHANGE_COPY`, then exports a frozen object containing those two strings. OnboardEntry passes that serializable projection to OnboardHost. The broad CommonJS package root remains server-side by construction; no client graph/build result is inferred here.

The dependency guard requires the exact owner path, named import with exactly those two original export names, a side-effect server-only marker and absence of use-client. It rejects broad/default/namespace/require/re-export imports and restricts direct imports of the projection to OnboardEntry. The new three guard tests cover positive allocation, malicious import forms and forbidden local importers; they were inspected, not run. Existing Next server-only enforcement remains necessary for the final build.

Packed bytes match the manifest:532178bytes,187regular entries,SHA256 `3e435f280fac8fd301eb753e9fc7ead93691cf979fc1641792fedd88e1bfd6d5`; lock SHA512 matches too. Both actual JS values and declarations are strings, with the exact producer copy retained. The manifest distinguishes source38fec5c8 from publication9ffab390. This followup verifies local byte binding and declared provenance; it does not independently refetch the producer or execute its package. Lock delta is3 new package records, one workspace dependency edit and5 existing dev-only flags removed;924 existing records remain identical, none removed. [DEPENDENCY-OBSERVATIONS.json](DEPENDENCY-OBSERVATIONS.json) contains the exact data.

## Thirteen mounted boundary controls

The test-only route branch mounts the synthetic probe inside the real ApplicationBoundary; the probe consumes canonical useCapiro/usePublicOnboard and has no replacement key or reset effect of its own. The thirteen cases are meaningful:2 token replacement,6 user/session/org replacement,2 signed-out→signed-in replacement, current public401 isolation, cookie omission versus protected same-origin transport, and current protected401 expiry. They assert draft disposal, fresh explicit reads, stale200/401 exclusion, exact plan request body, single dispatch and no automatic write replay. [BOUNDARY-TEST-DESIGN.json](BOUNDARY-TEST-DESIGN.json) records the case map and limits.

These controls have **not been executed by this reviewer**. They intercept the operation gateway and use synthetic Clerk state; they do not mount OnboardHost/OnboardPage, verify public-config refetch/error handling, native session authorization, Stripe or provider behavior. Loading→identity transitions are also outside these13. Those are remaining qualification controls, not a reason to weaken or replace these assertions. Feature-owned code was excluded while its author refactors; the historical upgrade-destination finding is not silently closed by this review.

## Execution and preservation

Only reads, hashes, tar metadata/string inspection, a three-file static AST parse and evidence writes were performed. No application import, unit/browser execution, install, typecheck, full architecture gate, server, build, native request, provider or AWS action occurred. No repository file or root-owned architecture record was changed. The earlier sealed packet remains intact; this new child packet has its own manifest. [SOURCE-BINDINGS.json](SOURCE-BINDINGS.json) binds every reviewed source; [FINAL-BINDING-CHECK.json](FINAL-BINDING-CHECK.json) confirms those bytes were still current when sealed.
