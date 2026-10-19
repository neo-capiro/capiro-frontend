# Independent emitted preservation review — 90ccdd47

**PASS within the bounded source/package/emission scope; no additional blocker found.** Read-only review of frozen `90ccdd47de7a989e822590d616d69baa15a37d5d`, root tree `2bd75625dfa0b1a8aa894a48a68f34550a6f5037`, application tree `002c31576d9038d4d7f6438db9db3ae9cf00171c`, build ID `ryO7DKtR0WbApwqxzAn9j`. No source/index changes, application execution, HTTP requests, browser, build or install were performed by this reviewer.

The separate sealed [committed source audit](../capiro-unified-90ccdd47-preservation-review-20261013/REPORT.md) remains unchanged, manifest SHA256 `19fd6fc8e2cef4dd6c95d952c55c8c9c28999ccedea5b4fb41a527c679b194c0`. It verifies all seven lane ancestors, 807 original bindings, all 306 original test/spec files plus 29 colocated tests, the reviewed action-owner extraction, exact Files integration and the two intended lock entries. It preserves the failed 6150 typecheck and independently reviewed fixture-only correction; runtime source is identical across those two checkpoints.

## Emitted Files and public contracts

- All **128** document-proxy and **164** Files-page NFT dependencies exist in the standalone output and match the traced source bytes. No missing package is inferred from the contracts being bundled rather than copied as an external package directory.
- The public `@capiro/meri-contracts@0.1.2` tar is exactly **228,048 bytes**, SHA256 `8a3f6c95935c368da5c01d87c599c5d13b9b62a21bc6924e7ad0b723bd5e91fa`; all **19** installed regular members match it. Its document receiver source is exact in both proxy and SSR maps: **498,894 bytes**, SHA256 `4979699706346dc7fe3661ee1fafdc975e041e38a1f59873ea0b4f1795f9efde`.
- The Files client reference manifest binds its host to 12 chunks, including `04rg18s5mtp_y.js`, containing the three public document receiver markers recorded in `CLIENT-SERVER-BOUNDARY.json`. There are no emitted client source maps. Browser minification is therefore bound by chunk hashes, reference provenance and specific receiver markers, not falsely described as verbatim public source.
- The mapped original event runtime remains exactly **466,002 bytes**, SHA256 `3682cd96d10c1cc53f4e4a91845c6da514eda9d524ce8342b89e09ffcc19ae83`, equal to both the preserved root 0.1.0 module and app-local 0.1.2 browser module. Public action receiving is also mapped to exact public package content.
- **21** actual Files/connection source paths, across **24** map occurrences, match committed Git bytes. Two additional virtual map sources are generated CSS/client-reference modules and are identified separately. The original exploratory all-map equality assumption and its resolution are recorded.

## Client/server separation

All **475** emitted client JavaScript files were scanned against the explicit marker list. Meri configuration markers, the document proxy error marker, `/private/v1/meri`, and the two private Meri implementation path markers are absent. Positive controls find the Meri configuration markers in server chunks. This is a bounded literal/provenance check, not a universal security proof.

The broader exploratory probe did find the literal `CLERK_SECRET_KEY` in shared client chunk `32x_5wd72cjw1.js`, among Clerk SDK environment-property accesses. Its excerpt and installed constants hash are preserved; all four Clerk lock entries are unchanged from qualified 83 and the installed SDK remains 7.9.14. This is a name match, not an observed credential value. Build receipts explicitly blank native credentials/configuration. No blanket zero-server-name or general secret-absence claim is made. No SDK source change is requested by this observation.

## Observed qualification and asset receipts

The reviewer read and hash-bound the owner's receipts rather than rerunning gates. The clean install, canonical check, one build and actual standalone smoke all exited 0 on unchanged 90cc source. The standalone smoke reports 12 original/Files HTTP checks, four document POST routes returning configured-unavailable 503, four Files navigation cases across desktop/mobile and light/dark, and zero page errors. No native identity or service interception was used in that smoke.

The first served-asset attempt exited 1 **before HTTP** because sparse checkout omitted the tracked evidence metadata. Its receipt/log remain preserved. The restored-input attempt exited 0 without a rebuild or source change. The hydrated metadata matches exact HEAD; all **179** HTTP-200 asset records, totaling **486,014 bytes**, match their original manifest and current committed asset bytes individually.

Full browser cohorts were still being run by the owner during this review. This packet does not declare their completion or overall shipping/native acceptance. Real Clerk/RLS/admitted-context behavior, current service authorization, actual immutable artifact production, Office opening/recalculation, provider/model execution and native deployment remain unqualified here.

## Evidence

`SOURCE-BUILD-BINDING.json`, `STANDALONE-TRACES.json`, `PUBLIC-PACKAGE-EMISSION.json`, `MAPPED-FIRST-PARTY-SOURCE.json`, `CLIENT-SERVER-BOUNDARY.json`, `CLERK-SDK-LITERAL-PROVENANCE.json`, `SERVED-ASSET-COMPARISON.json` and copied raw receipts under `observed/` contain the exact bindings. `audit.py` performs read-only file/Git comparisons; its initial overbroad marker probe is preserved separately. `MANIFEST.json` seals every other regular file in this packet.
