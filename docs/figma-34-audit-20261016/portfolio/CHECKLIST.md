# Portfolio 3.4 desktop audit checklist

Status: complete hierarchy and interaction ledger; source-by-control and rendered parity remain pending.

Current Figma file: [Capiro 3.4 Portfolio](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio), Prototype page `1064:140864`. Source mapping is base `3ef15d9a8ae6a27a9c2f39ccd923b5e2e07797cd`; the coordinator’s ongoing source edits are outside this snapshot.

Every in-scope desktop frame has an exact node URL, actual control inventory, source family, owner, gap references and proposed acceptance checks in [CHECKLIST.json](CHECKLIST.json). Full named controls/reactions are stored by family under `audit-evidence/figma34/portfolio/controls/`; action references resolve through [INTERACTIONS.json](INTERACTIONS.json). These are future checks, not test results.

| Inventory | Count | Meaning |
|---|---:|---|
| Actual section-child frames | 326 | Independently read from live Figma node types |
| Desktop frames/states | 222 | Full visible reaction inventory plus named control candidates |
| Tablet reference frames | 38 | Inventoried, not executed or qualified |
| Phone/mobile reference frames | 66 | Deferred, unqualified and unwaived |
| Desktop non-shared control candidates | 4,037 | 2,462 reaction-bearing; 1,575 named candidates with no reaction |
| Unique non-shared prototype actions | 584 | Full actions retained, including conditional/variable branches |
| Shared header/navigation instances | 306 | 17 exact semantic equivalence groups; no pixel/style/motion proof |
| Portfolio-local component sets/variants | 2 / 12 | 110 additional variant candidates; excluded from frame control count |
| High-fidelity context requests | 31 | 22 desktop whole frames, 1 sparse desktop resolved by subcontexts, 1 tablet frame, 7 subcontexts |
| Desktop frames lacking a separate whole-frame high-fidelity context | 199 | Their hierarchy/controls are captured; visual detail remains unresolved |
| Browser/source visual parity cases run | 0 | Coordinator qualification slot required |

The metadata XML contains 18,023 nodes for the whole Prototype page and 16,995 under Portfolio. It collapses some instance descendants, so those numbers are not a claim of a fully expanded actual-node tree. Two metadata `<frame>` entries are actual COMPONENT_SETs; they are documented separately rather than counted among 326 actual FRAMEs.

## Immediate source/design decisions

- Government/federal consolidation and all ten location categories already exist in current design. Use [GOVERNMENT-AND-LOCATION.md](GOVERNMENT-AND-LOCATION.md); hidden legacy Federal footprint and hidden modal motion are not visible requirements.
- Human Objective association link/unlink authoring is a concrete implementation gap against accepted622 commands, and the picker/remove/recovery presentation is absent from current design. Request DG-01; do not infer authorization from `edit_objective`.
- The Objective detail’s one-project/next30days copy conflicts with accepted multi-project/no added task-cap semantics. Request DG-02 rather than implementing those restrictions.
- Client Work source at3ef still constructs legacy Strategy links behind `destinations.existingApp`; PFG-05 is a bounded source navigation gap. Root owns ongoing correction.
- Pulse/touch/deadline aggregates and some billing/proposal operations lack an admitted fact/command boundary. Explicit unavailability is not a fabricated zero or a proven UI bug.
- The nominal blank Objective frame175186 has no visible body/form, only the shell. DG-13 requests a real blank/readiness reference; preserve the existing accepted form.

## Coverage codes

- **H** — whole-frame high-fidelity context retrieved; neither full-scroll render parity nor implementation pass is claimed.
- **S** — whole-frame context was sparse; current Overview subregions were retrieved individually.
- **I** — complete hierarchy/control inventory only; separate high-fidelity visual inspection remains open.
- Every row’s rendered parity is **UNRUN**. Shared `G#` references expand through [SHARED-INSTANCES.json](SHARED-INSTANCES.json). Header/sidebar repeated instances are collapsed only by exact master, properties, variants, dimensions, visible text and reaction equality.

## Desktop frame/state ledger

### Portfolio index, filters, ownership and pulse

Owner: Portfolio frontend; Core aggregate/read owners.

Source: `apps/web/src/features/portfolio/index/PortfolioIndex.tsx`, `apps/web/src/features/portfolio/index/PortfolioPulse.tsx`, `apps/web/src/features/portfolio/index/attention/PortfolioAttention.tsx`, `apps/web/src/features/portfolio/index/layout/PortfolioLayoutEditor.tsx`.

Acceptance choices: **PF-portfolio-index-1** — Apply owner/search/type filters without broadening client scope; unavailable owner catalog retains selected ID and retry. **PF-portfolio-index-2** — Open each pulse drilldown only with a qualified aggregate/coverage contract; unknown totals stay unavailable. **PF-portfolio-index-3** — Customize only current accessible profiles, preserve canonical ordering/CAS and restore on failure.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:153351 · Portfolio (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-153351) | 23 (19) | H | G0,G1 | PFG-01 | S-PERMISSION, C-RESPONSIVE |
| [1064:153579 · Overlay · Owner filter menu](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-153579) | 14 (1) | I |  | PFG-01 | S-PERMISSION, C-RESPONSIVE |
| [1064:153619 · Overlay · Dialog · Assign owners · Anduril](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-153619) | 7 (7) | I |  | PFG-01 | S-PERMISSION, C-RESPONSIVE |
| [1064:153668 · Overlay · Pulse · 83% linked](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-153668) | 11 (4) | I | G2,G3 | PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:153830 · Overlay · Pulse · 9 clients](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-153830) | 9 (2) | I | G2,G3 | PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:153955 · Overlay · Pulse · 9 need attention](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-153955) | 10 (3) | I | G2,G3 | PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:154082 · Overlay · Pulse · 21 objectives](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-154082) | 10 (3) | I | G2,G3 | PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:154208 · Overlay · Pulse · 2 off track](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-154208) | 9 (2) | I | G2,G3 | PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:154325 · Overlay · Pulse · 17 strategies](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-154325) | 10 (3) | I | G2,G3 | PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:155692 · Overlay · Pulse · 83% linked · item ignored](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-155692) | 11 (4) | I | G2,G3 | PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:155853 · Portfolio · Clients (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-155853) | 16 (11) | I | G2,G4 | PFG-01 | S-PERMISSION, C-RESPONSIVE |
| [1064:155957 · Portfolio · Prospects (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-155957) | 22 (17) | I | G2,G5 | PFG-01 | S-PERMISSION, C-RESPONSIVE |
| [1064:156172 · Overlay · Portfolio prospects · Pipeline](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-156172) | 37 (30) | I | G2,G3 | PFG-01 | S-PERMISSION, C-RESPONSIVE |

### Client/member Quick log and commitments

Owner: Portfolio frontend; existing Core/Planner command owners.

Source: `apps/web/src/features/portfolio/client-profile/QuickLog.tsx`, `apps/web/src/features/portfolio/client-profile/quick-log/contracts.ts`, `apps/web/src/features/portfolio/client-profile/quick-log/command-contracts.ts`.

Acceptance choices: **PF-quick-log-1** — Client/member mode changes clear incompatible selection; select only current authorized targets. **PF-quick-log-2** — Explicit log/commitment/follow-up actions use admitted owner contract; no automatic Meri linking or task creation is inferred from prototype copy. **PF-quick-log-3** — Cancel/close performs no write; unknown reply preserves original command rather than fabricating success.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:154447 · Overlay · Quick log · Client](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-154447) | 32 (18) | I | G2,G3 | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1064:154613 · Overlay · Quick log · Client · Objective menu](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-154613) | 36 (17) | I | G2,G3 | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1064:154792 · Overlay · Quick log · Client · Commitment + task](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-154792) | 46 (17) | H | G2,G3 | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1064:154997 · Overlay · Quick log · Member · Search](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-154997) | 34 (17) | I | G2,G3 | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1064:155193 · Overlay · Quick log · Member · Choose staff](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-155193) | 39 (22) | I | G2,G3 | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1064:155395 · Overlay · Quick log · Member · Ready](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-155395) | 38 (19) | I | G2,G3 | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1064:155581 · Overlay · Quick log · Logged](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-155581) | 19 (12) | I | G2,G3 | PFG-06 | S-PERMISSION, S-SUCCESS, C-RESPONSIVE |

### Add profile, LDA intake and billing gates

Owner: Portfolio frontend; Core billing/intake owner.

Source: `apps/web/src/features/portfolio/index/CreateProfileDialog.tsx`, `apps/web/src/features/portfolio/intake/registrant/RegistrantImportDialog.tsx`, `apps/web/src/features/portfolio/client-intake/ClientIntakeDialog.tsx`, `apps/web/src/features/portfolio/billing/ProfileCapacityStatus.tsx`.

Acceptance choices: **PF-profile-intake-billing-1** — Role/capacity failures disable applicable creation and preserve retry; no charge on opening a gate. **PF-profile-intake-billing-2** — LDA selection retains original selected IDs, current capacity and scoped command; server revalidates matches. **PF-profile-intake-billing-3** — Payment/ACH/non-admin request prototype paths require accepted owner commands; present explicit unavailable states while absent.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:156441 · Overlay · Add profile · Choose a path](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-156441) | 20 (11) | H | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:156586 · Overlay · Add profile · Search LDA · Find your firm](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-156586) | 26 (14) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:156719 · Overlay · Add profile · Search LDA · Select clients](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-156719) | 27 (11) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:156878 · Overlay · Add profile · Create with Meri](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-156878) | 22 (10) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:157013 · Overlay · Add profile · Add prospect](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157013) | 31 (12) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:157169 · Overlay · Billing · Gate · Monthly firm](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157169) | 22 (14) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:157312 · Overlay · Billing · Gate · Annual firm](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157312) | 24 (14) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:157451 · Overlay · Billing · Review and confirm](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157451) | 21 (14) | H | G2,G3 | PFG-04 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:157597 · Overlay · Billing · Success](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157597) | 19 (11) | I | G2,G3 | PFG-04 | S-PERMISSION, S-SUCCESS, S-WRITE, C-RESPONSIVE |
| [1064:157714 · Overlay · Billing · Payment failed](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157714) | 19 (12) | I | G2,G3 | PFG-04 | S-PERMISSION, S-ERROR, S-WRITE, C-RESPONSIVE |
| [1064:157835 · Overlay · Billing · Request to add (non-admin)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157835) | 21 (12) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:157958 · Overlay · Billing · Request sent](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-157958) | 18 (10) | I | G2,G3 | PFG-04 | S-PERMISSION, S-SUCCESS, S-WRITE, C-RESPONSIVE |
| [1064:158072 · Overlay · Billing · Gate · Monthly firm · ACH](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158072) | 22 (14) | I | G2,G3 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:158215 · Overlay · Billing · Review and confirm · ACH](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158215) | 21 (14) | I | G2,G3 | PFG-04 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:158361 · Overlay · Billing · Success · ACH payment pending](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158361) | 19 (11) | I | G2,G3 | PFG-04 | S-PERMISSION, S-SUCCESS, S-WRITE, C-RESPONSIVE |
| [1064:158477 · Overlay · Billing · Payment failed · ACH return](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158477) | 18 (11) | I | G2,G3 | PFG-04 | S-PERMISSION, S-ERROR, S-WRITE, C-RESPONSIVE |
| [1064:158598 · Overlay · Billing · Request to add · Admin review](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158598) | 21 (13) | I | G2,G3 | PFG-04 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:158741 · Overlay · Notifications · Request to add (admin)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158741) | 20 (13) | I | G3,G6 | PFG-04 | S-PERMISSION, S-WRITE, C-RESPONSIVE |

### Client overview, identity and widgets

Owner: Portfolio frontend; Core factual read owners.

Source: `apps/web/src/features/portfolio/client-profile/ClientOverview.tsx`, `apps/web/src/features/portfolio/client-profile/ClientDetails.tsx`, `apps/web/src/features/portfolio/client-profile/ProfileFacts.tsx`.

Acceptance choices: **PF-client-overview-1** — Do not substitute recent-activity length or team count for defined touch/awaiting-reply/deadline metrics. **PF-client-overview-2** — Retain profile/team/activity loading and failures independently; missing is not zero. **PF-client-overview-3** — Use the same verified client through every widget/modal and invalidate after actor/session/client replacement.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:158895 · Client profile · Anduril · Overview with Timeline (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158895) | 37 (28) | S | G2,G7 | PFG-02, PFG-01 | S-PERMISSION, C-RESPONSIVE |
| [1064:159552 · Overlay · Dialog · Engagement health](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159552) | 4 (4) | I |  | PFG-02, PFG-01 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:159668 · Overlay · View switcher menu](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159668) | 14 (10) | I |  | PFG-02, PFG-01 | S-PERMISSION, C-RESPONSIVE |

### Combined government/federal entry and District Nexus

Owner: Portfolio frontend; Core location/context owners.

Source: `apps/web/src/features/portfolio/client-profile/ClientDetails.tsx`, `apps/web/src/features/portfolio/client-profile/GovernmentInfo.tsx`, `apps/web/src/features/portfolio/client-profile/FacilitiesCard.tsx`, `apps/web/src/features/portfolio/client-profile/FacilityDetailDialog.tsx`, `apps/web/src/features/portfolio/client-profile/FacilityMap.tsx`.

Acceptance choices: **PF-government-location-1** — Render one visible combined entry; hidden legacy Federal footprint node is not a second tile. **PF-government-location-2** — Each location list/marker opens that exact facility; keep all ten categories and independent current data coverage. **PF-government-location-3** — Apply GOVERNMENT-AND-LOCATION.json acceptance; preserve address evidence, period, ACS vintage, LODES absence, award attribution and public priority distinctions.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:159414 · Overlay · Government & federal profile · Identity](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159414) | 5 (4) | H |  | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:159495 · Overlay · Government & federal profile · Federal activity](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159495) | 5 (4) | H |  | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:159626 · Overlay · District details · Arsenal‑1 (3.4)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159626) | 14 (12) | H |  | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:171904 · Overview · Manage facilities (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171904) | 59 (33) | I | G2,G7 | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, C-RESPONSIVE |
| [1064:172504 · Overview · Remove submission (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-172504) | 39 (29) | I | G2,G7 | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:173039 · Overview · Remove facility (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-173039) | 39 (29) | I | G2,G7 | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1118:278629 · Overlay · District details · Headquarters (3.4)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-278629) | 14 (12) | H |  | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1118:279240 · Overlay · District details · Huntsville office (3.4)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279240) | 14 (12) | I |  | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1118:279545 · Overlay · District details · Lexington office (3.4)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279545) | 14 (12) | I |  | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1118:279850 · Overlay · District details · Washington office (3.4)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279850) | 14 (12) | I |  | PFG-02, DG-03, DG-04, DG-10 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |

### Timeline activity, expansion, update/removal

Owner: Portfolio frontend; Core activity/mail owners.

Source: `apps/web/src/features/portfolio/client-profile/ActivityTimeline.tsx`, `apps/web/src/features/portfolio/client-profile/ActivityDialogs.tsx`, `apps/web/src/features/portfolio/relationships/thread/TimelineMailThread.tsx`.

Acceptance choices: **PF-timeline-1** — Loading/empty/filtered-empty/error/update-error remain distinct; successful independent feed sections remain visible. **PF-timeline-2** — Expanded mail and remote links bind current record and client; no hidden-body or unrelated mail disclosure. **PF-timeline-3** — Remove/update use current version/authority and preserve original draft/unknown outcome; focus returns after dialog closure.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:160618 · Client profile · Overview · Timeline · Default (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-160618) | 35 (25) | I | G2,G8 | DG-09 | S-PERMISSION, C-RESPONSIVE |
| [1064:161135 · Client profile · Overview · Timeline · Email expanded and update error (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-161135) | 34 (24) | I | G2,G8 | DG-09 | S-PERMISSION, S-ERROR, C-RESPONSIVE |
| [1064:161675 · Client profile · Overview · Timeline · Loading (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-161675) | 34 (24) | I | G2,G8 | DG-09 | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:162057 · Client profile · Overview · Timeline · Empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-162057) | 35 (25) | I | G2,G8 | DG-09 | S-PERMISSION, S-EMPTY, C-RESPONSIVE |
| [1064:162421 · Client profile · Overview · Timeline · Filtered empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-162421) | 36 (25) | I | G2,G8 | DG-09 | S-PERMISSION, S-EMPTY, C-RESPONSIVE |
| [1064:162784 · Client profile · Overview · Timeline · Error (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-162784) | 35 (25) | I | G2,G8 | DG-09 | S-PERMISSION, S-ERROR, C-RESPONSIVE |
| [1064:163147 · Client profile · Overview · Timeline · Log activity menu (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-163147) | 36 (26) | I | G2,G8 | DG-09 | S-PERMISSION, C-RESPONSIVE |
| [1064:163674 · Client profile · Overview · Timeline · Log activity dialog (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-163674) | 68 (53) | I | G2,G8 | DG-09 | S-PERMISSION, C-RESPONSIVE |
| [1064:164229 · Client profile · Overview · Timeline · Remove activity dialog (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-164229) | 58 (49) | I | G2,G8 | DG-09 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:174625 · Overlay · Dialog · Anduril timeline · coss vertical](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-174625) | 32 (24) | I | G2,G8 | DG-09 | S-PERMISSION, C-RESPONSIVE |

### Objective intake, saved receiving and operational work

Owner: Portfolio frontend; Objective Core/Strategy/Planner owners.

Source: `apps/web/src/features/portfolio/objectives/ObjectivesPage.tsx`, `apps/web/src/features/portfolio/objectives/NewObjectivePage.tsx`, `apps/web/src/features/portfolio/objectives/ObjectiveEditor.tsx`, `apps/web/src/features/portfolio/objectives/ObjectiveGeneration.tsx`, `apps/web/src/features/portfolio/objectives/operational/ObjectiveOperationalPage.tsx`.

Acceptance choices: **PF-objectives-1** — Keep exact five-field intake and four-field form readiness; do not invent semantic score, cycle verdict, horizon or automatic questions. **PF-objectives-2** — Preserve current/requested/Strategy-applied/Planner-applied distinction and multiple projects; no prototype one-project or task-cap policy. **PF-objectives-3** — Human links require existing622 commands, full source/version/set binding and immutable receipt recovery; current design has no authoring mockup. **PF-objectives-4** — Current receiving never casts ordinary navigation as generated/applied lineage; stale/partial/forbidden/unknown remain separate.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:175142 · Client profile · Objectives · empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-175142) | 8 (6) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-EMPTY, C-RESPONSIVE |
| [1064:175186 · Client profile · Objectives · New objective, blank (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-175186) | 0 (0) | I | G2,G8 | PFG-03, DG-01, DG-02, DG-13 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:175193 · Client profile · Objectives · New objective, filled and ready (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-175193) | 26 (13) | H | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:175363 · Client profile · Objectives · New objective, outcome needs rewording (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-175363) | 26 (13) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:175535 · Client profile · Objectives · Generating strategy (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-175535) | 15 (13) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, C-RESPONSIVE |
| [1064:175613 · Client profile · Objectives · Strategy draft review (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-175613) | 15 (13) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:175923 · Client profile · Objectives · Objective detail, active (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-175923) | 12 (10) | H | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, C-RESPONSIVE |
| [1064:176083 · Objectives · Activate strategy (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-176083) | 16 (14) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:176459 · Objectives · Confirm objective ready (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-176459) | 16 (14) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:176792 · Objectives · New objective from outside a client profile (client picker)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-176792) | 19 (15) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:177142 · Objectives · Strategy draft out of date (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177142) | 17 (15) | I | G2,G8 | PFG-03, DG-01, DG-02 | S-PERMISSION, S-ERROR, S-DRAFT, C-RESPONSIVE |
| [1064:177832 · Main](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177832) | 26 (13) | I |  | PFG-03, DG-01, DG-02 | S-PERMISSION, C-RESPONSIVE |

### Advocacy history, matters and correction dialogs

Owner: Portfolio frontend; Core advocacy owner.

Source: `apps/web/src/features/portfolio/advocacy/AdvocacyHistory.tsx`, `apps/web/src/features/portfolio/advocacy/MatterEditor.tsx`, `apps/web/src/features/portfolio/advocacy/EditMatterDialog.tsx`, `apps/web/src/features/portfolio/advocacy/CorrectionDialog.tsx`, `apps/web/src/features/portfolio/advocacy/RecordDialog.tsx`.

Acceptance choices: **PF-advocacy-1** — Successful/partial/unsuccessful determinations remain explicitly human-confirmed; no inferred causation. **PF-advocacy-2** — Retain confidence/source/date/mapping uncertainty for inferred/public/client-verified records. **PF-advocacy-3** — Merge/reassign/detach/not-advocacy target exact current IDs and current authority; cancel has no mutation.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:159800 · Overlay · HoverCard · FY26 enacted](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159800) | 1 (1) | I |  | DG-08 | S-PERMISSION, C-RESPONSIVE |
| [1064:173572 · Advocacy · Matter drawer](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-173572) | 16 (12) | H | G2,G8 | DG-08 | S-PERMISSION, C-RESPONSIVE |
| [1064:173790 · Advocacy · New matter (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-173790) | 14 (6) | I | G2,G8 | DG-08 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:173931 · Advocacy · Edit matter (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-173931) | 22 (15) | I | G2,G8 | DG-08 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:174079 · Advocacy · Merge matter (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-174079) | 18 (13) | I | G2,G8 | DG-08 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:174218 · Advocacy · Reassign record (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-174218) | 18 (13) | I | G2,G8 | DG-08 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:174357 · Advocacy · Detach record (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-174357) | 16 (13) | I | G2,G8 | DG-08 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:174489 · Advocacy · Mark not advocacy (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-174489) | 18 (14) | I | G2,G8 | DG-08 | S-PERMISSION, C-RESPONSIVE |
| [1064:174996 · Client profile · Objectives & advocacy history (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-174996) | 14 (12) | H | G2,G15 | DG-08 | S-PERMISSION, C-RESPONSIVE |

### Government/organization relationships, contact and target flows

Owner: Portfolio frontend; Core Directory/contact/mail owners.

Source: `apps/web/src/features/portfolio/relationships/RelationshipsPage.tsx`, `apps/web/src/features/portfolio/relationships/TargetDrawer.tsx`, `apps/web/src/features/portfolio/relationships/ContactDrawer.tsx`, `apps/web/src/features/portfolio/relationships/AddTargetDialog.tsx`, `apps/web/src/features/portfolio/relationships/thread/TimelineMailThread.tsx`.

Acceptance choices: **PF-relationships-1** — Directory search/cascaders distinguish committee staff/personal office/member/state records and current client targets. **PF-relationships-2** — Contact edits, discard, note logging, email recipients/attachments and failed-send retention use canonical current command owners. **PF-relationships-3** — History loading/error/empty is independent; no fabricated address/committee assignment or source inference.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:164763 · Client profile · Relationships · Government (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-164763) | 16 (14) | H | G2,G9 | DG-11 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1064:165080 · Client profile · Relationships · Government · loading, error and empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-165080) | 9 (7) | I | G2,G8 | DG-11 | S-PERMISSION, S-LOADING, S-EMPTY, S-ERROR, S-PARTIAL, C-RESPONSIVE |
| [1064:165142 · Client profile · Relationships · Organization (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-165142) | 32 (21) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:165254 · Client profile · Relationships · Organization · empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-165254) | 11 (9) | I | G2,G8 | DG-11 | S-PERMISSION, S-EMPTY, C-RESPONSIVE |
| [1064:165320 · Relationships · Add relationship (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-165320) | 24 (21) | I | G2,G8 | DG-11 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:165696 · Relationships · Target drawer](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-165696) | 19 (17) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:166053 · Relationships · Contact drawer · Message history](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-166053) | 44 (15) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:166203 · Relationships · Configure hierarchy (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-166203) | 28 (17) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:166380 · Relationships · Account team (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-166380) | 22 (17) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:186882 · Relationships · Contact email · New email](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-186882) | 53 (22) | I | G2,G8 | DG-11 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:187066 · Relationships · Contact email · Draft ready to send](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-187066) | 55 (23) | I | G2,G8 | DG-11 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:187252 · Relationships · Contact · Log note](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-187252) | 55 (17) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:187421 · Relationships · Contact · Discard changes](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-187421) | 48 (18) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:187584 · Relationships · Contact · Remove confirmation](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-187584) | 47 (17) | I | G2,G8 | DG-11 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:187747 · Relationships · Contact email · Add recipients, Cc and Bcc](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-187747) | 60 (22) | I | G2,G8 | DG-11 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:187939 · Relationships · Contact email · Attachment added](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-187939) | 55 (23) | I | G2,G8 | DG-11 | S-PERMISSION, S-SUCCESS, S-WRITE, C-RESPONSIVE |
| [1064:188128 · Relationships · Contact email · Send failed, draft retained](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-188128) | 55 (23) | I | G2,G8 | DG-11 | S-PERMISSION, S-ERROR, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:188316 · Relationships · Contact email · Sent and history refreshed](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-188316) | 44 (14) | I | G2,G8 | DG-11 | S-PERMISSION, S-SUCCESS, C-RESPONSIVE |
| [1064:188472 · Relationships · Contact history · Loading](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-188472) | 45 (15) | I | G2,G8 | DG-11 | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:188620 · Relationships · Contact history · Error](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-188620) | 45 (15) | I | G2,G8 | DG-11 | S-PERMISSION, S-ERROR, C-RESPONSIVE |
| [1064:188769 · Relationships · Contact · Unsaved edits](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-188769) | 44 (14) | I | G2,G8 | DG-11 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:188919 · Relationships · Contact · Note logged](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-188919) | 44 (14) | I | G2,G8 | DG-11 | S-PERMISSION, S-SUCCESS, C-RESPONSIVE |
| [1064:189076 · Relationships · Committee staff target · Detail](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-189076) | 16 (12) | I | G2,G8 | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:189436 · Relationships · Add committee staff · Directory search](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-189436) | 21 (15) | I | G2,G8 | DG-11 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:189796 · Relationships · Add committee staff · Added](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-189796) | 20 (15) | I | G2,G8 | DG-11 | S-PERMISSION, S-SUCCESS, S-WRITE, C-RESPONSIVE |
| [1064:190155 · Cascader · Committee · Root](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190155) | 13 (7) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:190173 · Cascader · Committee · House](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190173) | 16 (10) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:190191 · Cascader · Committee · Senate](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190191) | 16 (10) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:190209 · Cascader · Committee · House Armed Services](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190209) | 16 (9) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:190228 · Cascader · Committee · Senate Armed Services](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190228) | 16 (9) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:190247 · Cascader · Committee · House Appropriations](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190247) | 16 (9) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:190266 · Cascader · Committee · Senate Appropriations](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190266) | 16 (9) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |
| [1064:190285 · Cascader · Committee · Search](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-190285) | 12 (6) | I |  | DG-11 | S-PERMISSION, C-RESPONSIVE |

### Client Work and Workspace document rows

Owner: Portfolio frontend; Strategy/Workspace current-resource owners.

Source: `apps/web/src/features/portfolio/work/WorkPage.tsx`, `apps/web/src/features/portfolio/work/WorkspaceDocuments.tsx`, `apps/web/src/features/portfolio/work/queries.ts`.

Acceptance choices: **PF-client-work-1** — Use current unified Strategy/Workspace navigation with exact resource/client re-read; preserve separate generated-version receiving. **PF-client-work-2** — Keep draft/completed document states and owner-name failures independent of successful document/task reads. **PF-client-work-3** — Partial Strategy details suppress aggregate claims; node action opens the exact selected node or reports current unavailability.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:166690 · Client profile · Work (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-166690) | 7 (5) | H | G2,G10 | PFG-05 | S-PERMISSION, C-RESPONSIVE |
| [1064:166926 · Client profile · Work · loading (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-166926) | 7 (5) | I | G2,G8 | PFG-05 | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:166998 · Client profile · Work · empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-166998) | 6 (4) | I | G2,G8 | PFG-05 | S-PERMISSION, S-EMPTY, C-RESPONSIVE |
| [1064:167049 · Client profile · Work · error (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-167049) | 6 (4) | I | G2,G8 | PFG-05 | S-PERMISSION, S-ERROR, C-RESPONSIVE |

### Files, folders, upload, preview and permissions

Owner: Portfolio frontend; Core document/storage owner.

Source: `apps/web/src/features/portfolio/files/FilesPage.tsx`, `apps/web/src/features/portfolio/files/UploadDialog.tsx`, `apps/web/src/features/portfolio/files/FilePreview.tsx`, `apps/web/src/features/portfolio/files/FileAccess.tsx`, `apps/web/src/features/portfolio/files/DeleteFile.tsx`.

Acceptance choices: **PF-files-1** — Selection, upload progress/failure, quota, extraction-state and empty/error design states are separately observable. **PF-files-2** — Smart links retain original entity/version identity; no duplicate file or falsely searchable state is invented. **PF-files-3** — Move/delete/access changes revalidate exact current IDs and permissions; unknown outcome never becomes success.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:167100 · Client profile · Files (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-167100) | 19 (10) | H | G2,G11 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:167338 · Client profile · Files · selection, upload progress and failure (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-167338) | 22 (7) | I | G2,G8 | No specific defect established | S-PERMISSION, S-LOADING, S-ERROR, C-RESPONSIVE |
| [1064:167588 · Client profile · Files · loading, storage over quota (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-167588) | 17 (6) | I | G2,G8 | No specific defect established | S-PERMISSION, S-LOADING, S-ERROR, C-RESPONSIVE |
| [1064:167724 · Client profile · Files · error and empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-167724) | 16 (5) | I | G2,G8 | No specific defect established | S-PERMISSION, S-EMPTY, S-ERROR, C-RESPONSIVE |
| [1064:167821 · Client profile · Files · Folders view (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-167821) | 10 (7) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:167963 · Files · New folder (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-167963) | 26 (22) | I | G2,G8 | No specific defect established | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:168220 · Files · Move to folder (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-168220) | 28 (24) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:168503 · Files · Delete file (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-168503) | 25 (22) | I | G2,G8 | No specific defect established | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:168757 · Files · File preview (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-168757) | 24 (21) | I | G2,G8 | No specific defect established | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:169011 · Files · Manage access (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-169011) | 24 (21) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:169287 · Client profile · Files · row menu (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-169287) | 20 (9) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:169715 · Client profile · Capabilities · empty and thin profile (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-169715) | 9 (7) | I | G2,G8 | No specific defect established | S-PERMISSION, S-EMPTY, C-RESPONSIVE |

### Capabilities, fit, registrations and editor documents

Owner: Portfolio frontend; Core capability/fit owner.

Source: `apps/web/src/features/portfolio/capabilities/CapabilitiesPage.tsx`, `apps/web/src/features/portfolio/capabilities/CapabilityEditor.tsx`, `apps/web/src/features/portfolio/capabilities/CapabilityForm.tsx`, `apps/web/src/features/portfolio/capabilities/Registrations.tsx`, `apps/web/src/features/portfolio/capabilities/CapabilityFit.tsx`.

Acceptance choices: **PF-capabilities-1** — Loading/empty/thin/error/fit-refresh-failure stay distinct and keep saved profile edits. **PF-capabilities-2** — Capability status, PE mapping and fit are returned facts, not inferred from a missing value. **PF-capabilities-3** — Profile/documents/delete/registration actions bind current capability/client and permitted actor.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:169534 · Client profile · Capabilities (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-169534) | 15 (13) | H | G2,G12 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:169656 · Client profile · Capabilities · loading (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-169656) | 9 (7) | I | G2,G8 | No specific defect established | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:169776 · Client profile · Capabilities · error and fit refresh failure (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-169776) | 8 (6) | I | G2,G8 | No specific defect established | S-PERMISSION, S-ERROR, S-PARTIAL, C-RESPONSIVE |
| [1064:169838 · Capabilities · New capability (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-169838) | 26 (17) | I | G2,G8 | No specific defect established | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:170029 · Capabilities · Capability editor, Profile tab (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-170029) | 30 (23) | I | G2,G8 | No specific defect established | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:170241 · Capabilities · Capability editor, Documents tab (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-170241) | 18 (12) | I | G2,G8 | No specific defect established | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:170390 · Capabilities · Delete capability (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-170390) | 17 (14) | I | G2,G8 | No specific defect established | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:170528 · Capabilities · Registrations and codes (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-170528) | 17 (14) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |

### Opportunities and relevant budget programs

Owner: Portfolio frontend; existing Intelligence/Opportunity owners.

Source: `apps/web/src/features/portfolio/opportunities/OpportunitiesPage.tsx`, `apps/web/src/features/portfolio/opportunities/OpportunityResults.tsx`, `apps/web/src/features/portfolio/opportunities/RelevantPrograms.tsx`.

Acceptance choices: **PF-opportunities-1** — Flag-off/loading/empty/error states retain explicit availability and no inferred saved/eligibility count. **PF-opportunities-2** — Unknown eligibility/deadline/value remain unknown; do not treat recommendations as awards. **PF-opportunities-3** — Only current admitted destinations expose detail actions; absent deployment/config stays unavailable.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:170699 · Client profile · Opportunities (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-170699) | 8 (6) | H | G2,G13 | PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:170856 · Client profile · Opportunities · loading (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-170856) | 8 (6) | I | G2,G8 | PFG-07 | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:170917 · Client profile · Opportunities · flag off (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-170917) | 8 (6) | I | G2,G8 | PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:171023 · Client profile · Opportunities · empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171023) | 6 (4) | I | G2,G8 | PFG-07 | S-PERMISSION, S-EMPTY, C-RESPONSIVE |
| [1064:171092 · Client profile · Opportunities · error (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171092) | 6 (4) | I | G2,G8 | PFG-07 | S-PERMISSION, S-ERROR, C-RESPONSIVE |

### Bill Tracker table/board, updates and watchlists

Owner: Portfolio frontend; Core/Legiwatch watchlist owners.

Source: `apps/web/src/features/portfolio/bill-tracker/BillTrackerPage.tsx`, `apps/web/src/features/portfolio/bill-tracker/BillDrawer.tsx`, `apps/web/src/features/portfolio/bill-tracker/TrackBillDialog.tsx`, `apps/web/src/features/portfolio/bill-tracker/WatchlistDialog.tsx`.

Acceptance choices: **PF-bill-tracker-1** — Current tracked counts and loading/empty/error/flag-unavailable states are honest; material-change/coverage dashes are not zero. **PF-bill-tracker-2** — Track/untrack/configuration and alert preferences require current client/role/version controls. **PF-bill-tracker-3** — Pass likelihood and bill actions are owner-supplied facts; no inference from legislative stage.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:171199 · Client profile · Bill Tracker · table (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171199) | 14 (12) | H | G2,G14 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:171305 · Client profile · Bill Tracker · board (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171305) | 19 (17) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:171392 · Client profile · Bill Tracker · loading (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171392) | 8 (6) | I | G2,G8 | No specific defect established | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:171469 · Client profile · Bill Tracker · empty (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171469) | 7 (5) | I | G2,G8 | No specific defect established | S-PERMISSION, S-EMPTY, C-RESPONSIVE |
| [1064:171531 · Client profile · Bill Tracker · error (1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171531) | 7 (5) | I | G2,G8 | No specific defect established | S-PERMISSION, S-ERROR, C-RESPONSIVE |
| [1064:171595 · Bill Tracker · Track a bill (dialog)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171595) | 15 (12) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:171756 · Bill Tracker · Bill updates drawer](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-171756) | 9 (7) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |

### Client Calendar, Meeting Library and meeting workspaces

Owner: Portfolio frontend; Core calendar/artifact owners; Meri attendance separately admitted.

Source: `apps/web/src/features/portfolio/calendar/CalendarPage.tsx`, `apps/web/src/features/portfolio/calendar/MeetingDetail.tsx`, `apps/web/src/features/portfolio/calendar/MeetingForm.tsx`, `apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx`, `apps/web/src/features/portfolio/calendar/preparation/MeetingPreparation.tsx`, `apps/web/src/features/portfolio/calendar/debrief/DebriefGeneration.tsx`, `apps/web/src/features/portfolio/calendar/library/MeetingLibrary.tsx`.

Acceptance choices: **PF-calendar-meetings-1** — Month/week/agenda and library filters retain exact client/meeting/artifact current authority. **PF-calendar-meetings-2** — Upcoming/completed/empty/unavailable/preparing/debriefing/save-error/unsaved component variants bind actual source statuses. **PF-calendar-meetings-3** — Prep/email/share/unshare/assignment/source/upload/manual/PDF actions use exact current versions and explicit approvals; opening never sends. **PF-calendar-meetings-4** — Personal/private artifacts remain private until accepted sharing; no provider/attendance/generation grant inferred from navigation.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:159777 · Overlay · Event popover (HASC markup)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159777) | 1 (0) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:177487 · Client Calendar · Meetings · Agenda](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177487) | 17 (11) | H | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:177692 · Client Calendar · Meeting workspace · Prep](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177692) | 27 (19) | I | G2,G8 | No specific defect established | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:177734 · Client Calendar · Meeting workspace · Debrief](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177734) | 24 (18) | I | G2,G8 | No specific defect established | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:177776 · Client Calendar · Meeting Library · Anduril](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177776) | 13 (6) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:177997 · Meeting details · Fallon office · Anduril](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177997) | 12 (9) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:177999 · Meeting details · Staff call · Anduril](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-177999) | 12 (9) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178001 · Meeting details · Strategy review · Anduril](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178001) | 9 (7) | I |  | No specific defect established | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:178003 · Meeting details · HAC-D staff call](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178003) | 12 (9) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178005 · Meeting details · FY27 counter-UAS staff briefing](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178005) | 18 (12) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178007 · Meeting details · SAC-D defense staff call](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178007) | 12 (9) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178009 · Meeting dialog · new](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178009) | 15 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178046 · Meeting dialog · edit-prep](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178046) | 15 (3) | I |  | No specific defect established | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:178079 · Meeting dialog · edit-notes](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178079) | 5 (3) | I |  | No specific defect established | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:178092 · Meeting dialog · edit-debrief](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178092) | 5 (3) | I |  | No specific defect established | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:178105 · Meeting dialog · prep-settings](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178105) | 8 (4) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178125 · Meeting dialog · email-prep](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178125) | 11 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178151 · Meeting dialog · upload-source](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178151) | 6 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178166 · Meeting dialog · voice-source](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178166) | 5 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178180 · Meeting dialog · manual-source](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178180) | 5 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178193 · Meeting dialog · share](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178193) | 7 (7) | I |  | No specific defect established | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:178209 · Meeting dialog · attendees](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178209) | 2 (2) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178226 · Meeting dialog · send-meri](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178226) | 7 (5) | I |  | No specific defect established | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:178242 · Meeting dialog · preparing](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178242) | 4 (4) | I |  | No specific defect established | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:178252 · Meeting dialog · debriefing](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178252) | 3 (3) | I |  | No specific defect established | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:178261 · Meeting dialog · add-notes](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178261) | 5 (3) | I |  | No specific defect established | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:178274 · Meeting dialog · sync](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178274) | 2 (2) | I |  | No specific defect established | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1064:178283 · Meeting dialog · pdf](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178283) | 3 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178301 · Meeting dialog · unshare](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178301) | 3 (3) | I |  | No specific defect established | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:178311 · Meeting dialog · manual-meeting](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178311) | 13 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178343 · Meeting dialog · save-error](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178343) | 3 (3) | I |  | No specific defect established | S-PERMISSION, S-ERROR, S-WRITE, C-RESPONSIVE |
| [1064:178353 · Meeting dialog · prep-sources](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178353) | 2 (2) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:178368 · Meeting dialog · assignment](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178368) | 5 (2) | I |  | No specific defect established | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:178379 · Meeting dialog · unsaved](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178379) | 4 (3) | I |  | No specific defect established | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:178386 · Meeting dialog · debrief-pdf](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-178386) | 4 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:179138 · Meeting Library · Artifact type menu](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179138) | 4 (4) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:179144 · Meeting Library · Visibility menu](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179144) | 3 (3) | I |  | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:179149 · Client Calendar · Meetings · Month (Anduril, 1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179149) | 15 (12) | I | G2,G16 | No specific defect established | S-PERMISSION, C-RESPONSIVE |
| [1064:179266 · Client Calendar · Meetings · Week (Anduril, 1440)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179266) | 12 (9) | I | G2,G8 | No specific defect established | S-PERMISSION, C-RESPONSIVE |

### Prospect overview, pipeline, details and contacts

Owner: Portfolio frontend; Core prospect/conversion/billing owners.

Source: `apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx`, `apps/web/src/features/portfolio/prospects/ProspectDetail.tsx`, `apps/web/src/features/portfolio/prospects/ProspectPipeline.tsx`, `apps/web/src/features/portfolio/prospects/ProspectEditor.tsx`, `apps/web/src/features/portfolio/prospects/contacts/ProspectContacts.tsx`, `apps/web/src/features/portfolio/prospects/conversion/ProspectClientLink.tsx`.

Acceptance choices: **PF-prospects-1** — Pipeline stages/owner/next-step/contact/notes operations preserve canonical current stage and scope. **PF-prospects-2** — Conversion cannot invent new billing/prospect carry-over; existing approved link flow differs from prototype automatic conversion. **PF-prospects-3** — Filter/search/current prospect ID/version and changed/revoked access fence every command.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:179393 · Prospect · Overview](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179393) | 12 (9) | H | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:179607 · Prospect · Files](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179607) | 7 (4) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:179981 · Prospect · View switcher (menu)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179981) | 13 (8) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:180245 · Prospect · Stage dropdown (menu)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-180245) | 10 (6) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:180498 · Prospect · Convert · Billing gate (modal)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-180498) | 12 (8) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1064:180749 · Prospect · Convert · Review and confirm (modal)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-180749) | 14 (10) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:181002 · Prospect · Convert · Success (modal)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-181002) | 10 (6) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, S-SUCCESS, S-WRITE, C-RESPONSIVE |
| [1064:186302 · Prospect · Company details](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-186302) | 7 (7) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:186414 · Prospect · Edit details · Company Info](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-186414) | 21 (7) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:186568 · Prospect · Edit details · Government Registration](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-186568) | 24 (8) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, S-DRAFT, S-PARTIAL, S-WRITE, C-RESPONSIVE |
| [1064:186725 · Prospect · Edit details · Sector & Tracks](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-186725) | 23 (8) | I | G2,G3 | PFG-04, PFG-07 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |

### Prospect brief, rich Workspace and proposals

Owner: Portfolio/Workspace frontend; existing brief/proposal/mail owners.

Source: `apps/web/src/features/portfolio/prospects/brief/ProspectBrief.tsx`, `apps/web/src/features/portfolio/prospects/brief/BriefViewer.tsx`, `apps/web/src/features/portfolio/prospects/proposals/ProspectProposals.tsx`, `apps/web/src/features/portfolio/files/ProspectFiles.tsx`.

Acceptance choices: **PF-prospect-workspace-1** — Editor/save/preview payload parity and intentional placeholders are preserved through rich text operations. **PF-prospect-workspace-2** — Create/send/shared/published prototype paths remain unavailable unless a concrete owner operation is admitted. **PF-prospect-workspace-3** — A missing record/feature error does not authorize a fresh send or generated result.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:179728 · Prospect · Workspace](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179728) | 8 (7) | I | G2,G3 | PFG-07 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:179802 · Prospect · Federal strategy brief](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179802) | 4 (3) | I | G2,G3 | PFG-07 | S-PERMISSION, C-RESPONSIVE |
| [1064:179917 · Prospect · Proposal](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-179917) | 2 (1) | H | G2,G3 | PFG-07 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:181229 · Prospect · Create proposal (modal)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-181229) | 11 (10) | I | G2,G3 | PFG-07 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1064:181371 · Prospect · Send proposal (modal)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-181371) | 6 (4) | I | G2,G3 | PFG-07 | S-PERMISSION, S-DRAFT, S-WRITE, C-RESPONSIVE |
| [1064:181485 · Prospect · Proposal sent (modal)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-181485) | 3 (3) | I | G2,G3 | PFG-07 | S-PERMISSION, S-SUCCESS, S-DRAFT, C-RESPONSIVE |

### Fill with Meri Portfolio research/review states

Owner: Portfolio/Core profile-enrichment owner; Meri frontend separately owned.

Source: `apps/web/src/features/portfolio/client-profile/enrichment/ClientEnrichmentDialog.tsx`, `apps/web/src/features/portfolio/client-profile/enrichment/queries.ts`.

Acceptance choices: **PF-profile-enrichment-1** — Setup/running/partial/admin/evidence/standard/confirm/result/rejected/assignment/refreshed/retryConfirm/success are distinct observed states. **PF-profile-enrichment-2** — Retry only admitted failed tasks and preserve completed findings; no ACS/LODES ingestion is implied. **PF-profile-enrichment-3** — Field findings/role actions/source evidence and unknown apply results require actual current backend semantics; no Fable runtime edits in this audit.

| Frame/state | Controls (reactive) | Context | Shared groups | Gaps | State-specific checks |
|---|---:|---|---|---|---|
| [1064:159828 · Overlay · Client · Meri actions menu](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159828) | 4 (2) | I |  | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1064:160174 · Overlay · Client · Fill with Meri (review drawer)](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-160174) | 14 (4) | I |  | PFG-06 | S-PERMISSION, S-DRAFT, C-RESPONSIVE |
| [1126:274828 · Capiro 3.4 / Fill with Meri / Overlay / running](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274828) | 5 (5) | I |  | PFG-06 | S-PERMISSION, S-LOADING, C-RESPONSIVE |
| [1126:274852 · Capiro 3.4 / Fill with Meri / Overlay / partial](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274852) | 5 (5) | H |  | PFG-06 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1126:274876 · Capiro 3.4 / Fill with Meri / Overlay / admin](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274876) | 40 (21) | I |  | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1126:274900 · Capiro 3.4 / Fill with Meri / Overlay / evidence](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274900) | 4 (4) | I |  | PFG-06 | S-PERMISSION, S-PARTIAL, C-RESPONSIVE |
| [1126:274924 · Capiro 3.4 / Fill with Meri / Overlay / standard](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274924) | 20 (12) | I |  | PFG-06 | S-PERMISSION, C-RESPONSIVE |
| [1126:274948 · Capiro 3.4 / Fill with Meri / Overlay / confirm](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274948) | 4 (4) | I |  | PFG-06 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1126:274972 · Capiro 3.4 / Fill with Meri / Overlay / result](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274972) | 4 (4) | I |  | PFG-06 | S-PERMISSION, S-SUCCESS, C-RESPONSIVE |
| [1126:274996 · Capiro 3.4 / Fill with Meri / Overlay / rejected](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-274996) | 4 (4) | I |  | PFG-06 | S-PERMISSION, S-ERROR, C-RESPONSIVE |
| [1126:275020 · Capiro 3.4 / Fill with Meri / Overlay / assignment](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-275020) | 4 (4) | I |  | PFG-06 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1126:275044 · Capiro 3.4 / Fill with Meri / Overlay / refreshed](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-275044) | 5 (5) | I |  | PFG-06 | S-PERMISSION, S-SUCCESS, C-RESPONSIVE |
| [1126:275068 · Capiro 3.4 / Fill with Meri / Overlay / retryConfirm](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-275068) | 4 (4) | I |  | PFG-06 | S-PERMISSION, S-WRITE, C-RESPONSIVE |
| [1126:275092 · Capiro 3.4 / Fill with Meri / Overlay / success](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-275092) | 3 (3) | I |  | PFG-06 | S-PERMISSION, S-SUCCESS, C-RESPONSIVE |
| [1126:275922 · Capiro 3.4 / Fill with Meri / State coverage](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1126-275922) | 11 (10) | I |  | PFG-06 | S-PERMISSION, C-RESPONSIVE |

## Responsive references and local components

All104 non-desktop frames remain in CHECKLIST.json with explicit TABLET_RESPONSIVE_REFERENCE_UNQUALIFIED or PHONE_DEFERRED_UNQUALIFIED_UNWAIVED scope. They are not counted as desktop execution coverage. The tablet Portfolio context181565 is a layout reference only. Small336px cascaders and660px desktop dialogs remain desktop components because their hierarchy is desktop; width alone does not determine device.

Portfolio-local Meeting workspace set178407 has Prep/Notes/Debrief across Upcoming/Completed/Draft/Sources/Empty/Unavailable. Workspace document-row set190303 has Wide/Compact and Draft/Completed. Exact12 variants, text, controls, properties and source/test references are in [LOCAL-COMPONENTS.json](LOCAL-COMPONENTS.json). The shared Components page2:107 belongs to the separate shared audit owner.

## Acceptance catalog and limits

The full common/state acceptance catalog lives in CHECKLIST.json. Core checks cover exact prototype trigger references, focus/keyboard, dismiss-without-write, current scoped selection, immutable command recovery, current resource receiving and desktop/tablet overflow. State checks distinguish loading, empty, error, permission, success, draft, partial and versioned write behavior.

Prototype variable changes, success frames and labels are illustrative design intent. They do not establish saved state, command receipt, current resource authorization, automatic Meri behavior, backend coverage or billing authority. Current source unavailability remains truthful until the relevant owner contract is accepted.

No source edits, browser runs, compiler/tests, install, cloud/live calls or Figma node mutations were performed. The audit uses current Figma IDs without an immutable file-version token; revalidate affected nodes if the design changes. High-fidelity screenshots were supplied inline by the Figma tool; text custody deliberately omits base64 image blocks. Only overview-reference.png was downloaded as an explicit tool-directed reference; no complete image-custody set or full-scroll parity claim is made.

See [DESIGN-GAPS.md](DESIGN-GAPS.md), [COMPLETENESS-RECEIPT.json](COMPLETENESS-RECEIPT.json) and [HANDOFF.md](HANDOFF.md) for unresolved work and evidence boundaries.
