# Capiro 3.4 — 3.1 coverage and split-file navigation

Follow-up audit on 17 October 2026 against the 3.1 prototype in the original design file. This supplements the earlier gap-state handoff and preserves its newer designs.

## Files and product entry points

| Area | Design file | Product prototype |
| --- | --- | --- |
| Meri | [Capiro 3.4 Meri](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri) | [Meri home](https://www.figma.com/proto/IXJzJUkXcUTkySHir5JNea/Capiro-3.4-Meri?page-id=1064%3A140864&node-id=1064-144075&starting-point-node-id=1064%3A144075) |
| Portfolio | [Capiro 3.4 Portfolio](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio) | [Portfolio landing](https://www.figma.com/proto/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?page-id=1064%3A140864&node-id=1064-153351&starting-point-node-id=1064%3A153351) |
| Modules, Workspace and Settings | [Capiro 3.4 Modules](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules) | [Modules hub](https://www.figma.com/proto/zGvvF6V6hh7yweoplCdpdE/Capiro-3.4-Modules?page-id=1064%3A140864&node-id=1064-191436&starting-point-node-id=1064%3A191436) |

Portfolio remains in the Portfolio file. Modules, Workspace and Settings remain in the Modules file. Dashboard remains separate. The original 3.1 design was read only.

## Source coverage

| Scope | 3.1 entries mapped | Result |
| --- | ---: | --- |
| Portfolio, including responsive views and continuation boards | 293 / 293 | All eleven families represented; four intentional replacements documented |
| Modules, including Workspace and Settings | 537 / 537 | All fourteen families represented, with expanded Newsletter and newer state designs retained |
| Shared Master Calendar | 15 / 15 | Nine desktop, three tablet and three phone screens retained, plus three scope dropdown overlays |

The detailed CSVs provide a source and target Figma URL for every mapped entry:

- [Portfolio source-to-target map](PORTFOLIO-31-34-PARITY.csv)
- [Modules source-to-target map](MODULES-31-34-PARITY.csv)

The CSV statuses describe design equivalents and intentional replacements. Navigation and Newsletter breadcrumbs were subsequently improved; a row marked equivalent is a coverage mapping, not a claim that its current text or prototype reactions are byte-identical to 3.1. Modules' final mapping records 520 equivalents, 13 updated equivalents and four expanded Newsletter replacements, including the two responsive LegiWatch views updated to the hearing experience. Both maps use a unique target ID for every source entry.

Portfolio replacements preserve Government information and Federal activity in the combined modal, expand District nexus into the ten-category Location profile, and replace the old blank Objective screen with the current five-field intake. The newer Portfolio gap review set remains present.

Modules retains the newer Newsletter template selection, editor, preview and Outreach staging screens in place of the four older workflow references. The newer Newsletter empty canvas, populated example and first edit remain distinct. Template Studio and Strategy freshness/recovery states remain present.

## Product and review navigation

Product mode switches lead to the actual home or hub above. A design-review screen directory is separate from the product navigation and lets reviewers locate individual screens, dialogs and responsive states.

- [Portfolio full directory](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3069-54192): 24 catalog pages with 398 design entries, including all eleven families, continuation boards and recent updates.
- [Modules full directory](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3060-110154): all fourteen families, Workspace, Settings and the shared calendar.

The original calendar count of 21 described direct section children, including six annotation text nodes. The screen-only comparison is 15 source frames, all present in 3.4; the target adds three scope dropdown overlays.

The [Portfolio directory export](PORTFOLIO-34-SCREEN-DIRECTORY.csv) lists its native target and catalog URLs. Some source entries are nested dialog or form regions rather than standalone product screens; their source and target context is preserved in the parity map. The 293 Portfolio mappings use 293 unique target IDs, including distinct desktop and phone alert-dialog regions.

Newsletter belongs to Modules → Workspace → Workflows → Newsletter. The Workspace workflow gallery keeps Newsletter and Hill Day schedule as its two available workflows. Its launch links lead to the normal workflow screens; the blank/example/first-edit gap examples remain additional states.

The global calendar opens from the top bar and supports the existing master/client filter design. The actual master-month destination is [1064:268265](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=1064-268265). It is distinct from a client profile calendar.

For Meri, every one of the 245 header instances was checked: Portfolio, Modules and Master calendar each resolve to the intended split-file product destination (735 controls in total). The calendar repair retained 612 filter-variable actions and 490 hover/press reactions. The recent safe-delivery, recovery, partial-history and meeting-context section remains present and unchanged by the navigation repair.

Previously removed functionality is not reinstated by parity: Strategy has no Kanban; LegiWatch remains hearing-focused with Bill Tracker in Portfolio; MCP connections belong in Meri; Admin Skills, Policy Packs and Onboarding stay removed. Settings keep the role separation already agreed.

## Review checks

Portfolio's new index and 24 catalogs use native editable text, auto layout, existing token bindings and button instances. The 398 directory entries have 880 actions leading to 423 unique destinations, with no missing or self destinations. Native text bounds and font checks passed for the 25 new index/catalog frames. Product links were repaired for 227 Meri, 227 Modules, 227 Master calendar and 204 Settings controls; calendar routing retained 558 existing variable-reset actions.

The Modules directory includes smaller dialogs and all 17 small Cascader overlays, alongside full screen states. The 747 retained Module entries and 18 calendar entries make 765 directory entries across 35 catalog pages. Its 896 native links resolve to 801 unique destinations, with zero missing destinations, text bounds issues or duplicate mode click reactions. An independent read-only review checked the source frame boundaries, responsive Portfolio mapping ambiguity, directory screenshots, actual workflow gallery destinations and Newsletter hierarchy, and found no critical missing screen or hierarchy issue.

Representative screenshots of the new indexes/catalogs and the existing product entry points were reviewed. These checks do not assert that every existing 3.1 mutation flow was individually clicked or that any backend is qualified.

## Qualification

This is a Figma coverage, organization and prototype-navigation audit. Source-to-target presence does not establish live endpoint wiring, persistence, authorization, data freshness or production readiness. The earlier backend integration audit and the implementation lane retain those responsibilities. No application code, API contracts, backend settings, deployment configuration or shared data were changed in this follow-up.
