# Meri cited-answer workspace — implementation outline

Date: 2026-10-11 UTC. Owner: Codex. Exact base: `neo-capiro/capiro-frontend@28c300093c0886018c49df8764a8e6fac44819eb`; branch `task/meri-cited-answer-20261011`. Backend handover remains G1 OPEN. This is a local, disconnected UI feature group, not a live answer or source authorization.

## Design target and scope

Figma file `Zc2dEN5aLU47dVdsewDmiJ`, owned Meri section `439:81406`, frame `442:81682` “01.02 · Cited answer”, read through `get_design_context` with screenshot on 2026-10-11. The 1440×1040 screenshot is retained in the task's scratch work area with SHA256 `cfd71647bd291eb6ba448ef58ce45d6a42d0ba363e635790b672fcc2d4b85627`; Figma exposes no immutable revision in the published inventory. The screenshot is a comparison target, never a product asset. Visible Anduril, Jordan, source titles, approval counts and body text are synthetic design fixtures.

Implement the named cited-answer screen as a coherent Meri conversation presentation, accessible on a fixture route until authenticated conversation/history/event integration exists. Preserve the shared Header, Sidebar, tokens, local Figma assets, shadcn Button, AI Elements composer and existing backend-owned 0.1 contract boundary. Render the question, three-part cited answer, commitments table, follow-up draft actions and composer in the design's responsive layout. Use exact new static Figma assets where existing local assets are not byte-identical. No temporary Figma URL may remain in code.

## Responsibilities and interactions

- `apps/web/src/features/meri`: owns the conversation fixture data and view, source disclosure state, local copy feedback and draft selection. It does not authorize or fetch data, create tasks/briefs, retry/fork a run or infer a source from a prototype link.
- `apps/web/src/shared/shell`: retains header/sidebar and layout. Any small target/route adaptation must preserve accepted Home behavior and visible disabled destinations.
- `apps/web/src/app`: thin route composition only, no business logic.
- `packages/ui` and `packages/meri-client`: reuse existing public components/interfaces; no duplicate wire schema, local auth, agent loop or transport implementation.

The source reference and Sources control may reveal only labelled synthetic fixture details; Copy operates on visible local text. “Create meeting brief” and “Draft a task” may fill an editable local draft, but cannot execute a command. Send, Attach, Retry, Fork, Helpful and unauthorized navigation remain explicitly unavailable until their trusted contracts are integrated. New conversation returns to the local Home draft surface. No live client identity, persistence or permission is claimed.

## Verification

Use pinned Node 24 and the checked-in lockfile. Verify targeted type/build/architecture checks, exact local asset bytes and callsites, and browser rendering at the 1440×1040 design target plus a narrow viewport. Exercise keyboard and visible local controls; inspect screenshot differences and fix in-scope layout/asset issues. Preserve unrelated baseline failures. Report offline acceptance limits separately from G1/G4 live UI gates.
