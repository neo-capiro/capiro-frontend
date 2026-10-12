# Bounded Files receipt repair

Base: 3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d. Scope: CP-01 ACL receipt and CP-02 shared folder receipt semantics only.

The existing Files contract schemas own receipt normalization/effect comparison. A single-file metadata action hook will own captured reader/writer lifetime, PATCH dispatch, cache-local unknown attempt, and deliberate GET review. Existing file-scope/client-writer helpers remain canonical for authority checks; the native backend remains authoritative. No delete/bulk operation changes. UI retains draft and displays unverified state until a current GET review permits a new deliberate save; no prior-write causality claim. Native version/CAS/durable operation receipts remain unavailable.

Read backend client-files.controller.ts at required compatibility commit243248e726243c44bd4b9d24fd1ed220da18c56a. SHA2569b983bc5ecbf7810ebf054c3e55c6d6343220eb7f3832057469e0c21da8dcfa2. Relative to checkout4be13b0 only prospectId:null client-scope predicates differ. Native ACL receipt fields and mode all->empty / restricted trim+dedupe semantics and move trim/null semantics are unchanged.

Verification: failing-before semantic unit assertions plus actual Files browser interaction controls, followed by passing regression, existing Files reader/replacement tests, targeted lint/typecheck/architecture. Root owns shared review registry and clean final qualification. Synthetic fixtures only.
