# Frozen integration qualification checkpoint

Application source is frozen at `5840b50ea3a94e766666254600f1c16d26d3860a`
(tree `256bdbdeac97257e5b14d7ff97e44951b6ca7fc5`) on draft PR8.
Subsequent evidence-only commits do not change that application source.

The three input heads, merge order, shared ownership and preserved-source audit
are in PLAN.md and PRESERVATION.json. No audited feature/test/asset file is missing;
no original owner branch, main, resource, credential or database is changed.

## Completed on the frozen source

- Clean npm ci with the root lock: 847 packages, scripts disabled as required by
  the repository's qualification package. Node24.19.0 / npm11.9.0.
- Combined check: public package hashes; all workspace typechecks; 56 repository
  guard/asset cases; architecture with zero boundary/blocking errors; 21 transport
  cases; lint with zero errors/76 warnings; formatting of all web source and both
  test trees; 1,007 Portfolio units and 94 Modules contract units.
- Architecture preserves all 391 signals: 364 explicitly reviewed, 27 inherited
  unchanged and still unreviewed. Thresholds, dependency boundaries and tests are
  preserved; no size signal is silently accepted.
- One unified Next production build and actual standalone-server smoke pass.
  Routes, style isolation, light/dark desktop/mobile, history and mode links pass.
- All 62 Modules/Settings/shared-integration browser tests pass on the frozen tree.
- Fifteen UI provenance/SSR tests pass with the official hash-verified Linux
  esbuild0.28.2 tool and fresh source-bound receipt; no native/provider calls.
- Additional actual-server Meri fixture checks pass for citations, all eight run
  states, unavailable actions, keyboard access, viewport fit and zero API requests.

The **881-case Portfolio browser run is still in progress**. It has passed over
200 cases without a failure at this checkpoint. This is not final combined
qualification or authority to ship. The prior concurrent run was interrupted;
its timeout and output-directory collision evidence are retained. The affected
timeout case passes unchanged in the frozen run. Separate harness output paths
now prevent Playwright cleanup from deleting the other suite's built files.

## Defect and scope evidence

Five Intel receipt negative controls failed before the fix; Core client404 made
two Intel reads; phone requested-state copy omitted the SMS consequence. Red logs
and browser artifacts remain in evidence/. Receipt validation now respects Intel
normalization and explained partial rejections; arbitrary targeting loss still
fails. Phone copy and Core404 zero-Intel behavior have focused green evidence and
are also in the full suite. Native backend gaps remain visible.

Representative Figma/mobile/keyboard findings and limitations are in
VISUAL-REVIEW.md. This is not exhaustive pixel or assistive-technology acceptance.

Backend PR2393/2394 were inspected after the freeze. Existing facility frontend
wiring already uses the opaque revision and reviewed route, with404 no-fallback
and409 renewed review. CORE-039 remains native/deployment-blocked. Sender selection
ENG-prep_sender_select is next-candidate work: safe mailbox query/picker, reviewed
ID, exact receipt and old-service unavailable handling. It is not implemented or
accepted by this checkpoint. CORE-108 native reply and PROS-029/031 durable proposal
send/reminder remain separate gaps; source mailbox support does not unlock them.

All **337 Portfolio rows remain unaccepted**. Independent source review, live
Clerk/tenant/role/client matrices, backend persistence/CAS, provider/sender/reply,
media/capture, billing, paid model/runtime and missing contracts remain unrun or
blocked as documented in the exact original handovers. Container build/scan,
preview image, AWS preflight, release and shipping remain with the designated
shipping owner. No merge, deployment, real send, billing or paid workload occurred.
