# Profile evidence read-only receiving — source preparation

Owned additions only:
- `apps/web/src/features/portfolio/client-profile/profile-evidence-contracts.ts`
- `apps/web/src/features/portfolio/client-profile/profile-evidence-queries.ts`
- `apps/web/tests/profile-evidence-contracts.test.ts`
- This dedicated documentation directory.

Existing facility-map contracts/queries, FacilityDetailDialog/FacilityProfile presentation, gateway, flags, registry, mutations and backend source were not edited.

## Native source provenance

The supplied local Core type files were read at `C:/Users/neoma/Documents/Codex/2026-10-15/task-3/backend/apps/api/src/district-nexus`. Eight exact native files independently match the available frozen commit `cd3c51e940f14e1b2a1040b0ffa445e85d68b332` after line-ending normalization; canonical byte SHA256 values are in [SOURCE-PINS.json](SOURCE-PINS.json). The existing compatibility audit cites `1b9fedc5bd476311d9234ca4b549ff3ebb14ab2d` and reports identical source. That older object was unavailable in this local store (one git-show exit128); no fetch, alternate store or access workaround was attempted, and its parity is not claimed as independently rechecked here.

Native references at the verified frozen commit:
- [Economic fields129–263](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/district-nexus-economic.types.ts#L129)
- [Money/DistrictKey/SourceFreshness](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/district-nexus.types.ts#L29)
- [District strategic13–98](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/district-nexus-strategic.types.ts#L13) and [component keys18–28](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/district-nexus-strategic-weights.ts#L18)
- [Priority response110–167](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/priority-intelligence/priority-intelligence.types.ts#L110), with availability/count/freshness definitions24–108.
- [CPF/CDS projected response93–121](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/priority-intelligence/priority-intelligence-cpf-cds.ts#L93), [sector availability159–180](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/priority-intelligence/priority-intelligence-sector.ts#L159), [change severity16](https://github.com/neo-capiro/capiro-backend/blob/cd3c51e940f14e1b2a1040b0ffa445e85d68b332/apps/api/src/district-nexus/priority-intelligence/priority-intelligence-change-policy.ts#L16).

**CPF numeric witness:** persisted/raw CommunityFundingRequestRow requested/final fields49/50 and SourceOccurrence64/65 are strings. Public ProjectedCpfCdsSignal fields105/107 are number and number|null. ClientPriorityIntelligenceResponse arrays144/146 explicitly use that projected type; the producer emits parsed numeric values at211/212. The frontend validates the projected GET response, with no string/number coercion.

These are bounded receiving subsets, not a new public backend DTO or private implementation import. Arbitrary metadata, strategic refs, Priority old/new/provenance, deep federal assets, sector metrics and raw CPF occurrence rows are intentionally unprojected. Their presence in native payloads is allowed and stripped; no UI derives a replacement contract from them.

## Exported interfaces

`ProfileDistrictScope = {state:string,districtCode:string}` is normalized identity. `normalizeProfileDistrict({state:string|null,districtCode:string|null})` returns that scope or null: trim/uppercase, numeric padding, AL→00; matching STATE-code prefix accepted, conflicting prefix and>=90 source sentinels refused. This is neither current-seat validation nor an authority grant.

`ProfileEvidenceScope = {clientId:string,facilityId:string,district:ProfileDistrictScope|null}`. The facility ID is a frontend selection/cache fence, not a server assertion that the whole-client economic response belongs exclusively to that facility.

| Hook, each accepts(scope or undefined,enabled:boolean) | Exact existing Core GET suffix after /api/ | Inferred data type/schema factory |
| --- | --- | --- |
| useProfileEconomicFootprint | intelligence/clients/:clientId/district-nexus-v2/economic-footprint | ProfileEconomicFootprint / profileEconomicFootprintSchema(clientId) |
| useProfileDistrictEconomicContext | intelligence/district-nexus/districts/:state/:districtCode/economic-context | ProfileDistrictEconomicContext / profileDistrictEconomicContextSchema(normalizedDistrict) |
| useProfileDistrictStrategic | intelligence/district-nexus/districts/:state/:districtCode/strategic?clientId=:clientId | ProfileDistrictStrategic / profileDistrictStrategicSchema(clientId,normalizedDistrict) |
| useProfileDistrictPriority | intelligence/clients/:clientId/district-nexus-v2/priority-intelligence?state=:state&district=:districtCode | ProfileDistrictPriority / profileDistrictPrioritySchema(clientId,normalizedDistrict) |

Each hook returns existing React Query status/error/refetch plus `enabled`, `scopeAvailable` and data masked unless current enabled+actor+success+no-error. These booleans describe frontend query readiness, not backend policy/data availability. Footprint can read with district:null; the three district hooks stay disabled without valid district identity. There is no cross-rail fallback or combined success.

The cohesive private query owner uses existing useApi/useProfileActor/assertProfileActor/profileReadKey. Cache keys bind actor,client,facility,state,district. It checks AbortSignal before request and after await, and current ProfileActor before and after the request. Response schemas fence exact client identity and, where present, all canonical districtKey/state/code fields. Paths are fixed GETs; IDs are encoded. No new store, API flag, credential source, writer/importer or automatic retry command is added.

Existing Core Portfolio proxy permits the intelligence root and supplies tenant/session transport. Backend flags and actual role/client checks remain authoritative. Source audit explicitly does not establish per-actor client-memory-wall checks on these existing Nexus routes. These frontend fences do not repair or qualify that backend boundary. Disabled flags/missing data/404/error remain query errors; none is synthesized as200-empty.

## Presentation constraints for root integration

- Money, employee counts, beneficiary counts, scores, credits and absent source years retain native nulls; no null→0 or numeric string coercion.
- Economic footprint is a whole-client bounded evidence window (up to1000 evidence rows/50 imports), not one facility's comprehensive annual/lifetime total. Do not sum it with existing promoted-facility employment.
- Public ACS/CBP/LODES facts retain source/dataset/sourceYear/boundaryCongress/MOE/status and original order/vintages. They are district context, not client payroll/jobs. GeneratedAt is response time, not source freshness.
- Strategic and Nexus scores remain separate. Missing/unavailable/stale, unknown freshness and versioned test weights remain visible.
- CPF districtRequests and clientRequests remain separate. Preserve House CPF/Senate CDS, explicit statewide geography, numeric requested/final amount distinction, raw amount stage and nullable clientAttribution. A request is not an award.
- Priority preserves source availability, federal detailed-vs-summarized counts, nullable geography vintage, safe recent-change identity/date/year/severity and warnings. Arbitrary provenance objects are not rendered.
- Representation supplies no committee/contact/staff DTO; this read work does not invent one.

## Verification status

Five focused synthetic schema tests were authored for normalization/sentinels, null money, wrong client/district, public failed sources/vintage, strategic absence and projected CPF numeric/attribution preservation. **All five remain UNRUN.** No TypeScript compiler, formatter, browser, test runner, install, network/provider, DB or runtime activation was executed. Source parity checks loaded no product modules. Actual source/runtime/route qualification remains with the coordinator.

Current source byte hashes before integration/formatting:
- contracts:bb9f952d3bbb077ab4174e210c5717938efa62e72e9ebb6a5ca80619887ccf01
- queries:aa67a98f61233ea1bca503143a8e903c4d3c16989d2a55f3c53a70bf9d086261
- tests:244fdfd9392f18b24e22c123b850eb28aff620840f0455113024c2511675f8b8

