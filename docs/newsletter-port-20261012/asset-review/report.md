# Newsletter static asset review

**Accepted as the uncommitted static preservation slice. No defect found in the 179 assets.** The branch remains on `adbc84b2251fe6b06cb7f75030026fba5b4ff498` with exactly **179 untracked assets** under `apps/web/public/newsletter/`: **172 PNGs, 5 SVGs and 2 text notices**, totaling **486,014 bytes**. Root concurrently added newsletter-port documentation, recorded separately. There is no staged or tracked diff. Saved-version code, the shared shell, dependencies and lockfiles are unchanged.

Every candidate file matches the decoded original fetch bytes, SHA-256, Git blob ID and length in the preservation manifest, root receipt and independent C/W directory records. Source C is `1e99f0921b207318c6d2abf03927b5c4daa5768b`; comparison W is `193703e34f2bedbb69d87d6a8ee303f65ab8dbda`. There are no missing or extra asset paths, symlinks, case collisions or byte mismatches. All PNG chunk CRCs validate; all five SVGs parse as SVG with no script/foreignObject, event-handler attributes or external resource references. `ASSET-VERIFICATION.json` records every path and result.

## URLs and notices

Independent extraction from the pinned public contract constants produces **21 union platforms × 8 styles = 168 social image URLs**. All resolve to candidate paths. The four fixed template PNGs, four legacy SVG inputs and template chooser SVG are also present, covering all 177 images. Original model and template literal references resolve. The renderer's legacy SVG-to-PNG normalization and public-origin expansion were inspected statically. This verifies local bundled-path completeness, not HTTP serving. `URL-COVERAGE.json` preserves the source bindings and complete matrix.

Both license/attribution files are byte-identical to original fetches, C/W records and separate source snapshots. The preserved text identifies Font Awesome Free 7.3.1 / CC BY 4.0, Fonticons' copyright, Capiro's modifications and brand trademark limits. It explicitly identifies website, email/forward and Instapaper symbols as original Capiro art. This accounts for 136 brand-icon variants and 32 original-symbol variants. The nine template images retain exact C/W provenance; the supplied social notice does not assign them CC BY 4.0, and this review makes no additional license inference.

## Boundaries

This is a byte-preservation review, not a rich-newsletter implementation or native acceptance. The existing `@capiro/shared` public exports still need a governed immutable distribution and packed-consumer qualification before rich UI consumption. No runtime, browser, build, typecheck, install, native endpoint, provider, deployment or network call was made. Deployed static-origin serving remains unverified. No current saved-version behavior or shared shell changed, and no PR15 source/evidence was edited.

`SCOPE-AND-LICENSE.json` records scope and remaining prerequisites. `MANIFEST.json` binds review outputs and original inputs. The reviewer wrote only `/tmp/capiro-newsletter-assets-review-20261012`; the asset candidate is still uncommitted and should be bound to its eventual commit before publication.

## Copied documentation publication blocker

`NEWSLETTER-DOC-01`: five copied directory API receipts retain ephemeral GitHub download URL token values. The affected paths are listed in `DOCUMENTATION-OBSERVATION.json`; no values are repeated here. Root agreed to preserve the original sealed audit locally, sanitize only those values in the publication copy, and record original-to-sanitized hashes with an explicit source-index caveat. Independent staged verification is required before publishing the copied evidence. This does not alter the asset hashes or their bounded acceptance.
