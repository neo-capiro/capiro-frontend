# Meri Home narrow-screen overflow repair

## Outline before implementation

Dedicated branch `fix/meri-home-responsive`, worktree `C:/dev/main/capiro-frontend-worktrees/meri-home-responsive`, exact base `45c70daa1f525df04562d7a05b171150d003fdfb`. Scope is the Home CSS responsible for the independently observed 320px document overflow and this report. No root metadata/lock, public UI/client package, component behavior or design asset change.

The composer footer currently requests `calc(100% + 8px)` and places its intrinsic-width tools and Send control on one flex row. The reviewer observed document width320/scrollWidth328 and the Send control protruding. The Home module is the canonical owner of this layout. Preserve the existing desktop rule and introduce a narrow-screen footer width/wrapping rule, keeping every control visible rather than clipping overflow. Shell changes are unnecessary unless actual measurements establish another cause.

Reuse exact installed foundation dependencies read-only and the existing pinned local Chrome/Playwright qualification setup. First inspect retained reviewer evidence and source. After the focused CSS edit, run one fresh production build, then real browser checks at320/375/768 with control bounds, draft/focus and disabled-action checks, plus1440×1040 geometry/asset comparison against the preserved source baseline. Retain failures and source/runtime pre/post pins; stop only the owned local server/profile. No unrelated suites or new Figma capture. Figma is actively changing, so this is regression qualification of the existing baseline, not final visual acceptance. Root owns independent review and integration.

## Implementation and qualification

Changed only `apps/web/src/features/meri/home.module.css`: inside the existing `max-width:680px` media query, the footer uses `width:100%` and `flex-wrap:wrap`; Send uses `margin-left:auto`. Its existing desktop width, shared shell, modules, public components, source assets, disabled actions and draft behavior remain untouched. The tools stay together; Send moves to a second right-aligned row when intrinsic widths require it. No overflow clipping was introduced.

The source cause is independently corroborated in one fresh browser run: temporarily restoring the old footer properties in the owned page produces document width320/scrollWidth328 and Send right edge327.5625. Restoring the actual candidate rule immediately returns scrollWidth320 and Send right edge287. This DOM-only control does not modify source or the historical design baseline.

| Actual check | Result |
| --- | --- |
| Exact-lock offline preparation, `npm ci --offline --ignore-scripts --no-audit --fund=false --update-notifier=false` | exit0,78.296s; root package/lock and measured source stable |
| Production `node node_modules/next/dist/bin/next build apps/web` | exit0,28.344s/300s; TypeScript and `/`, `/meri`, framework not-found prerender succeed; measured source/runtime stable |
| Actual headless Chrome/Playwright qualification | **6 groups PASS**,10.953s/120s; source/runtime/oracle pins stable |
| Document overflow |320→320,375→375,768→768; all visible button/textarea rectangles fit horizontally |
| Existing desktop1440×1040 | all25 asset-slot rectangles and header/sidebar/heading/form layout exactly equal preserved foundation observations |

The browser run checks literal draft text, focus and Enter leaving the unsent draft intact at each narrow width, all disabled future/send actions, keyboard suggestion selection, current Meri mode and synthetic fixture disclosure. No remote page requests or page errors were observed. Its owned context closed, direct Next process29736 exited withSIGTERM and listener53461 was confirmed closed. Screenshots at320/375/768 and1440 were retained; the320 and1440 images were visually inspected. No Figma read or new visual baseline was created, and finalized design acceptance remains pending.

Desktop measurements remain header65px/sidebar232px; heading x478,y279,w716,h44; form x478,y383.390625,w716,h130.796875. All19 exact assets remain in25 slots, with their existing intrinsic root geometry. This is existing-baseline regression evidence, not approval of the changing design or full accessibility/product qualification.

## Retained preparation failures and provenance

The first build exited1 before compilation because Turbopack rejects the borrowed `node_modules` junction outside its filesystem root. Its binary streams and stable source envelope remain in `build/`. The junction was moved into ignored evidence without changing its target.

A regular dependency copy then reported31,432 copied files/557.43MiB without copy errors, but full hash readback was slow. The owner-directed stop terminated only the identified owned Python copy process before its300s whole-copy limit; incomplete verification is **not PASS**. Its copies, raw robocopy output and process identity remain under ignored evidence. No dependency-source files were changed. The incomplete owned copy was moved within this worktree before the separately authorized exact-lock offline `npm ci`. That completed without lifecycle scripts, registry resolution, notifier, audit, fund or lock changes. The cache is the original qualified foundation cache; the final installed tree is local to this worktree. No install was performed in borrowed or root integration trees.

Final direct package metadata matches all eight frozen dependency records. Versions remain Next16.4.0, React/ReactDOM19.3.0 and TypeScript5.9.3. Exact unchanged lock SHA-256: `5acf8eabbaf763f400fe705968a31f98d4ef33b3f68d8033afa34bc834200a7e`. The original seven LOW dependency findings and UI attribution hold are inherited unresolved matters; no audit/fix or dependency update was run here.

Evidence root: `.task-inputs/CODEX-MERI-HOME-RESPONSIVE-1/`; `install-3`, `build-4` and `browser-5` contain exclusive binary stdout/stderr and machine envelopes with exact argument arrays, replacement environments, UTC times, direct-child bounds, exits/errors and source/runtime hashes. `browser-evidence` contains six results, measured controls/layout, screenshots, old-rule control and cleanup observations; `prior` preserves the existing independent failure and historical desktop oracle. Helpers and failures are independently versioned and retained, with no behavioral rerun after the successful fresh browser execution.

Pre/post bindings cover tracked app/UI/root input bytes, eight installed package metadata records, listed executable/tool entry bytes, test source and prior oracle bytes; they do not claim a complete pre/post third-party installed-code closure. Page interception and direct-child timeouts are not OS network or process-tree containment. No new live authentication, source access, provider, AWS, deployment, G1, current Capiro/Meri or cutover qualification is claimed. Root owns independent scoped review and integration.
