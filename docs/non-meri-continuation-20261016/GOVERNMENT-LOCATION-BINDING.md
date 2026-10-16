# Combined Government profile and location evidence

This source candidate extends the existing Portfolio client profile. It starts at frontend PR56 `3ef15d9a8ae6a27a9c2f39ccd923b5e2e07797cd`; it does not modify the sealed `9da3616a` shipment or its qualification receipts.

## Design and navigation

The single summary entry follows Portfolio Figma `1064:158951`. Its saved SAM status is explicitly profile data; the illustrated funding amount is replaced by unavailable, never copied as a fact. The existing client-details fields remain available. The whole entry opens the canonical Dialog with Identity & registration and Federal activity sections, corresponding to `1064:159414` and `1064:159495`. Identity preserves all thirteen fields, catalog fallbacks and the unverified-registration notice.

District Nexus retains its existing facilities query, map, location list, map enlargement and marker-selection owners. A selected facility opens the same `FacilityDetailDialog`; no duplicate location store is created. Its expanded layout follows visible location modal `1118:278937` in frame `1064:159626`, with the ten existing design categories:

| Category | Figma node | Receiving/source owner |
| --- | --- | --- |
| Location and geography | `1118:278964` | Current saved Facility, existing geocoding/edit/remove owners |
| Client economic footprint | `1118:279012` | Existing economic-footprint evidence; only exact promotedFacilityId attribution |
| Unemployment | `1118:279051` | Public economic-context ACS unemployment_rate_percent, separate source years |
| Workforce and commuting | `1118:279074` | Actual returned LODES district metrics, otherwise unavailable |
| Representation and committees | `1118:278989` | Existing representation resolver; on-demand Directory member snapshot by exact Bioguide |
| Contracts and grants | `1118:279088` | Selected district's confirmed client award measures, separate from public awards |
| Strategic relevance | `1118:279116` | Existing district/client strategic owner, score/weights/coverage/freshness |
| Member priorities | `1118:279104` | Existing priority owner; public CPF/CDS and client attribution remain distinct |
| Strategy and engagement | `1118:279132` | Authorized native strategic evidence plus existing Relationships/Engagement navigation |
| Changes and evidence | `1118:279153` | Native change observations, geography vintage, warnings and separate rail freshness |

The hidden legacy modal motion targets do not bind the visible modal. The existing Dialog owns portal, dismissal, focus and reduced-motion behavior; section navigation uses visible focus and respects reduced motion. Exact visual parity remains pending. Entry icons use existing canonical primitives provisionally; no new exact asset-custody claim is made.

## Native contracts and authorization

The source-qualified backend packet is `portfolio-compatibility-audit/FINAL-HANDOFF.json`, SHA256 `0927104f42494570d73ad3fa29de8a254740091cfc38eff05aaed8df6961b101`. Its retained Core baseline is `cd3c51e940f14e1b2a1040b0ffa445e85d68b332`, with relevant application parity to audit pin `1b9fedc5bd476311d9234ca4b549ff3ebb14ab2d`. These are source contracts, not a live environment assertion. The new receiving subsets have independent exact native-type provenance in [profile-evidence/SOURCE-PINS.json](profile-evidence/SOURCE-PINS.json).

The coordinator explicitly selected the existing Portfolio authorization contract: tenant membership, role, client/status and feature checks remain with their current server owners. Existing memory-specific controls remain at their existing owners. This consolidation neither promises universal actor/client memory-wall enforcement nor relaxes a server check. Frontend account/client response fences are correctness and cache-lifetime controls, not authorization. Authentication, authorization, disabled features, unavailable sources and failed reads are never converted into empty success.

All new evidence requests are GETs through the existing Core Portfolio proxy. Each optional rail has independent loading/error/retry handling. Keys bind current actor, selected client, facility and district where applicable; response schemas verify exact client/district identity where the native response supplies it. Cancellation and actor checks run before and after the request. The program-relevance response has no client echo and can return an empty page for an unmatched or unavailable client; request scoping is not promoted into an authorization receipt. No gateway/origin, API registry, preview admission, backend schema, ingestion schedule or provider configuration changes are included.

## Attribution and unavailable fields

- Public district metrics do not establish client or facility employment, payroll or economic impact. Imported evidence is shown as location evidence only when its returned promotedFacilityId exactly matches. Facility staff and imported headcount are not added together. Review status, verification and external-use approval remain independent.
- Economic history is bounded to the returned recent evidence window, at most 1,000 rows. No complete reporting-period total is asserted. The existing structured preview/import/review path mutates state; it is not invoked by opening a modal. Its missing authoring/uncertain-save mockups remain a separate design request.
- Main award measures are nullable USD numbers. Contract obligations, grant obligations and grant outlays are never combined. A district client award is not a facility award. Opportunities, ceilings and public top awards are not substituted when client awards are absent.
- FY obligated, FY request and an exhaustive associated-program count remain unavailable in the combined summary. PE relevance is bounded and FY-agnostic; program budget positions use USD millions, while execution facts use USD strings. Native execution page-local totals mix metrics and cannot establish an obligations-only client/location aggregate. Neither relevance nor geography allocates an entire public program budget to a client.
- The Federal tab can show the existing relevance reader's bounded associated PE rows, native scores and nonmonetary reasons. It reuses the Opportunities receiving schema through a narrow public export, requests 20 rows at a time and advances only through explicit pagination. At most 400 candidates are considered by the native service. Prior-award fuzzy/UEI matches are heuristic, and their embedded historical amount text is not displayed as funding. Empty returned associations establish neither client permission nor an exhaustive absence of programs.
- Dedicated facility type is absent from the current Facility contract. LODES has an importer for prepared district aggregates but lacks the raw block-to-district producer; no ingestion is enabled and no workforce values are invented. R3 district-economic ACS refresh is source-disabled, while the separate legacy Census schedule is default-on with ACS2022; the UI does not claim all Census data is absent.
- Manually selected district Congress is displayed as unverified. The separate reviewed backend fix `6ba7506ec41538aa643c288a826b883271bc9b90` is not adopted by this frontend candidate.
- Committee detail is loaded only on demand for a returned representative's exact official identifier. Current rows use the Directory owner's endedAt-null criterion and exact member binding. Snapshot IDs, timestamps and lack of a freshness/coverage lease remain visible; empty returned associations do not prove no assignments.
- Response generated/computed time, source sync time, row observation/effective/review time, dataset year and boundary Congress remain separate. Sections do not claim a shared atomic snapshot.

## Verification status

Receiving, rendered-state and browser cases are authored separately. New Gov/location behavior has not yet run in Vitest, Playwright, full typing or default build. Memory checks repeatedly stopped those stages before launch; the Qualification heavy slot is separately coordinated. No browser parity has begun and no runtime/deployment acceptance is implied.
