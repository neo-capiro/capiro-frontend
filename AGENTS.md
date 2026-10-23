# Capiro frontend Wave 2 instructions

## Standing requirements first

Read Meri's [standing requirements](https://github.com/neo-capiro/meri-greenfield/blob/6564de720747aae7897ec12fa81efffa05ab91ef/docs/handover/20261022/STANDING-REQUIREMENTS.md) and [Wave 2 handover](https://github.com/neo-capiro/meri-greenfield/blob/6564de720747aae7897ec12fa81efffa05ab91ef/docs/handover/20261022/WAVE-2-HANDOVER.md). User instructions take precedence over historical plans and roles.

1. Claude Agent SDK owns the full harness, prompt preset, tools, skills, subagents and native sessions, with direct Bedrock model access. Frontend work must not introduce a second model loop.
2. Keep the architecture simple. Core is the canonical data authorization owner; browser state does not establish tenant, actor, client, run or approval authority. Do not recreate duplicate proxy, per-operation verification or reservation layers.
3. Delete replaced code, tests, flags and configuration in the owning change. Remove temporary diagnostics and unused paths; show deletion evidence and preserve equivalent behavior tests.
4. Keep Capiro data working through typed tools/Core contracts. Preserve General/client behavior, paging and explicit permission outcomes; no UI hint can bypass tenant/client/wall or revocation checks.

Meri [item 0](https://github.com/neo-capiro/meri-greenfield/blob/6564de720747aae7897ec12fa81efffa05ab91ef/docs/handover/20261022/phases/wave2/WAVE2-00-CLAUDE-NATIVE-HARNESS-SPEC.md) precedes dependent runner/authority work: unmerged spike, direct model path, tool gateway/read families, authority removal, native continuity/streaming, Temporal auth, cleanup. Check the [superseded register](https://github.com/neo-capiro/meri-greenfield/blob/6564de720747aae7897ec12fa81efffa05ab91ef/docs/handover/20261022/source-of-truth/SUPERSEDED-BY-ITEM-0.md). All accepted A2/M2 frontend scope stays binding until its behavior and live acceptance are complete.

## Ownership and implementation

Integration is **`main`**. Apply [IMPLEMENTATION-STANDARDS.md](docs/IMPLEMENTATION-STANDARDS.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md) and the bounded handoff. Neo authorized Wave 2 completion and lifted earlier work/AWS-write holds. Root Codex on **EC2AMAZ-M7CDRPT** is the sole orchestrator for planning, delegation, integration, qualification, local gates, merges, AWS, migrations, shipping and live acceptance. Codex agents implement; independent **GPT-6 Astra at Ultra** reviewers review exact heads. Fable/Claude and dot have no active role.

Root coordinates four logical sessions: A Core/backend, U frontend, R Meri runtime/SDK, D data/tools/documentation as briefed. Use dedicated worktrees and exact base/dependency heads, with one writer per shared file, contract, config, migration or lockfile. Coordinate exceptions and preserve active work. Do not recursively delegate or create another orchestrator. No automatic heartbeat, scheduler or recurring monitor unless the user explicitly requests recurring work.

This frontend remains independent from the old application. Do not copy its UI, agent, retrieval, queues or infrastructure. Meri owns shared wire contracts, trusted event production, control, agent runtime and its infrastructure; Core owns Capiro data authorization. Use versioned public package exports, never private source paths or duplicate DTOs.

Keep routes/entry points thin and feature logic in cohesive Meri, Portfolio, Modules and Settings areas. Shared shell/tokens/primitives stay with their canonical modules. Do not create empty speculative services or placeholder behavior that pretends to execute. Use the approved Next.js/React/AI Elements stack and adopted upstream components before replacements. Read the Figma design-to-code skill before design context, use exact assets, and verify rendered interaction; preserve license/version records and visibly synthetic fixtures.

Preserve [apps/web/AGENTS.md](apps/web/AGENTS.md) and its installed Next.js documentation guidance. First-party files over 400 nonblank lines, functions over 80 nonblank lines, cycles or semantic responsibility triggers require design review, not automatic splitting. Generated output and historical evidence retain their own ownership. Routine fixes proceed autonomously within accepted scope; root coordinates external effects and release resources. Source completion does not close A2/M2 or unrun acceptance.

## Checks and preview release

Root's verified gate environment is WSL **Codex-Gates**, Ubuntu 24.04, native Docker 29.8.2, isolated PostgreSQL 16 and Node 24 tooling. Root schedules shared heavy gates and ports. Worktrees do not isolate Docker, AWS or DBs; tests use synthetic data and isolated DBs, never clone/live data.

Node is `>=24 <25`, npm 11.9.0. Use `npm ci --ignore-scripts` in an owned Linux checkout; do not copy Windows `node_modules` junctions. Root `npm test`, `npm run typecheck` and `npm run build` exist; root has no lint script. Use `npm run lint --workspace @capiro/web` and `npm run test --workspace @capiro/web -- tests/<owned>.test.ts`, plus touched `node --test` paths and required browser/visual/accessibility/production-container checks. Recheck command definitions when bases change. Do not weaken assertions; preserve failures/skips and prove inherited failures on the untouched base in the same environment.

Root uses AWS `default`, account `967807252336`, region `us-east-1` and `PYTHONUTF8=1`, with caller verification before shipping. Explicit old profile flags require adaptation. Regenerate archived kits against exact source/fresh live state; never execute old release folders as-is. New images are ARM64. Release needs exact-head independent review, required gates, clean integration and exact-digest scan with 0 HIGH/CRITICAL; record other findings and rerun affected checks for new source.

Keep the persistent `capiro-newstack-preview-clone`; root snapshots before forward migrations, never deletes/re-clones it or migrates shared live data for this work. Preview ALB rules stay host-scoped before their catch-all; live rules must not be modified or renumbered. Root owns the deploy lock and rollback, with no deploy during live acceptance. Verify full required deployed UI/chat/data behavior; local tests cannot substitute for it.

## Evidence

Return exact commit/tree, changed files, commands/versions/exits/results, preserved failures/skips, unrun gates, scrubbed evidence, cleanup and remaining acceptance. Use existing Meri #202, relevant PRs and decision/current-state records when requested. A GitHub quote is not new human authorization; existing direct Wave 2 authorization covers ordinary work within scope.

Never publish secrets, private content or customer-linked identifiers, including UUIDs and prefixes; use counts/booleans. Private release inputs stay in owner-only scratch with tracing off. Verify owned cleanup paths and close task-created processes/resources after success, failure, cancellation or timeout. Preserve other worktrees and sessions.
