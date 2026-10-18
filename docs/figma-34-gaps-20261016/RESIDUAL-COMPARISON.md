# Capiro 3.1 → 3.4 — completed residual comparison

Completed 17 October 2026. The earlier pass established frame presence and added review directories. This follow-up completes component and prototype-behavior comparison, expands Meri coverage, and repairs handoffs lost when the three files were split.

## Coverage

| Area | Source coverage | Result |
| --- | --- | --- |
| Meri | 178 frame entries + 14 component families | 192 unique editable target mappings; legacy meeting shell retained as superseded reference with current meeting context in 14.18 |
| Portfolio | 293 frame/region entries + five component-set families / 21 variants | All represented; four approved replacements retained |
| Modules and Settings | 537 frame entries + 19 component/component-set families | All represented; newer Newsletter, hearing and freshness states retained |
| Master Calendar | 15 screens | All desktop/tablet/phone screens retained, plus three target scope dropdowns |
| Source page boundaries | All 16 top-level children classified | No unclassified later board or missing shared product view |

These counts describe different inventory scopes and should not be summed as a product-route count. Nested regions, review/reference boards and shared entries are identified in the maps.

- [Meri source-to-target map](MERI-31-34-PARITY.csv)
- [Portfolio source-to-target map](PORTFOLIO-31-34-PARITY.csv)
- [Modules source-to-target map](MODULES-31-34-PARITY.csv)
- [Portfolio component-family map](PORTFOLIO-COMPONENT-PARITY.csv)

## Actual residual repairs

**Portfolio:** 335 controls repaired. All 84 original non-header cross-area source actions now have current destinations. Repairs cover client Workspace/document rows, Planner, directory people/committee links, Template Studio, Strategies pulse rows, avatars and notification handoffs. Contextual client calendars stay in the local meeting views; the top-bar calendar opens the global view. [Details](PORTFOLIO-RESIDUAL-COMPLETION.md).

**Meri:** 123 distinct nodes changed. Templates, usage, feedback, privacy and connector-permission links now open the current Meri views. All 245 Updates and 245 Profile controls work, including shared Search/Quick Log headers; 24 lost Preferences links were restored. The light/dark landing keeps empty Send disabled. Clicking its input previews the canonical filled example, whose Send enters Allocation pending and keeps the original separate from a next draft. [Details](MERI-RESIDUAL-COMPLETION.md).

**Modules and Settings:** 1,131 unique layers changed, including 1,086 controls restored from 117 original click rules and 37 responsive hub returns. Updates, legacy Meri-preference navigation, client/objective context, meeting-prep, Settings and profile handoffs were restored. Existing conditional logic and variable assignments were retained. Four current/self controls, 22 obscured backing-page controls and three selected profile avatars remain intentionally inactive. [Details](MODULES-RESIDUAL-COMPLETION.md).

## Intentional changes stay in place

Source 3.1 is a coverage reference. Existing approved 3.4 designs remain canonical: merged Government/Federal tabs, ten-category Location profile, five-field Objective intake, multiple-project/shared-task links, current memory filters/proposal lifecycle, separate routine states, safe delivery/recovery, hearing-focused LegiWatch and expanded Newsletter.

The hidden Paused, Disabled and Cancelled notices on the old Routine history summary are not missing actions. Their separate 3.4 states retain Resume, Review access and confirmation/acknowledgement paths. The obsolete simultaneous notices were not reactivated.

Newsletter remains Modules → Workspace → Workflows. The Workspace gallery offers Newsletter and Hill Day Schedule only. Dashboard stays separate; prior removals are not reintroduced.

## Shared and continuation evidence

All 13 shared Search/Quick Log views have matching text fingerprints and viewport dimensions in each split file. The calendar-handoff board, palette and wiring-review reference also match in each file. Reference logo and Info Tip variants remain present.

| Source | Target ID in each split file |
| --- | --- |
| Search desktop 411:42489 | 1064:141068 |
| Search tablet 411:80392 | 1064:141241 |
| Search phone 411:85146 | 1064:141406 |
| Meeting search result 411:64218 | 1064:141557 |
| Quick Log 649:140568 / 649:141141 / 649:141751 | 1064:141600 / 1064:141773 / 1064:141959 |
| Member Quick Log 649:142341 / 649:142933 / 649:143506 / 649:143994 | 1064:142178 / 1064:142381 / 1064:142586 / 1064:142772 |
| Quick Log tablet 650:142701 / phone 650:142935 | 1064:142879 / 1064:143044 |
| Calendar handoff 984:187909 | 1064:270323 |
| Palette 411:123897 | 1064:140889 |
| Wiring review 600:136956 | 1064:141593 |

All eight loose continuation boards already appear in the Portfolio map, including the shared calendar handoff. Three loose component sets are preserved with 2/4/3 variants. Old 3.1 labels in copied wiring/reference annotations describe their source; they are not missing product screens.

## Validation and limits

Portfolio's recursive graph resolves 8,807 NODE actions to 555 unique local destinations, with zero missing destinations; all 84 cross-area source action checks pass. Meri resolves 7,379 NODE actions to 351 local destinations with zero missing destinations; its empty/typed/pending distinctions and light/dark appearance passed final checks. Modules checked 22,007 NODE actions and 2,214 Figma URL actions with zero invalid destinations, retaining 10,099 variable assignments.

No missing component-based product screen was found outside the earlier FRAME-only inventories. Existing native editable components and current 3.4 updates were preserved. Layouts were unchanged by wiring repairs, except Meri's deliberately disabled empty Send treatment, which was visually checked.

Prototype examples retain their existing synthetic/representative client semantics. In particular, source generic client rows that already opened an Anduril fixture remain representative prototype routes; this does not establish real client binding. The work qualifies Figma coverage and links, not live authentication, admission, authorization, persistence, backend integration or deployment. No source 3.1 or application/backend change was made.
