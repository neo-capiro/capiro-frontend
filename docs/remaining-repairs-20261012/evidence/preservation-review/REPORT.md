# Independent evidence-preservation helper review

Verdict: **PASS for the bounded local archival workflow**, at the helper hashes below. No remaining concrete packaging blocker was found. This is a source/namespace/inventory review, not execution of the preservation or staging scripts and not a final committed-archive receipt.

Reviewed source: `adbc84b2251fe6b06cb7f75030026fba5b4ff498`. Repository status was clean when bound. The destination evidence directory did not yet exist and the documentation destination contained no symlinks.

| Helper | SHA-256 | Bytes |
| --- | --- | --- |
| preserve-evidence.py | c4f3f28c40b6b43fe528f1cad11500a4b561d201e7759c9dfa851315f06717f6 | 4535 |
| stage-evidence.py | 33a504ba4c8ef71012beb1c3e5cfb08dbc4e90d4fe4225b0a673fe75f2013912 | 4687 |

Exact reviewed copies are under `reviewed-helpers/`. `initial-observed-helpers/` records the first saved bytes; it is not represented as a failing baseline. Earlier broad staging was identified during source inspection and the root owner corrected it before the final binding.

## Preservation and namespace

The copier enumerates every regular file under its sixteen explicit evidence roots, with no extension or success-status filter. Thus failed attempts, setup failures, source capsules, logs, traces, generated caches, screenshots, and test output are included. Borrowed symlinks are recorded and not followed. The observed inventory contained four such links, all pointing to dependency trees, and no other nonregular objects.

Six Docker fixture paths contain a literal `.git` component. The helper replaces that component with `__literal_dot_git__`, records both the original full source path and original relative path, and refuses an existing encoded source path or duplicate destination. The observed namespace has no encoding collisions. This is collision-refusing encoding for these local artifacts; it does not claim a universally reversible filename format without the manifest.

Existing destination bytes must match; changed bytes cause failure rather than replacement. Copied bytes are rehashed and executable modes normalized to Git 100644/100755. The snapshot inventory contained no file larger than 50 MB. File and byte totals in that inventory are provisional because the Portfolio producer was still active.

## Staging and source separation

The corrected stager binds exact HEAD and manifest source, rejects duplicate manifest destinations, verifies each local byte count/hash, and requires the local evidence path set to equal the manifest. It stages six named documentation controls and explicit evidence paths, with NUL-delimited literal pathspecs. Force-add applies only to ignored paths that are members of the manifest; no blanket forced directory staging remains.

Before and after staging, all tracked and cached changes must be within the explicit proof/control allowlist. This closes the earlier gap in the narrower source-directory check and rejects unrelated staged source or documentation changes. The index evidence set must equal the manifest, every entry must be stage 0, and each Git blob's size, SHA-256, and Git mode must match. Scoped `evidence/** -text` prevents the root automatic text conversion from changing raw evidence. Any remaining filter/mode mismatch fails index verification.

The preservation receipt explicitly covers index contents, not a future commit. Final independent committed blob/mode/set verification is still required. Untracked files outside the allowlist are neither staged nor described as archived by these helpers.

## Sensitive material and limits

A bounded plaintext scan read 11,700 regular files, skipped binary bodies for signature matching, and found no private-key, AWS access-key-ID, GitHub token, or Slack token signature matches. All twelve observed `.env` files equal the exact synthetic Docker canary bytes. No secret values were recorded. This is not an exhaustive credential audit, and compressed ZIP members or captured network bodies were not separately inspected as a security audit.

Run these one-off helpers with ordinary Python (not optimized `-O`, because their guards use assertions), the trusted locally generated manifest, and the reviewed destination state. All named producers, including review writers, must finish before preservation. These are not a hostile-manifest importer or an atomic snapshot of concurrently changing evidence. No source, index, producer folder, browser, Docker, build, dependency, native service, or provider mutation was performed by this review.

The full Portfolio gate was still running during review. Three reported container build attempts failed on DNS and produced no image; Library transfer remains blocked. Helper acceptance does not change those gate outcomes or native/visual acceptance statuses. Preserve those failures and the final producer outcomes before archival.
