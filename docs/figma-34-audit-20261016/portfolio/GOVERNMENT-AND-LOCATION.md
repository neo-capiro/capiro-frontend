# Government, federal activity and District Nexus — current Portfolio 3.4

This is a read-only design audit of Figma `mpXWnySldUFzdVna8i69Ki`, compared with frontend base `3ef15d9a`. It does not establish backend availability or rendered visual parity.

## Current design already contains the requested structure

One visible combined summary, [1064:158951](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158951), opens the **Government & federal profile** modal with [Identity & registration](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159414) and [Federal activity](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159495) tabs. The old Federal footprint tile `1064:158952` is explicitly **hidden** in the actual node properties; it must not become a second entry.

The [District Nexus map](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-158954) remains visible. Its five markers open specific location overlays:

- Headquarters: marker `1064:159001` → [1118:278629](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-278629).
- Arsenal-1: marker `1064:159005` → [1064:159626](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159626).
- Huntsville office: marker `1064:159002` → [1118:279240](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279240).
- Lexington office: marker `1064:159004` → [1118:279545](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279545).
- Washington office: marker `1064:159003` → [1118:279850](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279850).

Arsenal-1 and Headquarters were inspected through full high-fidelity context and screenshots. Their scrollable modal preserves six section anchors and all ten required categories; the other location families are included in the complete current hierarchy inventory.

## Ten-category acceptance map

1. **Locations and districts** — [1118:278964](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-278964). Saved facility/address, House/state districts, resolution method and evidence; incomplete address must not imply verified geography.
2. **Client economic footprint** — [1118:279012](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279012). Planned/estimated/current employment remain distinct. Period, currency, geographic basis and supporting record accompany payroll/investment/tax/supplier/spend measures.
3. **Unemployment** — [1118:279051](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279051). ACS five-year district estimates require dataset year, unemployed population, civilian labor force, rate and retrieval/coverage; district figures are not client employment.
4. **Workforce and commuting** — [1118:279074](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279074). Validated district aggregates only; absent LODES is explicitly unavailable, not inferred from facility staff previews.
5. **Representation and committees** — [1118:278989](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-278989). Current representative/senators and committees follow verified geography and source freshness.
6. **Contracts and grants** — [1118:279088](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279088). Require recipient identity and geographic attribution; show DoD-contract/all-agency-assistance coverage. Opportunities remain separate potential funding.
7. **Strategic relevance** — [1118:279116](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279116). Use actual linked Objective/capability/PE/bill/target/Strategy references; physical presence alone creates no score or policy alignment.
8. **Member priorities** — [1118:279104](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279104). Public office/fiscal-year/project/request-outcome stage/source; public priority is not automatically a client award.
9. **Engagement context** — [1118:279132](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279132). Only matched office relationships/outreach/shared meetings/next actions; general client activity must not be attributed to the location.
10. **Changes and evidence** — [1118:279153](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279153). Keep observation, reporting period, retrieval date and review status distinct; missing is not zero; stale values preserve period; conflicts require review.

## Precise remaining mockup requests

- **LOC-STATE-01**, nearest [1064:159626](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159626): Show loading; whole-modal failure+retry; independently failed/unavailable section; permission-revoked or location moved while open. Preserve map selection and do not reveal a forbidden record.
- **LOC-STATE-02**, nearest [1064:159626](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159626): Show one verified populated example plus stale, conflicting and manual-review cases with reporting period, dataset vintage, retrievedAt and geographic basis separately. Use clearly synthetic examples.
- **LOC-ECON-01**, nearest [1118:279012](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1118-279012): Supply the structured economic evidence entry/edit/import-review/error/unknown-save dialog or drawer referenced by Add supported figures copy. Current inspected frames provide descriptive text, not a complete form workflow.
- **GOV-STATE-01**, nearest [1064:159414](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-159414): Supply consolidated identity/federal-tab loading, no authorized match, source failure, partial coverage, stale/conflicting identity match and permission states. Keep program funding context distinct from attributed awards.

No new base location-detail mockup is needed: the baseline ten-category design exists. Missing states and data-entry flows need the explicit additions above. Backend owners must verify actual sources, permissions and attribution independently; unavailable LODES or award coverage must stay unavailable. Phone/tablet nodes are inventoried for lineage only; desktop implementation remains the priority.

