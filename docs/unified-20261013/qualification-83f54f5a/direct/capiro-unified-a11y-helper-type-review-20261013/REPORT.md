# Axe helper type-only correction review

Accepted: the sole delta is `(window as Window & { axe: typeof axe })` becoming `(window as unknown as Window & { axe: typeof axe })` after the same `axe.source` injection. The cast acknowledges the test-installed property; it changes no runtime check, audit options, document scope, assertion, attachment or scenario.

`TYPE-ONLY-DELTA.json` independently verifies exact textual replacement and identical TypeScript 5.9.3 `transpileModule` JavaScript (SHA256 `7229d691ddf1bdbda993d4fbf069ded902c6e35b46a50bde038251ae8bc01c0b`). Before source SHA256 `041d33331ffe2aacbf9c2ac5bc86fa00e4134342612c9ad5ba311aa3e543dcce`; after `855c28a24d9dda89e8239babcc14f3ea0dbe921441376b30ccfc93d0a9efa367`.

This is a read-only source/type-erasure review. No application source edits, browser, tests, build or typecheck ran. Root retains the original failing typecheck and original browser receipts, and will bind the final helper to its own qualification rerun. The original static proposal review remains immutable.
