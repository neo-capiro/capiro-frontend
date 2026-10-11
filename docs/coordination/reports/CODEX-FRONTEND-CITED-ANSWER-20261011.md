# Meri cited-answer fixture — local handoff

Date: 2026-10-11 UTC. Owner: Codex. Base: `neo-capiro/capiro-frontend@28c300093c0886018c49df8764a8e6fac44819eb`. Branch: `task/meri-cited-answer-20261011`. The implementation outline was committed first in `docs/coordination/tasks/CODEX-FRONTEND-CITED-ANSWER-20261011.md`.

## Delivered

- A standalone synthetic cited-answer route, `/meri/fixture/cited-answer`, matching Figma file `Zc2dEN5aLU47dVdsewDmiJ`, frame `442:81682` at its 1440×1040 target. The root fixture entry links to the Home and cited-answer routes.
- Shared Header, Sidebar, ProductShell and Composer reuse with a cited-answer asset set. Home remains the default asset set and retained its existing design behavior.
- Three-part answer, commitments table, labelled sample citations, a source-disclosure panel, local Copy feedback and two editable local draft suggestions. New conversation returns to `/meri` with a blank Home draft.
- Twenty-two exact Figma assets stored locally and hash-bound in `apps/web/design/cited-answer-assets.json`. The wordmark was byte-identical to the existing Home asset and is reused. No temporary Figma asset URL is used at runtime.

## Verification

- Pinned Node `v24.19.0`: production `npm run build` passed; `/`, `/meri`, and `/meri/fixture/cited-answer` statically generated.
- `npm test`: 15/15 passed. `npm run architecture`: zero errors and zero signals.
- Recomputed SHA256 and byte length for all 22 local cited-answer assets against the manifest: all match.
- Browser inspection against the Figma screenshot (SHA256 `cfd71647bd291eb6ba448ef58ce45d6a42d0ba363e635790b672fcc2d4b85627`) at 1440×1040 and 390×844: title, shell, sections, table and composer align with the design; no document-wide horizontal overflow at the narrow viewport, and the table scrolls within its own frame.
- Browser interactions: source 1 opens the labelled sample-source panel; Draft a task updates and focuses the local composer; Copy reports success; root entry opens the cited-answer route; New conversation returns to the blank Home route. Send, Attach, Retry, Fork and Helpful remain unavailable.

## Acceptance boundary

This is a disconnected design fixture only. Anduril, Jordan, the meeting question, answer, citations, table and approval counts are synthetic. No signed-in actor, client scope, source record, live answer, durable conversation, task/brief creation, attachment or sending path exists here. The design's “Saved just now” is rendered as “Sample conversation · Not saved” to avoid a persistence claim. The source panel discloses that the citations have no linked record or current authorization. This work does not change G1/REL-02 status or satisfy G4 live UI gates.
