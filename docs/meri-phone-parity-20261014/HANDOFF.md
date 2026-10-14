# Exact Meri phone comparison

Separate branch based on frozen PR42 ee9d872743f44f927fa924eebd764da8e093888c. Do not change its original branch/source/pins or deploy. Root owns Meri Home CSS, fixture/suggestion presentation and focused Playwright geometry/interaction checks. Independent Codex review will inspect the final source and captures.

Approved reference: Figma3.1 Zc2dEN5aLU47dVdsewDmiJ /449:88256,390×844, with retained high-fidelity context/screenshot in the PR42 release handoff. Reuse canonical shell/styles/UI/source assets; do not use screenshots as assets or add samples to ordinary Meri. Ordinary Meri retains current account/client/unavailable or admitted host behavior.

Material gaps to verify from local before captures: desktop greeting/subheading used on phone; scope/status/wordmark placement;80px hero margin instead of authored56px; one-column suggestion stack instead of two visible phone cards; Start above the card copy instead of below; short textarea clipping two-line placeholder. Preserve all existing local draft suggestions and keyboard reachability through horizontal card/secondary-action scrolling. Keep existing workspace navigation available; its extra row is an intentional functional difference from the sample frame. Never insert a fake recent-conversations action or conceal unavailable sending.

Compare fixture-relative geometry against the exact frame, documenting the retained navigation row and synthetic label. Test390/320/1440, light/dark, all existing local draft actions, disabled sending, no page errors/API writes, and ordinary current-client/no-sample/availability behavior. Desktop composition must remain stable. Local visual/fixture parity does not qualify live Meri/runtime/native acceptance; all337 rows remain open.


## Measured result against449:88256

The approved frame is390×844 and has a108px shared header. Existing functional Meri workspace navigation is retained as an extra38px row; subtract that row when comparing content anchors. The comparison is explicit rather than a claim of pixel-perfect/native acceptance.

| Measurement at390 light | Before | After | Authored target / comparison |
| --- | --- | --- | --- |
| Scope top |170px|162px|124px +38px retained navigation |
| Heading |desktop greeting,30px/one line|phone question,34px/two authored lines|34px,216px top; after254−38=216 |
| Composer top / height |375.80 /130.80px|344.78 /153.30px|307px / approximately154px; after344.78−38=306.78 |
| First two cards |356px wide in successive rows|172px each,14px gap,161.09px high|172px,14px gap, approximately161px |
| First card top |530.59px|514.08px|477px; after514.08−38=476.08 |
| Placeholder area |22.5px|45px in the explicit fixture|two15px/1.5 lines |
| Phone shell |inherited1040px target/975px workspace minimum|viewport minimum with natural content growth|authored844px phone frame |

The exact phone prompt line break, card font/copy, Start placement below copy and smaller hero spacing now follow the frame. The third Analyze card remains mounted and horizontally reachable, and secondary draft actions remain horizontally reachable. Their local drafts/callbacks are unchanged. Every action is reached via actual sequential Tab and activated by Enter; onFocus centers a control within its scroller while retaining nearest vertical positioning. That closes the measured Use a template clipping defect. Send remains disabled; no fake Open recent conversations action was added.

Fixture-only selectors hide the redundant sample status/wordmark and size its textarea without altering the ordinary SDK composer. Ordinary Meri retains API identity/current permitted client, neutral/unavailable states, admitted host behavior and workspace navigation. Shared phone padding/font/viewport adaptation changes presentation only. All original assets and package/SDK/config/endpoint/auth/state owners remain unchanged.

Desktop1440 light and dark before/after PNGs are byte-identical and have zero RGB pixel differences; see desktop-comparison.json. Phone dark captures verify existing theme/keyboard behavior, not a newly authored dark-phone Figma acceptance. Full-page fixture screenshots preserve the explicit synthetic footer; ordinary screenshots contain no Jordan/Anduril/sample composer.

## Qualification and retained attempts

Final sealed browser cohort54/54 passes, including8 dedicated fixture/ordinary phone cases, all6 local draft actions, cross-view desktop/phone checks, ordinary identity/client/failure/lifetime boundaries, existing governed conversation receiving, Files navigation and scoped theme/history/footer controls. Aggregate npm run check passed2367 web/451 Capiro/113 root/84 transport/385 newsletter plus8 declarations, packages/types/lint0 errors81 inherited warnings/format and architecture0 errors0 blocking with19 inherited unreviewed findings. Fresh production build and36 credential-free actual standalone checks passed with no page errors. Independent Codex review accepted all4 production files and the final screenshots/strong keyboard checks; no new size review finding was introduced.

Before capture8/8 passed on exact PR42 runtime source. Early after capture8/8 confirmed geometry but had weaker interaction coverage. Expanded cohorts exposed4 obsolete theme tests expecting the pre-PR36 fixture fallback at ordinary /meri; their expectations now explicitly use /meri/fixture/home and retain real theme/history/guard checks. Stronger interaction attempts caught off-screen focus and then Use a template partial clipping inside its scroller. No visibility assertion was removed or weakened; the final source fixes focus scrolling. All failed/intermediate logs and byte-hashed compressed result files remain in evidence/iterations. Final screenshots/geometry/results are under after/; source/asset/evidence hashes are in MANIFEST.json.

PR42 remains frozen at ee9d872743f44f927fa924eebd764da8e093888c; no original source/ref/release input, deployment or runtime origin was changed. This separate successor is for review and later release qualification. Local fixture/Vite/standalone results do not close any of337 native rows or qualify live Meri/auth/runtime/provider/model/session execution. Actual native phone Home acceptance remains with its authorized runtime cohort.
