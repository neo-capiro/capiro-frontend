# Final Home reference amendment

Implementation outline: compare the finalized `442:81437` context and screenshot with the preserved prior Home reference; amend only the Home suggestion presentation, versioned provenance and current Home documentation. Reuse the public Button and existing native CSS. Keep all six local draft suggestions and all 19 exact assets. The new Browse workflows control remains disabled with a truthful explanation because the workflow library is unavailable.

Dependencies and public interfaces: existing `@capiro/ui/button`, Home suggestion callbacks and shared design tokens remain authoritative. No backend, route, authentication or package changes are part of this amendment.

Verification planned: raw reference comparison and asset identity, focused type/build checks, fresh owned-app browser checks for the disabled control, draft preservation, responsive geometry and a reference screenshot. Record actual outcomes and failures below; this outline is not acceptance or a gate pass.

## Result and source scope

Codex implementation from `c49689f26eb9700cd9853bdeb8bf6241d65a3c08`, in the dedicated `feat/meri-home-final-reference` worktree. The finalized Home context adds Browse workflows (`733:148128`). The public Button is disabled, has no click handler or route, and exposes the exact explanation “Workflow library is not implemented in this disconnected fixture.” Its description remains available through `aria-describedby` and the shared screen-reader-only style. All six editable draft suggestions and all19 asset bytes/25 intended slots are retained.

The desktop row follows the reference's469px centered wrapper and nonshrinking controls. The fourth link extends right of that wrapper; existing wrapping at1100px and below keeps the controls within the document. No new responsive design baseline is inferred.

The first fresh Webpack build exposed an existing Windows ambiguity: extensionless `./Suggestions` resolved case-insensitively to `suggestions.mjs`, causing a missing-export warning and `/meri` prerender failure. The owner authorized a narrow repair: rename the presentation component to `MeriSuggestions.tsx`, adjust its internal export/import, and update only the corresponding asset-test source path. The data module is raw unchanged. Public package interfaces remain unchanged.

Eight scoped Git paths include the old/new component names, `MeriHome.tsx`, Home CSS, asset metadata, app README, the path-only test amendment and this report. Root package/lock, UI/client packages, assets, existing historical reports and backend are unchanged.

## References and verification

The raw final context is37,892B/SHA256 `6376ae15cd63b517b180c598a61a1e96742c7a6fb0ddd4353583be9019713616`; the exact native-MCP screenshot is58,731B/SHA256 `2e6568cf812d6a062d7bb2e38eb7cd6533dd48cc186ff0bf8473d7ce250c7e65`, a1024×740 render of the1440×1040 target. Both were read/viewed before editing and are copied byte-exact under `.task-inputs/final-reference`. The original captures and19 asset records remain intact. Comparing the refresh/final response after replacing only19 transient asset URLs and CRLF line endings isolates the new anchor plus tool-response whitespace. Captures are separate and non-atomic; an immutable Figma revision is unavailable.

Actual checks, each once for its source revision:

- Initial focused app TypeScript check: exit0,5.109s. This preceded the component rename; the successful final build below also ran TypeScript.
- Initial own-app Webpack build: exit1,49.281s, the reproduced basename ambiguity above. Raw warning/prerender output retained.
- After the source repair, fresh own-app Webpack build: exit0,10.063s, TypeScript included; routes `/`, `/_not-found`, `/meri` emitted. No stderr.
- Focused asset tests after the path-only update:2/2PASS,0.218s, no stderr. All original asset assertions retained.
- Fresh owned-app browser:6 focused groupsPASS,10.329s. The new control is disabled, described, skipped by Tab, and a programmatic native click leaves the draft/URL unchanged; all six literal draft expectations still work. The469px/36px desktop row, all19 exact assets in25 intrinsic-size slots,320/375/768 document/control bounds, synthetic disclosure and zero observed external requests/page errors passed.
- Additional initial-state visual capture: exit0,7.438s, without replaying the six behavior groups. It removes the earlier screenshot's intentional draft focus state by taking a fresh untouched page. The1440×1040 image and320px image were viewed. Manual comparison with the final1024×740 reference supports the Home arrangement and fourth link; no pixel-equality claim across different rendering dimensions is made.

Raw envelopes, binary streams, screenshots, source/runtime pre/post records and the final evidence manifest are in `.task-inputs/checks-1`, `checks-2`, `browser-1`, `visual-1`, `visual-envelope-1` and `final-home-handoff`. Source records remained stable during the checks; the borrowed root lock remained254,166B/SHA256 `33903aecdd203eb5864145525f01eb01132c69c0ef7241f40c589c1d4afc6480`.

## Preserved setup history and limits

After the first build failure, a local regular dependency copy had begun before owner steering chose the source rename instead. Only that exact owned robocopy process was stopped after73.469s; its failure/envelope and partial own tree are preserved under `.task-inputs/dependency-copy-1`. The original read-only dependency junction was restored; the partial tree was not used. No install or network package fetch occurred. Two initial navigation reads used nonexistent component/config paths and were corrected by file inventory; these were not test outcomes.

Both browser runs served this worktree's freshly built app, using pinned Node/Playwright/Chrome and separate owned profiles. Each confirms its direct owned server exit, closed context and listener absence by rebinding the port. Borrowed dependencies are retained untouched. External wrappers impose120s direct-child deadlines and post-completion2MiB stream caps; they are not process-tree supervision or OS network sandboxes. Browser interception observed only local requests; no broader network-isolation claim follows.

This is a reviewable Home-only author amendment. Independent integration/visual acceptance belongs to the owner. Workflow execution, live identity/source access, full Figma-screen implementation, deployment, security and G1 gates remain separate. No Hermes, model/provider or AWS call was made.
