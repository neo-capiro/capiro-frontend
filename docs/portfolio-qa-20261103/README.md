# Portfolio QA corrections

Scope: the November 3 exploratory Portfolio report, across `capiro-frontend` and `capiro-backend`. Fill with Meri and Objectives implementation are excluded; F05 and F10 are intentionally unchanged. The changes are proposed for review, not deployed.

## Finding coverage

| Finding | Proposed behavior and remaining acceptance |
| --- | --- |
| F01 | Explicitly advance a previous prospect stage into the current catalog through the audited write path. Preserve old history; register the existing reserved stage constraint as a forward migration. |
| F02 | Bound opportunity/source, optional profile and browser reads; preserve partial results and unknown totals; offer source-specific recovery. The production outage's cause and successful live data retrieval remain unverified. |
| F03 | A repeatable, authorized GET reads text without paid extraction or metadata writes. Current file access is checked before displaying the result; failed reads can be retried. |
| F04 | Do not re-append rejected extractor limitations after final briefing synthesis. Display structured grounding problems and saved caveats for review. The existing synthetic approved artifact has not been rewritten or independently reconciled. |
| F06 | Meaningful template names/slug fallbacks, product, published version, scope and existing verified preview distinguish choices. Do not invent missing saved names. |
| F07 | Preserve legislative civil dates consistently in tracker rows and detail. |
| F08 | Normalize Census delegate district 98 to 00 for DC/territory facilities across saved-location, map, representation and evidence consumers. Preserve award sentinel semantics. |
| F09 | Count tracked-bill coverage using the configured Core or Intelligence tracker, with the same visible active-client population. Validate and echo the selected owner; separate request/cache identities and refuse mismatched responses. |
| F11 | Refuse conversion/replay to an archived canonical client with an actionable prerequisite; show recovery/loading prerequisites. The audited synthetic fixture and a fresh deployed conversion remain acceptance checks. |
| F12 | Persist empty client folders, include them in the folder catalog, and bind upload destination to confirmation/replay. Folder creation no longer depends on selected files. |
| F13 | Bound initial prospect history, add progressive loading, search/date filtering, full-history view and section navigation. |
| F14 | Keep checking access/capacity distinct from confirmed denial, quota and service failure. Preserve write authorization checks. |
| F15–F17 | Populate canonical client type, use profile search copy, and show context-appropriate prospect controls instead of client-only summaries/actions. |
| F18 | Use readable structured source/identity labels, authorized member names and local timestamps. Historical free-form saved narrative remains preserved for source review. |
| F19 | Distinguish not computed from successfully computed zero capability matches. |
| F20 | Carry validated list query context and restore the actual shell scroll container. |
| F21 | Omit empty client sections when only prospects match. |
| F22 | Show archived/converted lifecycle notices and relevant next actions near the prospect identity. |
| Report follow-ups | Add saved-field completeness checklists without fabricating data. Deduplicate contact/email evidence and leave tied mail-client matches unassigned; existing message attribution has not been retroactively adjudicated. |

## Design and source ownership

See [Figma references and added components](FIGMA.md) and the inspected screenshot. Existing Portfolio/Workspace primitives, canonical access checks and public feature boundaries are retained. No new model loop, generation prompt or application authority layer is introduced.

Frontend lane evidence: [workflow changes](frontend-workflows.md) and [client data changes](../portfolio-qa-20261104/frontend-data.md). Backend lane evidence is committed in the companion repository at `docs/portfolio-qa-20261103/backend-workflows.md` and `backend-services.md`.

## Release and verification boundaries

The backend PR includes two forward migrations: registration of the current prospect-stage vocabulary and the new client folder table. Neither migration was applied to a shared or live database. Qualify and apply them through the existing release process before enabling the dependent UI. Deploy the backend metrics/text/folder contracts before the frontend consumer.

Source tests use synthetic records. PGlite exercises SQL, folder foreign keys and application permission paths; its owner connection is not evidence of a non-owner PostgreSQL RLS role test. Browser fixtures exercise real components against synthetic transports, not production authentication or external services.

Unchanged-base failures, skipped integration tests and final combined checks are recorded in the PR verification summary. Do not treat source review or these local checks as proof that the production opportunity outage, old saved briefing or conversion fixture has been repaired.
