# HANDOFF — newsletter workflow Figma 3.4 parity → merge and ship

## Codex continuation — 31 October 2026 (supersedes operational steps below)

The initial handoff is retained below as history. Do not repeat its blanket
stash, stale-main branch command, or its user-run deployment/browse instruction.
The user explicitly assigned Codex to finish, merge and ship this separate task.
Existing Release remains the sole cloud owner; Root routes its immutable request.

- Integration base is now `6d1465cf903b7a85bc716590eacc33dc2a81c570`.
- Branch: `hermes/newsletter-figma34-parity-20261031`.
- The original five modified source files were scoped-stashed, tested on
  `b9eb11fa`, then restored on current main. All 17 intake dirty/untracked files
  matched their saved SHA256 receipts, including the six unrelated PNGs.
- Baseline rich sweep: **9 passed / the same 5 failed**. No test was weakened.
- Shared keyboard tabs, wrapping breadcrumbs, and a single review query owner
  correct issues found during the finish pass. Five parity checks now pass;
  TypeScript and scoped lint/format pass.
- The previously unrun browser families were executed. Asset/brand/provider
  passed; 13 delivery/receiving fixture failures await current-main comparison.
- Full lint, formatting, test:capiro and architecture have unrelated failures;
  their exact baseline comparison is part of the finish-pass record, not waived.
- Nine staging entries below expand to **11 actual files**: eight source/spec
  files and three docs. A necessary extra architecture-review metadata path is
  proposed to Root but remains unapplied and unapproved. Do not publish or merge
  before that scope disposition and independent source/responsibility review.
- Tests use port5207. The earlier server on5197 and unrelated PNGs remain intact.
- Deployment acceptance has not run. After a healthy Release handback, Root must
  bind one existing authenticated page/account and any synthetic saved draft.
  The five planned checks are read/local-state only; no save, stage submit or send.

Current evidence and progress are in the orchestrator's
`work/newsletter-finish-20261031/` and
`outputs/NEWSLETTER-MERGE-SHIP-STATUS-20261031.txt`.

## Initial implementation handoff (historical)

Status at handoff: **implementation complete, 5 known test failures undiagnosed,
nothing committed, nothing deployed.** Read this whole file before touching the
branch — two committed-file traps are listed under "Traps".

Repo: `neo-capiro/capiro-frontend` (integration branch `main`)
Worktree: `C:/dev/fe-newsletter-parity-20261031`
HEAD: `b9eb11fa68113ef0a1d5ac212cdbaa26b8c9eb53` — **detached**, identical to
`origin/main` (0 ahead / 0 behind at handoff).

---

## 1. What is done

The Workspace newsletter workflow (select template → builder → review → stage in
Outreach) was rebuilt to the Capiro 3.4 frames in
`zGvvF6V6hh7yweoplCdpdE`. Each frame draws its **visible** variant in the `NL/*`
layer; the sibling `Main` layer in every frame is `hidden="true"` and is NOT the
target (an earlier pass had built against it and against the 3.0 file
`976:*` nodes — that is why the old parity CSS cites `976:190063`).

Target frames and the layer that actually renders:

| Step | Frame | Visible layer |
|---|---|---|
| Select template | `1064:260850` | `1170:275456` |
| Builder | `1064:260936` | `1170:275629` |
| Review | `1064:261027` | `1170:275852` |
| Stage in Outreach | `1064:261084` | `1170:275995` (overlay/dialog) |

Geometry implemented from those layers: 1208px Workspace body, 24px gutter,
1160px content column, 18px breadcrumb, 34/20 heading, 16px section rhythm,
36px controls, 45px inputs, 12px radius / 17px padding panels, builder columns
154 | canvas | 354, review columns preview | 354.

Files (all under `apps/web/`):

- `src/features/modules/workspace/newsletter/newsletter-figma.module.css` — NEW.
  Entire 3.4 geometry for the workflow. Imported only by the four newsletter
  components. Above 1101px it pulls the shell's 40/64px inset back to the frame's
  24px gutter from inside the page (`margin: -16px -40px 0`); the shared
  `module-shell.module.css` was deliberately **not** edited.
- `src/features/modules/workspace/newsletter/NewsletterWorkflow.tsx` — 5-segment
  breadcrumb, per-step heading/subtitle, per-step action rows, builder
  rail/canvas/inspector grid, review tabs + grid, `data-design-node` updated to
  the 1064:* ids.
- `src/features/modules/workspace/newsletter/NewsletterTemplates.tsx` — tabs,
  "Find your starting point" filter panel, "Recommended for your work" gallery,
  frame card anatomy (clipped real email thumbnail, chip, name, description,
  Preview + Apply).
- `src/features/modules/workspace/newsletter/NewsletterComments.tsx` — Comments
  inspector (title, hint, comment cards with status chip, composer). Tab row can
  be owned by the caller (`view` / `onViewChange` props); the review step renders
  the frame's page-level `Open · N` / `Resolved · N` tabs.
- `src/features/modules/workspace/newsletter/NewsletterStaging.tsx` — kept the
  already-correct 3.4 dialog chrome (`newsletter-staging.module.css`, 760px,
  `NEWSLETTER` eyebrow via `::before`); body now opens with the frame's
  "Prepare this version for delivery" panel.
- `src/features/modules/workspace/newsletter/newsletter-model.ts` — preset
  `purpose` / `style` / `industry` for the filter row.
- `test/browser/newsletter-figma-capture.spec.ts` — NEW. Captures the three
  steps at 1440x1040 into `CAPIRO_FIGMA_CAPTURE_DIR`
  (default `C:/ProgramData/Hermes/cache/scratch/fe-newsletter`).
- `test/browser/newsletter-figma-stage-capture.spec.ts` — NEW. Captures the
  stage dialog.

## 2. Deliberate deviations (carry into the PR body verbatim)

Frame controls with nothing behind them are not drawn; capabilities the product
already has are not deleted. Recorded in
`docs/newsletter-figma34-parity-20261031/README.md`.

- Builder header keeps **Save draft** (save without leaving) next to Preview /
  Save and exit / Stage in Outreach. The frame's `Actions` and `Comments`
  buttons are omitted.
- Builder rail draws ADD CONTENT + BLOCKS + the ten block kinds that exist.
  Sections/Styles/Optimize tabs, Video/Apps/Footer, Columns layouts and Saved
  sections are omitted — nothing implements them.
- Builder inspector is **Newsletter settings** (Subject, Preview text, Document
  name, Client, Firm name, Mailing address, Change template, Convert to rich
  newsletter). The 3.4 frames move these off-canvas; they still have to exist.
- Review header keeps **Stage in Outreach**; Invite and In-app notifications are
  omitted.
- Stage dialog keeps the verified selection (saved version, Outreach session,
  explicit review checkbox) required by the staging contract; primary button
  stays "Stage saved version".
- The module shell's own `← Modules / Workspace` breadcrumb row still renders
  above the workflow. Removing it means editing shared shell chrome, which was
  judged out of scope; it is the one visible frame mismatch left.
- Blank template card previews an empty canvas (documented design gap MOD-D01).

## 3. Verification already run (real output, not claims)

| Command (from `apps/web`) | Result |
|---|---|
| `tsc --noEmit` (NODE_OPTIONS `--max-old-space-size=10240`) | 0 errors |
| `eslint` on the four changed components | clean |
| `prettier --write` on changed files | applied; re-run `--check` before pushing |
| `playwright test … newsletter-staging workspace-newsletter-atomic-save newsletter-figma-capture newsletter-figma-stage-capture` | **35 passed** |
| `… newsletter-review newsletter-collaboration newsletter-template-library` | **33 passed** |
| `… newsletter-document- newsletter-content newsletter-rich newsletter-basic-conversion newsletter-write-recovery newsletter-section-library newsletter-stock` | **52 passed, 5 failed** |

The 5 failures are all `test/browser/newsletter-rich.spec.ts` (list selection
never finds the "Synthetic rich draft" button; the "This newsletter is
unavailable…" copy never appears; one `toHaveCSS` mismatch). Those routes are
Outreach rich-draft routes, not files this change touches, but **they have not
been proven pre-existing on the base commit — that is the first task below.**

One regression the rewrite introduced was already fixed: the action row did not
wrap and produced 494px of horizontal scroll at 390px viewport. A throwaway
probe spec confirmed 390/390 before it was deleted; the two mobile staging tests
cover it now.

## 4. Traps

1. **Six unrelated modified PNGs are sitting in the worktree**
   (`docs/meri-chat-first-20261030/screenshots/*.png`). They are not part of this
   change. Never `git add -A`; stage explicit paths only.
2. **A stale vite harness server still listens on 127.0.0.1:5197** (pid 8472,
   left by a killed suite run). The harness config has
   `reuseExistingServer: false`, so a run on 5197 fails immediately with
   "already used". Run with `CAPIRO_BROWSER_TEST_PORT=5207` (or kill pid 8472 —
   that needs approval, `taskkill /PID 8472 /T /F`).
3. Test the **workflows**, not the tree: `git worktree list` shows ~100 other
   checkouts; only this one holds the change.
4. Detached HEAD: create the branch *before* committing.

## 5. Remaining work, in order

### 5.1 Prove (or disprove) the 5 rich failures on the base

```bash
cd /c/dev/fe-newsletter-parity-20261031
git stash push -m "fe-newsletter-parity"          # change is still uncommitted
cd apps/web
CAPIRO_BROWSER_TEST_PORT=5207 ../../node_modules/.bin/playwright test \
  --config test/browser/playwright.config.ts newsletter-rich --reporter=line
cd ../..
git stash pop                                     # confirm the pop happened
```

- Base also fails the same 5 → record "pre-existing on `b9eb11fa6`", quote the
  run, continue.
- Base passes → it is a regression from this change; debug before pushing.

### 5.2 Finish the spec sweep

```bash
cd apps/web
CAPIRO_BROWSER_TEST_PORT=5207 ../../node_modules/.bin/playwright test \
  --config test/browser/playwright.config.ts \
  newsletter-brand- newsletter-provider- newsletter-asset \
  newsletter-delivery newsletter-receiving --reporter=line
```

Plus the standing gates from the repo AGENTS.md:

```bash
npm run lint --workspace @capiro/web
npm run format:check --workspace @capiro/web
npm run typecheck --workspace @capiro/web
npm run test:capiro --workspace @capiro/web
```

### 5.3 Commit on a branch cut from origin/main

```bash
cd /c/dev/fe-newsletter-parity-20261031
git fetch origin main
git checkout -b hermes/newsletter-figma34-parity-20261031 origin/main
git add \
  apps/web/src/features/modules/workspace/newsletter/newsletter-figma.module.css \
  apps/web/src/features/modules/workspace/newsletter/NewsletterWorkflow.tsx \
  apps/web/src/features/modules/workspace/newsletter/NewsletterTemplates.tsx \
  apps/web/src/features/modules/workspace/newsletter/NewsletterComments.tsx \
  apps/web/src/features/modules/workspace/newsletter/NewsletterStaging.tsx \
  apps/web/src/features/modules/workspace/newsletter/newsletter-model.ts \
  apps/web/test/browser/newsletter-figma-capture.spec.ts \
  apps/web/test/browser/newsletter-figma-stage-capture.spec.ts \
  docs/newsletter-figma34-parity-20261031/
git status --short          # only the six PNGs should remain unstaged
git commit -m "feat(workspace): rebuild the newsletter workflow to the Capiro 3.4 frames"
```

Invariant to check before pushing:

```bash
git diff --name-only origin/main...HEAD
```

must be exactly the nine paths above.

### 5.4 Open the PR

```bash
git push -u origin hermes/newsletter-figma34-parity-20261031
gh pr create --base main --head hermes/newsletter-figma34-parity-20261031 \
  --title "feat(workspace): newsletter workflow parity with Capiro 3.4 frames" \
  --body-file docs/newsletter-figma34-parity-20261031/PR-BODY.md
```

PR body must state: the four frames and the `NL/*` visible-layer finding; the
nine changed/added paths; the deviation list from section 2; the parity-spec
copy moves ("Create a newsletter" → "Select a template", "Newsletter preview &
review" → "Newsletter review", "Preview & review" → "Preview", "Apply template"
→ "Apply") — these strings only existed in the throwaway capture spec, no
committed gate moved; the test evidence table from section 3 with the rich-spec
verdict; and the capture paths.

Reviewer guidance: the CSS module is the whole visual contract — diff it against
the frame geometry in section 1 rather than reading the JSX line by line.

### 5.5 Visual acceptance before merge

Captures on the final bytes:

```bash
cd apps/web
CAPIRO_BROWSER_TEST_PORT=5207 CAPIRO_FIGMA_CAPTURE_DIR=C:/ProgramData/Hermes/cache/scratch/fe-newsletter \
  ../../node_modules/.bin/playwright test --config test/browser/playwright.config.ts \
  newsletter-figma-capture newsletter-figma-stage-capture --reporter=line
```

Figma exports for side-by-side comparison already exist in
`C:/ProgramData/Hermes/cache/scratch/fe-newsletter/figma/`
(`01-template.png`, `02-builder.png`, `03-review.png`, `04-stage.png`). Both sets
were compared at 1440x1040; the remaining known differences are the six
deviations in section 2.

Note: Playwright clears `test-results/` at the start of every run — copy captures
out before the next run.

### 5.6 Ship

Deployment is **user-run** for production; do not deploy unasked.

- The web app `app.capiro.ai` is ECS service `capiro-portfolio-preview` in
  cluster `capiro-portfolio-preview`; Core API is
  `capiro-preview-first-chat-core`. Images are built by CodeBuild and are ARM64.
- Deploy path: merge to `main` → CI builds the image → new task definition →
  service update. Read the deployed image tag back
  (`aws ecs describe-task-definition --query 'taskDefinition.containerDefinitions[0].image'`)
  and confirm it is the merge commit before claiming the release.
- Verify after deploy, on the real host with a real session: `/modules/workspace?view=newsletter`
  renders "Select a template" with the 24px gutter, the filter panel and the
  gallery; apply a template and confirm the builder's three columns; preview and
  confirm the review tabs and comments inspector; open Stage in Outreach and
  confirm the 760px dialog. A local green suite is not deployed acceptance.
- Do not run an authenticated production browse or a canary on Neo's behalf;
  hand him the exact routes and the expected copy.

## 6. Owner decisions already taken (do not reopen)

- Target the `NL/*` visible layers, not `Main`.
- Keep Save draft, the staging verification controls, and the settings inspector;
  omit dead frame controls rather than render them disabled.
- Pull the shell inset back from inside the parity module rather than editing
  shared shell padding.
- Leave the shell breadcrumb row (section 2, last bullet) as a documented
  deviation. If Neo wants it gone, it belongs in its own change to
  `ModuleBreadcrumb.tsx` (which already has a precedent: it returns `null` for
  `intelligence` + `view=legiwatch`).
