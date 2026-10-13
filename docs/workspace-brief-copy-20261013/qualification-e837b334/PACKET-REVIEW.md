# Independent final publication audit

**PASS_BOUNDED: the prepared publication faithfully preserves the reviewed e837 qualification evidence.** No material artifact or summary defect remains. This audit read existing evidence and source state; it did not rerun tests, browsers, builds, installations, native operations or the publication/relocation helpers.

Qualified source: `e837b3341e7c31dd8b349438c7d9c5086fa4eb0e`. Root tree: `742bba63f01e67d3f4601166085c4fcd3b044a1c`; apps/web tree: `91e226f6286ae5af91b49e929e36474687bc7287`; production source tree: `9cb4e5c29b3957a6325d34c104eefcd49f439d15`.

## Archive and publication copies

I independently rehashed the complete **151,131,241-byte** archive: SHA256 `3a44a2dc684ae5ec496fde85839b4f3dde5da5a2098edddf8e414d49242d0ea9`.

All **2,888 TAR members** were opened and read to completion: 2,887 regular evidence files containing **315,812,354 raw bytes**, plus the embedded manifest. Every member is a regular file. Exact member-set equality, no duplicate names, safe relative names, every SHA256/length and every recorded mode/uid/gid/mtime passed. There are no executable extraction actions, symlink members, hardlink members or traversal names. The embedded manifest is byte-identical to the external manifest, SHA256 `e0d9156bbc46d99a8bc19559402498b14be29603330486cb0338ddacf6babab4`.

The archived root prefixes exactly match the **55 distinct selected roots**. The five filesystem symlinks are metadata-only manifest records. A fresh non-following inventory and full regular-file hash comparison across all 55 roots found **no missing or changed existing evidence file, directory record or symlink**. The only additions are the three explicitly disclosed post-package relocation receipts and their new directory. This demonstrates the packaged root/file selection; external descriptive selection metadata is not itself an embedded archive member.

All **seven publication parts**, each at most 24 MiB, match their individual sizes and hashes. Streaming their ordered concatenation reproduces the full archive hash and byte count without writing a new joined archive. `PARTS.sha256` exactly matches `PARTS.json`. Fifteen directly copied manifest, receipt, helper, source, aggregate, review and relocation files/logs match their originals byte for byte. The publication summary and implementation update were read separately.

These results are recorded in `ARCHIVE-VERIFICATION.json`, `ORIGINAL-INVENTORY-COMPARISON.json` and `STAGED-COPY-VERIFICATION.json`. The audit recipes read originals and write only to this external review directory; they do not extract the archive or alter evidence.

## Gates and summary reconciliation

I independently reconciled both current discoveries and all eight raw browser reports with their aggregates:

| Cohort | Discovered / unique passed | Shards | Outcomes |
| --- | ---: | --- | --- |
| Shared | 399 / 399 | 100 + 105 + 103 + 91 | One passed attempt each; retry 0 |
| Portfolio | 1,278 / 1,278 | 322 + 322 + 320 + 314 | One passed attempt each; retry 0 |

Missing/duplicate identities, skips, unexpected/flaky results, attempt errors and top-level report errors are zero. Project configuration matches discovery apart from explicit output/runtime metadata. Two workers per shard, repeatEach 1 and retries 0 remain intact. Shared has 399 effective 30-second budgets; Portfolio has 1,274 at 30 seconds plus the four existing 90-second slow cases.

All **22 inspected source-bound receipts** pass: ten discovery/shard receipts and twelve runtime/check/preservation receipts. Each has exit 0, unchanged identical clean before/after source snapshots and the exact frozen head/root/application trees. Raw logs support fresh 854-package installation, root 100, transport 84, web 2,129, Capiro 442, Newsletter 385 and declaration 8 controls; lint has zero errors/82 warnings. The bound architecture summary retains 488 signals, 466 reviewed, 22 inherited unreviewed and zero blockers/errors.

The direct runtime review and bound raw records support the production build (55.481 seconds), 30 actual-server observations, 179 served Newsletter assets, 23 additional HTTP checks, six Onboard assets and two additional viewport checks. The public Newsletter log records 116 renderer plus 130 receiving controls. Runtime archive-member verification remains the explicitly identified independent runtime review's work; I did not repeat those separate large build/Elements archive readbacks in this publication audit.

The summary accurately keeps focused controls as subsets and the failed **6034** checkpoint separate. My raw historical check confirms 399 shared passes and 1,277 Portfolio passes plus one failed case, with single attempts and no fabricated pass. The source-bound e837 correction, original tool-session disconnect and completed underlying receipts remain distinguishable. The published input-reference heads also pass local ancestry checks against e837.

`GATE-RECONCILIATION.json` binds these checks. The runtime report predates full browser completion and retains its original limited scope; the separate final browser report establishes the completed cohorts. Neither is silently rewritten to imply broader historical acceptance.

## Post-package archive relocation

Relocation executed **after** package verification at `20:45:51.656019 UTC`, with completion at `20:46:20.629902 UTC`. Its three receipts are consequently outside the earlier manifest and are copied separately with the execution log, as disclosed in the README. The previously reviewed helper remains SHA256 `f8e12d548a5cf518f307b94f0956feb05472ed6dc2f008ea074824329f3d253a`.

I independently rehashed the complete relocated **270,372,695-byte** archive: `49e6dc2049818a8d5933183f90eefd960dd8f79b6ae7314d73454f9a915bdab4`. Its current destination identity matches `COPY-VERIFIED.json`; size, mode 0600, nanosecond mtime, uid and gid match the recorded original. The old source path is the expected destination symlink, both pre-existing aliases retain their exact link text, and all three resolve to the same verified regular file. Receipt/log bytes and chronology match. The earlier archive's internal member proof is reused through the exact compressed hash, not claimed as newly replayed.

`RELOCATION-VERIFICATION.json` records this proof and the producer's dockerd/containerd descriptor-visibility limitations. No relocation or process scan was performed by this reviewer.

## Source boundary and remaining publication step

Initially, tracked changes were limited to the two documentation paragraphs in `docs/workspace-brief-copy-20261013/IMPLEMENTATION.md`; new nonignored files were confined to the qualification documentation directory. Application/package/script/vendor/manifests had no tracked changes. `git diff --check HEAD` passed. The owner subsequently staged the 26 intended files; I independently verified their exact file set and every Git-index blob against the prepared file bytes, including the ignored relocation execution log. `INDEX-VERIFICATION.json` binds this check. No new commit is certified here.

The initial default staging attempt refused 22 non-Markdown paths outside the sparse definition; the owner's exact index guard detected the omissions. Explicit `--sparse` staging and a force-add of only the intended ignored execution log resolved this without changing source, sparse rules or evidence bytes. The original observation is retained as `INDEX-STAGING-OBSERVATION.json`. The owner must now copy this sealed report as `PACKET-REVIEW.md`, explicitly include any copied audit logs, and repeat the final file-set/blob comparison before committing. The future documentation commit must continue to identify e837 as the qualified code, rather than claim a new application build.

All **337 native acceptance rows remain open**. The summary correctly preserves native authorization/RLS/revocation, atomic backend/write E2E, provider delivery, Office fidelity, full Figma/manual assistive technology and container/musl limits. Workspace axe results retain their two contrast and five label/name incompletes per viewport. Synthetic fixtures and the compiled disconnected server are not live-backend qualification. The packet is portable evidence, not a complete executable environment: metadata-only links and separately preserved generated archives retain their stated reproduction limits. No merge, deployment or shipping approval is inferred.
