# Source identity based archive binding

The authorized alternative is technically sound: bind a new archive SHA only after independently establishing the full qualified Git commit, root tree, every tracked path, Git regular/executable mode, byte length, SHA-256 payload and the exact source-commit marker. ZIP timestamps, ordering, comments and supported compression headers may vary without changing that source identity. The original archive and its existing binding stay immutable.

The new tooling/manifest publication commit is separate from the application source commit it describes. A portable manifest must carry the explicit source pin and its own authenticated hash; a shipping verifier must not trust an unpinned manifest merely because it accompanies a ZIP. The final archive receipt must bind the bytes actually verified, using a held descriptor, before/after digest comparison and file/path identity checks. The receipt is not build, live/native, S3 custody or deployment acceptance.

Independent verifier: verify-source-zip.py reads committed Git objects with replacement objects disabled, recomputes each blob object ID and SHA-256, validates the exact archive contents without extraction, rejects unsafe/nonregular/duplicate/extra/missing members and verifies local/central indexed layout. It writes nothing except JSON to stdout. Its broader review-only ZIP64 support does not dictate the canonical producer's supported-format scope.

The first canonical utility admitted conflicting DOS directory/creator metadata, unindexed prefix/trailer contents and a pathname race that bound unverified bytes. These are reproducibly recorded in red/. Fix verification is pending the owner's final frozen code/docs. Small synthetic fixtures were created only in this review directory; no successor archive was created.

For cross-platform race checks, filesystem timestamps are not sufficient content evidence. Python 3.12 documents Windows st_ctime as creation time and filesystem-dependent timestamp resolution: [Python stat documentation](https://docs.python.org/3.12/library/os.html#os.stat_result.st_ctime). Compare content hashes before and after validation as well. No Windows-native execution has been performed here.

Read-only inspection of candidate 49f6609c7277ce8701b0d38c3ba163860633e668 confirms root fb895410ba3be77003977d9d5fdf33f2a525c7c8, app source tree 964c8c51b1449d303a9286cf902133d02c2e4301, and 4862 portable regular-mode tracked blobs. Qualification is parent-owned and pending; this is not a source acceptance claim.

Library transfer remains unconfirmed after hosted app preflight failures reported by the parent. No Library ID or size-limit evidence was returned. No storage relay, upload, provider or AWS action was performed by this reviewer.
