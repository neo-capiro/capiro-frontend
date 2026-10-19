# Ordinary Outreach pending-draft structure review

Independent Codex reviewer `outreach_review` inspected the full changed module, parent/Modal callers and tests against PR29 `247de58f00a1fea50c25a3400463103885014f4f`; no blocking findings. Root owns test execution. Exact reviewed file SHA256: `98fd301f37660e6032089b2ff6aa6ae788cb2fb1a87f55ffea4600ba00dcd304`.

| Signal | Nonblank lines | Fingerprint |
| --- | ---: | --- |
| OutreachView module | 421 | `cd0444d57a430d565ae1a800654cda81f589b967f675be5a9ab475ec11ef0d32` |
| OutreachView function | 138 | `8bfbb75ea53281e837cee4bf7275581ad760d37a94f5ee10e443851cb376878d` |
| OutreachForm function | 100 | `bc83c6b583d5a0c35dfc44fb1e5fd241222276ded7eac0a0d26afc054c8787fa` |

The module remains the ordinary Outreach composition/editor owner, with named children for campaign listing, record listing, type input and editing. The view reflects child pending state solely to veto modal close intent. The form owns its existing single create/update submit lifetime and matching inputs/pending/error presentation, notifying the parent and disabling its local controls together. Shared query/client/session lifetime, primitives, fixed-operation transport and rich newsletter destinations remain canonical. No duplicate mutation, new auth/persistence/backend owner or unrelated domain is introduced. Keeping field/submit state co-located makes this bounded invariant explicit; no new module is needed solely to satisfy a size threshold. Original size-review records are preserved in the evidence archive; guard policy is unchanged.

Meaningful additive tests hold create/update writes and check exact submitted bodies, rejected-save retention and re-enabled fields/type, Escape/close veto, and one write. Desktop/mobile success tests check a successful response, close/reload and reopened enabled editor with the exact submitted body; pending form accessibility uses full-default axe. Reviewer inspected source/test assertions and first candidate evidence but did not independently run the final browser suite. Existing route/session unmount and ambiguous-write replay semantics remain legacy limitations; this interaction fix neither resolves nor claims to qualify them. No native/backend/provider/security/deployment action was performed.
