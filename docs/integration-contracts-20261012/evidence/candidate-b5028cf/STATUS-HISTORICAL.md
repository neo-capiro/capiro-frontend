# Shared frontend integration candidate — 12 October 2026

FAILED candidate; restart-safe command recovery repair is in progress.

Previous frozen application/test/deployment source:
`b5028cf033e019e14943940f287ad12a1192554a`, tree
`8c77d32c6c89332e96b7f5d8799b5d9f3e35edee`.
Draft PR9: https://github.com/neo-capiro/capiro-frontend/pull/9
Branch `integration/capiro-contracts-20261012`, isolated worktree
`/workspace/capiro-contracts`. PR9 is stacked on the preserved shared integration
PR8 branch; it includes PR8 by ancestry. Neither PR is merged or deployed.

## Source ownership and inputs

The single `apps/web` application uses Portfolio `/` and compatibility `/portfolio`,
Meri `/meri`, Modules `/modules`, Settings `/settings`, existing deep links,
Calendar, sign-in, health and narrow service adapters. HeaderFrame owns shared
chrome and all-mode navigation while Meri retains its exact home/cited-answer
assets. ApplicationBoundary owns user/session/org/client replacement, cache/editor
clearing and cancellation; SelectedClient distinguishes no selection, loading,
current service-authorized projection and unavailable. Browser hints do not grant
authority. Core/Intel transports, Modules' fixed operations and Meri's public
contracts remain independent governed interfaces. No backend agent code is copied.

Inputs refreshed before qualification:

- Frontend main: `02c02d95bdf3949662b9123f425271c6491ffdab`.
- Portfolio implementation PR6: `abaeab37b36d60b3e5185755e1b2c9169d7c92f3`,
  tree `46417a01484727747b0a2d81b3b4f278285cb709`; owner archive additions through
  `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` are retained. PR7 was not substituted.
- Meri PR4: `3cc30ff3182e8050d563516607866cf07efe2aef`, including PR1 ancestry.
- Modules PR5: `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a`, retaining implementation
  `e717867300e8568d467ac1cc9a54cab6540f4312`.

The exact requested Portfolio/Modules/Meri handovers and essential plans were read
before implementation. Shared routing/Header/architecture guard collisions were
resolved deliberately; Modules' sibling URL assumptions and Portfolio rejection
were adapted to the shared app. Both guard families and meaningful tests survive.
The root manifest/lockfile remain the sole active app installation owners.

## Source fixes and governed additions

The original three Portfolio defects have preserved failing baselines and source
fixes: normalized Intel watchlist acceptance and explicit partial rejection
receipts; requested-code PhoneVerification copy against its Figma target; and a
visible disabled Core404 preference entry making zero Intel calls.

PR8's full browser result (880 passed, 2 failed) and independently found prerender
configuration defect remain historical failed evidence. This candidate uses
request-time configuration, actual prerender-artifact verification, canonical
outside-click/focus restoration and real same-origin Settings redirect behavior.

Later authorized contract work is documented individually:

- [Selected sender](MAILBOX-CONTRACT.md): exact current actor mailbox, originating
  reply mailbox lock, frozen From review, fresh preflight and receipt integrity.
- [Ordered owners](ORDERED-OWNERS.md): explicit Primary–Quaternary whole-order
  replacement, current version, retained unavailable slots and read-back after
  conflicts/unknown results; no implicit promotion or role/access grants.
- [Generic follow-up](QUICK-LOG-FOLLOW-UP.md): Core durable command owner,
  original body/key, separate activity/task outcomes, current read before explicit
  resume; no direct duplicate Planner creation or inferred commitment semantics.
- [Memory wording](MEMORY-WORDING.md): approved source wording recorded; no
  conflicting frontend copy or new disconnected memory action was introduced.
- [Prospect Files/manual Workspace](PROSPECT-RESOURCES.md): exact immutable origin,
  digest-bound upload intent, original-key recovery, current scoped reads/deletes,
  one canonical manual editor with saved versions/export. No client-name matching,
  sharing, sends, invitations, context import or model generation is enabled.
- [Quick log exclusion](QUICK-LOG-SCOPE.md): independent review found a disabled
  Commitment option in the Member path; correction `eabc8bf8b1d28ce3e3c65993624ea967614a45b2`
  removes it. There is no disabled-UI exception. Ordinary logs/Directory notes and
  the independently active Modules CommitmentView task management remain.

All transitions retain explicit loading/refusal/unknown-result states. There is
no automatic resend after unknown provider or resource completion. In-memory
follow-up/upload/create/manual-edit recovery survives view closure; persistence
through full browser/document restart is not implemented or claimed. Workspace
PATCH and snapshot remain separate writes without an invented backend CAS contract.

## Exact candidate qualification

Artifacts: [candidate-b5028cf evidence](evidence/candidate-b5028cf/).
Node 24.19.0, npm 11.9.0, Chromium 154.0.8037.57. Clean tracked source at start;
no source changes during the candidate gates.

| Gate | Result |
| --- | --- |
| Clean installation | PASS, 847 packages |
| Public package integrity and all workspace types | PASS |
| Root architecture/asset/deployment tests | PASS, 58/58 |
| Portfolio unit suite | PASS, 1099/1099 across 73 files |
| Fixed gateway/contract unit suite | PASS, 94/94 across 18 files |
| Meri transport suite | PASS, 21/21 |
| Lint / format | PASS; 0 lint errors, 76 retained warnings |
| Architecture | PASS; 400 visible signals, 375 reviewed, 25 inherited unreviewed; no boundary errors or blockers |
| Production build | PASS |
| Fresh Elements SSR/source integrity | PASS, 15/15 through supported shipping helper |
| Actual standalone server | PASS; route/status/security/query checks, cross-mode back/forward, desktop/mobile light/dark, zero page errors |
| Modules/Settings/shared lifecycle browser suite | PASS, 72/72, zero skipped/flaky |
| Full Portfolio browser suite | INTERRUPTED for independently confirmed reload duplicate-write P1; 341 passed, 1 failed, 1 interrupted, 561 unrun |
| Actual-server Meri fixtures | PASS; 1440/390px, citations, eight run states, keyboard, disabled unavailable controls, zero service calls/page errors |
| Image build/runtime/scan | BLOCKED/UNRUN; official Alpine index HTTP403 at 06:21 UTC |
| Live/native service, provider, Clerk, migrations/RLS/concurrency | UNRUN |

An initial direct `npm run check:elements` lacked the mandatory exclusive SSR
receipt and failed 3/15 cases. The supported shipping helper created the current
hash-bound artifact and passed 15/15 without changing source. Both reports remain.
Historical and focused results do not replace the full candidate gate.

## Preservation and remaining review

The candidate preservation audit finds no missing tracked source/test/asset files:
Portfolio 861 (816 byte-identical, 45 intentional changes), Meri 85 (64 identical,
19 formatting-only, 2 intentional), Modules/Settings 400 (362 identical, 4
formatting-only, 34 intentional). Exact paths are in PRESERVATION.json. Original
assertions remain, with explicit new sender/owner preconditions and complete-order
owner receipts replacing scalar-owner expectations. The historical Portfolio
archive subtree remains `67b25ecb1eac4d4dd618748f51660e004f5a7028`; its independently
hashed 477-file inventory and qualified history/context receipts are preserved.

Representative Figma continuity uses the already captured exact targets/assets;
current actual-server Meri Home/cited-answer/run-state and mobile Files/Workspace
screens were inspected. This is not full pixel, contrast or assistive-technology
acceptance of every product row. All **337 Portfolio rows remain unaccepted** until
their native criteria are met. Backend gap ledgers remain authoritative.

Independent review failed this candidate on reload duplicate creation. Durable
command recovery must be repaired and the entire gate rerun on a new exact pin. Shipping remains reserved for the
designated session: permitted Alpine access, reviewed exact-source image build,
runtime/scan, live/native qualification and explicit deployment authorization.
Coordinated backend contract releases/migrations are prerequisites; source-only
PR2393/2396/2399/2400 preparation does not establish live service availability.
No AWS build/image push, merge, deployment, resources, credentials, security/database
mutation, real provider messages, billing or paid model workloads were performed.
