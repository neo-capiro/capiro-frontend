# Client Portfolio onboarding implementation plan

Status: proposed implementation plan; this PR does not ship runtime changes.
Source handoff: `capiro-onboarding-handoff.zip`, dated 2026-11-03, including
`IMPLEMENTATION_HANDOFF.md`, its interactive prototype, and screenshots.
The prototype uses synthetic data and simulated research. Its proposed source
folders are not present in the supplied ZIP; implement against the live repos.

## Scope and decisions

Build one Client Portfolio workflow for adding clients and prospects: company
identification, live sourced profile build, manual entry, LDA import, review,
capabilities, alignment, relationships, and a sourced case for support.
Objectives, Strategy, and Planner remain separate work.

Only `neo-capiro/capiro-frontend` and `neo-capiro/capiro-backend` are implementation
targets. Do not use `capirov2`. The reviewed baselines are frontend `main` at
`36359c4868ce95cddd48439f2524555b4cfd004f` and backend `backend-import` at
`471e3451b48674d881b395b354ea5b1292b698ca`.
The backend PR starts from `4254a1cd7e5933197065bb698a5600288af65121`;
the intervening DIBBS change was checked and does not alter these profile owners.

| Decision | Implementation direction |
| --- | --- |
| Existing pipeline | Reuse the existing durable fill run/task/finding pipeline, source adapters, retries, review, rejection memory, and apply transactions. |
| Fill with Meri | Remove the standalone feature, its entry point, obsolete dialog and unused code. Surviving pipeline code becomes the shared profile-build implementation. A renamed label alone is insufficient. |
| LLM execution | Use the Claude Agent SDK for every LLM call reachable from this new workflow, including code suggestions, extraction, classification, and recommendations. Replace reachable raw provider calls; do not add a parallel agent orchestration system. |
| Profile ownership | Share contracts and review UI across existing Client and BusinessDevelopmentProspect owners. A prospect is not a hidden Client row and does not consume a client slot. |
| Locations | Extend existing ClientFacility and its geocoding service; do not create a second client-location store. Resolve physical addresses to versioned districts, with explicit uncertainty states. |
| Relationships | Extend existing ClientTarget as the client-to-office relationship; add capability-support children with tenant/client integrity. |
| Design | Use Capiro 3.4 components, tokens, and the new editable onboarding component section linked below. |

The backend companion plan lives at `docs/plans/portfolio-onboarding-backend.md`
in capiro-backend. It specifies persistence, SDK execution, district resolution,
conversion, and API cutover. Proposed names below are contracts to implement,
not claims that these endpoints or tables already exist.

## Existing code to reuse and change

Frontend paths are relative to `apps/web/src/features/portfolio/`:

| Current owner | Planned change |
| --- | --- |
| `client-intake/` and `catalog.ts` | Reuse validated company/registration/sector fields; compose the six-step manual flow. Check vocabulary against capiro-backend reference data, not historical comments referring to another repo. |
| `intake/registrant/` | Reuse firm search, selected LDA identities, import and capacity behavior; add per-client websites and durable build queue. |
| `prospects/` | Reuse short form, stages, conversion receipts, contacts, files and brief; add the common fact/completeness presentation. |
| `client-profile/ClientMeriActions.tsx` | Delete enrichment state, menu item, dialog import/render and focus handling used only by Fill with Meri. Keep the independent Ask Meri and notetaker actions. |
| `client-profile/enrichment/` | Move active review, research status, source evidence and retry logic into `profile-build/`; delete obsolete modal/setup/toolbar and orphan exports, hooks, styles, schemas, fixtures and tests in the same cutover. |
| `capabilities/` | Extend existing capability detail and fit UI with discovery, lifecycle, approval, merge/split and per-capability tracking. |
| `relationships/` | Extend current relationship views with parent office links, capability support, geographic gaps and recommendations. |
| New `profile-build/` | Own typed contracts, source-aware facts, conflicts, completeness, identity selection and orchestration of UI states. Expose cross-feature APIs through `public.ts`. |

Keep routes thin. All requests use `useApi().request` with Zod validation.
Keep authorization in the existing Core/session path; no frontend authorization
shortcut, direct provider call, new browser credential, or second session owner.
Split large modules from the outset according to repository implementation standards.

## User flow and contracts

1. **Add profile** in Client Portfolio starts with a company name and website,
   optional supporting document, plus Manual entry, Search LDA and Add prospect.
   Manual entry needs only a company name. If no site exists, allow a document
   or manual details without inventing a website.
2. Check existing clients and prospects in the authorized tenant. Show an
   accessible existing profile or a safe duplicate response. Do not reveal a
   restricted client's identity. A strong legal-name/domain/identifier match
   offers confirmation and Change; ambiguity shows 2–4 evidenced candidates
   and None of these. Do not start full company research before identity is settled.
3. Check the current capacity/billing gate before creating a client. The backend
   rechecks atomically at actual creation; frontend counts are advisory. Keep
   existing pricing, entitlements and link-existing semantics unchanged.
4. Open the saved profile immediately and display durable section status.
   Basics, federal registration, federal footprint, lobbying/advocacy, people,
   news and locations arrive independently. Show partial results and retry a
   failed source without restarting successful work. News uses the last 12 months.
5. Review each proposal with source URL/document, supporting evidence, observed
   time, confidence and status. Source details remain available after approval.
   Bulk approval applies only to eligible proposals and respects version checks.
6. Show one completeness view after every entry path. Keep Complete, Partly,
   Missing and researched provenance distinct from approval status. The action
   **Research missing details** invokes the shared pipeline, with conflicts in
   context; it does not resurrect the separate Fill with Meri feature.

Use a discriminated `ProfileSubject = { kind: "client" | "prospect"; id: string }`
in shared contracts. Requests, query keys, caches, run identity and authorization
must include the subject kind. Server-owned state covers run/task status,
requested sources (including explicit document-only selection), findings,
review versions, source errors and resumption. Reuse durable polling/recovery;
do not simulate progress with prototype timers or create a new SSE transport
unless an existing supported transport supplies it.

Manual steps: Company, Registration, Sites, Leadership, Capabilities, Advocacy
profile. Preserve CAGE <= 5, UEI <= 12, description <= 600, up to 20 funding
priorities of 120 characters, and email validation. Failed submit focuses the
correct step and field without losing entries. NAICS, PSC and LDA issue codes
use authoritative searchable reference data and removable chips; format-check
out-of-list entries and label their reference status. Suggested codes remain
proposals until accepted. Never ship the prototype's memory-written code lists.

Search LDA retains filing identity/history and asks for a website per selected
client. Enforce the 100-client batch limit and existing slot checks before
admission, with a per-item transactional recheck. Queue states include ready,
needs company confirmation, source unavailable, cancelled and capacity refused.
One failure does not discard other clients' progress; retry is idempotent.

Prospects use the lighter six-section set from the handoff, without capabilities
or advocacy setup. At Closed won, use existing reviewed conversion commands
and receipts. Carry facts, sources, conflicts, notes, attachments, contact
associations and audit history through the existing transaction. Link-existing
conversion must not overwrite the chosen client's person-entered facts.

## Facts, locations and review behavior

Person-entered values are approved with person provenance and never silently
overwritten. A conflicting finding offers Keep mine / Use proposed value with
both sources visible. Rejected proposals remain rejected across refreshes until
explicitly restored. A high model score is not proof of identity or approval.
Only the handoff's allowlisted, exact-identity official facts (UEI, CAGE, SAM
status, matched LDA filings and awards) can auto-accept, subject to no conflict.
Inferred capability, code, relationship or economic-impact facts require review.

Locations show role, operating/announced/under-construction/closed status,
country, physical address, source, confidence, capability links and district
resolution separately. A district match does not confirm that the company
operates the site. Job-posting-only sites remain Unconfirmed.

| Location state | UI behavior |
| --- | --- |
| Resolved | Show address/point precision, source, boundary version, Congress and applicable federal/state districts; link the office for the same term. |
| Needs address | Ask for a physical street address or verified map point; city or ZIP alone cannot assign a district. |
| Ambiguous | Show address candidates and require selection; preserve evidence. |
| Source unavailable | Keep the location and previous verified result visible with freshness; retry resolution. |
| International | Show US districts as not applicable. |
| Unconfirmed site | Keep the site status visible even if coordinates resolve successfully. |
| Boundary changed | Show stale/pending re-resolution, preserve prior history, and review changed office links. |

Use the existing Census geocoder and precise ArcGIS-address fallback. Persist
the requested boundary vintage/Congress instead of assuming `Current_Current`
matches the serving office directory. Resolve senators by state, House members
by congressional district and term, and state legislators by their chamber
district. Never derive a district using an LLM or a city/ZIP centroid.

## Capability, tracking and relationship completion

Discover actual named products, platforms, services, programs and components
from sourced company navigation, sitemaps and documents. Families are tags.
Review supports edit, approve, reject, restore, merge duplicates and split
distinct products while retaining provenance. For primes, first select a
sourced business unit, then show up to 12 programs with Show more.

Capability detail includes lifecycle/readiness, evidence documents, alignment,
government need and case for support. PE/program lines require individual
approval. Eligible high-score tags can be selected in bulk (the prototype uses
a score above 85; validate that policy on reviewed fixtures), but scores are not calibrated
probabilities. NAICS and PSC remain classification fields rather
than watch terms. Only approved terms drive active capability tracking.

Migrate current per-client tracking without dropping or arbitrarily assigning
existing links: retain them at client scope; add explicit capability associations
when evidence or a person supplies them. Show bills, hearings, budgets, grants,
news and statements by the approved terms. Pending matches are separate.
Not relevant is remembered per capability and can be restored. Refresh after
approval uses the existing refresh machinery and idempotent requests.

Client-to-office relationships may exist without a capability. Capability
support belongs beneath a parent link and includes stance/evidence/history.
Show owner, last contact, next step, geographic coverage and gaps. Filters and
recommendations must respect existing ethical walls without disclosing blocked
clients. Approval creates a missing parent and capability link atomically.

Recommendations explain fit, evidence, entry point, proposed owner and reasons
against a match. Member statements require dated, attributable official source
links; no synthetic quotes or unsupported social-only recommendations. Missing
evidence remains a gap. Case-for-support and member-view fields cover district
or state impact, priorities, government need, readiness, cost, backing and timing.
Jobs, payroll, investment, facility size and supplier impact require sources
and dates; no inferred economic figures shown as facts.

Represent defense PE, health agency account/program and USDA/Farm Bill anchors
as typed sector data with maturity chains. The referenced healthcare drafts and
interview packets are absent from the ZIP; acquire and review them before use.
Unreviewed reference rows remain Draft, never Confirmed.

## Figma 3.4 additions

Editable section: [03.20 · Portfolio · Client and prospect onboarding](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3173-85786)
on **Prototype — Capiro3.4**. Added 17 component sets / 57 state variants using
the existing button components, reusable fields, Geist typography and 3.4 tokens.
These are reusable workflow/state components, not a claim that every production
screen or responsive interaction is finished.

| Component set | States | Node |
| --- | ---: | --- |
| Add profile | 3 | `3173:85853` |
| Company match | 3 | `3173:85906` |
| Build progress | 4 | `3173:85963` |
| Fact review | 5 | `3173:86036` |
| Location resolution | 7 | `3173:86147` |
| Manual steps | 2 | `3173:86186` |
| Code selection | 3 | `3173:86238` |
| LDA queue | 4 | `3173:86296` |
| Completeness | 3 | `3173:86333` |
| Capability review | 5 | `3173:86410` |
| Alignment review | 3 | `3173:86453` |
| Tracking item | 3 | `3173:86496` |
| Office relationship | 3 | `3173:86537` |
| Office recommendation | 3 | `3173:86580` |
| Case for support | 2 | `3173:86605` |
| Business unit | 2 | `3173:86640` |
| Onboarding summary | 2 | `3173:86670` |

Reuse existing Add profile/LDA/prospect flows (`1064:156441`, `1064:156586`,
`1064:156719`, `1064:157013`), profile (`1064:158893`), capabilities
(`1064:169534`) and relationships (`1064:164763`). Replace the existing Create
with Meri starter (`1064:156878`) with the unified entry in implementation.
The handoff had no phase-8 screen; the new case-for-support family establishes
its states, with full page composition still required in that implementation phase.
Inspect keyboard focus, screen-reader announcements, contrast, long evidence,
empty/error/loading states and narrow layouts while composing each screen.

## Delivery plan and acceptance gates

| Slice | Handoff phases | Deliverable and exit condition |
| --- | --- | --- |
| A: foundations | 0 | Shared subject/contracts; typed facts and conflicts; durable pipeline adapter; approved SDK boundary; versioned locations; migrated existing data remains readable. |
| B: onboarding and cutover | 1–3 | All four entry paths; identity review; live build; manual validation; LDA queue; prospect conversion; completeness and location states. Remove standalone Fill with Meri and all newly orphaned code before releasing this slice. |
| C: capabilities | 4–5 | Sourced discovery, merge/split/rejection, alignment approval, documents, capability tracking; no unapproved terms reach active feeds. |
| D: offices | 6–7 | Two-level relationships, maps/gaps, sourced statements and recommendations; ethical-wall and atomic-approval tests pass. |
| E: impact and sectors | 8–9 | Evidence-backed member view and impact fields; sourced prime unit selection; reviewed sector reference data. |

Use one owned, time-limited rollout flag. Remove it and its unreachable branch
after rollout. Do not leave two permanent onboarding implementations. Sequence
backend expansion, frontend migration, observed caller cutover, and deletion
of old routes/configuration before declaring slice B complete. Preserve active
runs and history throughout; do not drop tables merely because their historic
names contain `fill`.

Required implementation evidence:

- Integration tests: exact-identity acceptance vs inferred review; provenance
  survives approval; person conflicts; rejection survives refresh; partial
  retry/document-only requests; cancellation and stale responses cannot write.
- Browser tests: all four entry paths, ambiguous/no match, duplicate/capacity
  refusal, refresh/resume, manual errors, LDA partial failure, prospect conversion,
  seven location states, capability approval/tracking and relationship walls.
- Conversion tests: concurrent/replayed commands, existing-client link with no
  extra slot, same-tenant ownership and carry-over with no data loss.
- District fixtures: multi-match, PO box/city-only, at-large, territory, state
  chambers, international, fallback precision, boundary change and Congress mismatch.
- Run `npm run check` and `npm run test:browser` with repository Node/npm versions.
  Recheck the current baseline; the handoff's reported inherited failures are
  historical, not evidence about this branch. Report failures precisely.
- Compare composed screens to the linked 3.4 components and handoff screenshots.
  Test synthetic recorded company fixtures; handoff product counts are dated
  fixture expectations, never live hardcoded production logic.
- Audit imports, exports, routes, proxy policies, feature flags, CSS, packages,
  test fixtures and docs after removal. Search for `Fill with Meri`,
  `fill-with-meri`, `ClientEnrichmentDialog` and raw provider calls. Each retained
  hit must be active shared code or necessary immutable migration/audit history;
  obsolete runtime hits must be zero. Remove unused dependencies and lockfile
  entries only when no other active feature uses them.

## Evidence for this plan PR

Reviewed the attached handoff, current source and schema in both named repos,
existing conversion/capacity behavior, and Figma 3.4. Added and visually inspected
the 17 component families; structural inspection found no immediate-child
overflow and no non-Geist text in the new section. Runtime gates are pending
implementation; they were not run for this documentation-only change.

Official references informing the backend design:
[Census Geocoder API](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html),
[TIGERweb legislative layers](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer),
[Claude Agent SDK TypeScript](https://code.claude.com/docs/en/agent-sdk/typescript),
[structured outputs](https://code.claude.com/docs/en/agent-sdk/structured-outputs).
These support the proposed design, not a claim of a completed integration.
