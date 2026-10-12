# Exact reviewer control replay

The three canonical controls were restored outside the application checkout in `/tmp/reload-controls` and verified before any path-adjusted execution. Canonical copies here retain the exact source hashes: negative80dfa0fa7c53dc3079055c97777938466d3cbab6e4d66a3c2a38c5e616128815; launcher c8e2e3d8096a1ddcefa3c4d91a869c019dc650e27f01b542a6d74a65edcbbe3f; positive387456386de1a7ea677ce9711f932b93de58a3645cdd2cb556ce86ffe1efdfd7.

Negative baseline eabc8bf8b1d28ce3e3c65993624ea967614a45b2 reproduced the broken reload behavior and failed at the final one-pair invariant: expected1,actual2. Its earlier blank-title/no-recovery/second-task assertions intentionally describe the defect.

Negative replay884204e61721e171abf48f04c233948a632b77c7 failed earlier at blank-title: the original title correctly remained present and disabled. This is an expected negative-control result, not a positive acceptance pass.

The exact unchanged positive acceptance control passed2/2 on884204e: fresh-identity original-body/key recovery with no automatic reload POST; replacement actor does not recover former intent. This is a local replay of reviewer-supplied controls, not an independent final verdict. Detached test-only checkouts borrowed the installed dependencies; no rebuild or install was performed there. Their SOURCE records retain exact checkout/status. The launcher created path-substituted external replay copies and recorded those hashes separately; no canonical source was reformatted. Archive excludes only the node_modules symlinks (dependency owner is recorded), not test evidence.

The complete combined application remains unqualified until a final source freeze and full gate.
