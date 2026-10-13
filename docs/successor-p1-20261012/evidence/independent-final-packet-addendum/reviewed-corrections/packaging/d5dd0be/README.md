# Final candidate archive binding

[Binding](BINDING.json) identifies source `d5dd0be9bf5ad7800e648ff1421ce047523288b3`, root tree `7448658084841f7773144ce5d8714a19103e4ddd`, and the independently verified 498,171,732-byte ZIP with SHA256 `971c9116e1b9e7d4fc11da434ba26110a401b85e210650322e7b5a14b918cfc7`. Both unchanged accepted verifiers agree on every one of its 5,006 tracked blobs, paths and modes. [Independent report](../../evidence/independent-source-d5dd0be/report.md).

Run these offline commands from a repository containing the exact source commit. The archive and receipt output paths must be fresh: the creator and canonical verifier refuse overwrites. The source commit is distinct from a later evidence-only PR head.

```bash
python docs/successor-p1-20261012/packaging/source_archive.py create . d5dd0be9bf5ad7800e648ff1421ce047523288b3 source-d5dd0be.zip source-d5dd0be.creator.json
python docs/successor-p1-20261012/packaging/source_archive.py verify . d5dd0be9bf5ad7800e648ff1421ce047523288b3 source-d5dd0be.zip source-d5dd0be.review.json
python docs/successor-p1-20261012/evidence/independent-archive/final-tool-review/verify-source-zip.py --repo . --commit d5dd0be9bf5ad7800e648ff1421ce047523288b3 --zip source-d5dd0be.zip
```

The separate verifier prints its receipt as JSON to standard output. Require successful full-source verification and bind the actual archive byte count and SHA256 before any subsequent use. A different supported compression environment can produce a different ZIP identity; matching source must be established by the full verifiers, not by accepting an unexplained hash difference. These commands neither upload nor deploy anything.

The [historical 49f usage document](../README.md), creator/verifier bytes, previous 49f/943d archives, and their identities remain unchanged. Its literal 49f example is historical; use the explicit d5dd commands above for this candidate. Native Windows execution remains unrun.

Source identity verification alone does not establish combined application qualification, Library custody, deployed-image behavior or shipping authorization. There is no Library ID; the original mandatory-helper attempts failed before upload preparation. No cloud action occurred. See [remaining holds](../../REMAINING-HOLDS.md).
