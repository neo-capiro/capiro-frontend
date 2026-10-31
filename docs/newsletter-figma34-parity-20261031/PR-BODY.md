## What this changes

Rebuilds the Workspace newsletter workflow to the Capiro 3.4 frames in
`zGvvF6V6hh7yweoplCdpdE`: select template → builder → review → stage in
Outreach.

Each frame draws its visible variant in the `NL/*` layer; the sibling `Main`
layer is `hidden="true"` in every frame and is not the target. An earlier parity
layer had been built against `Main` and against the 3.0 file (`976:*` node ids),
which is why the previous stylesheet cited `976:190063`.

| Step | Frame | Visible layer |
|---|---|---|
| Select template | `1064:260850` | `1170:275456` |
| Builder | `1064:260936` | `1170:275629` |
| Review | `1064:261027` | `1170:275852` |
| Stage in Outreach | `1064:261084` | `1170:275995` (overlay) |

Geometry implemented from those layers: 1208px Workspace body, 24px gutter,
1160px content column, 18px breadcrumb, 34/20 heading, 16px section rhythm,
36px controls, 45px inputs, 12px radius / 17px padding panels, builder columns
154 | canvas | 354, review columns preview | 354.

## Files

Added
- `apps/web/src/features/modules/workspace/newsletter/newsletter-figma.module.css` — all 3.4 geometry for this surface; imported only by the four newsletter components. Above 1101px it pulls the shell's 40/64px inset back to the frame's 24px gutter from inside the page; `module-shell.module.css` is untouched.
- `apps/web/test/browser/newsletter-figma-capture.spec.ts` — 1440x1040 captures of the three steps.
- `apps/web/test/browser/newsletter-figma-stage-capture.spec.ts` — the stage dialog.
- `docs/newsletter-figma34-parity-20261031/README.md`, `HANDOFF.md` — living record, deviations, merge/ship steps.

Changed
- `NewsletterWorkflow.tsx` — 5-segment breadcrumb, per-step heading/subtitle, per-step action rows, builder rail/canvas/inspector grid, review tabs + grid, `data-design-node` moved to the `1064:*` ids.
- `NewsletterTemplates.tsx` — tabs, "Find your starting point" filter panel, "Recommended for your work" gallery, frame card anatomy (clipped real email thumbnail, chip, name, description, Preview + Apply).
- `NewsletterComments.tsx` — Comments inspector with status chips and composer; the tab row can be owned by the caller, and the review step renders the frame's page-level `Open · N` / `Resolved · N` tabs.
- `NewsletterStaging.tsx` — keeps the existing 760px 3.4 dialog chrome; body now opens with the frame's "Prepare this version for delivery" panel.
- `newsletter-model.ts` — preset `purpose` / `style` / `industry` for the filter row.

## Copy moves (deliberate, disclosed)

`Create a newsletter` → `Select a template`; `Newsletter preview & review` →
`Newsletter review`; `Preview & review` → `Preview`; `Apply template` → `Apply`;
gallery card `Start blank` → `Apply`. These strings existed only in the
throwaway capture spec — no committed browser gate moved, and no test assertion
was weakened. `Save draft` was retained under its existing label because
`workspace-newsletter-atomic-save`, `newsletter-basic-conversion` and
`newsletter-rich` drive it by name.

## Deliberate deviations

Frame controls with no implementation behind them are not drawn; capabilities the
product already has are not deleted.

- Builder header keeps **Save draft** beside Preview / Save and exit / Stage in Outreach; the frame's `Actions` and `Comments` buttons are omitted.
- Builder rail draws ADD CONTENT + BLOCKS + the ten block kinds that exist; Sections/Styles/Optimize tabs, Video/Apps/Footer, Columns layouts and Saved sections are omitted.
- Builder inspector is **Newsletter settings** (Subject, Preview text, Document name, Client, Firm name, Mailing address, Change template, Convert to rich newsletter). The frames move these off-canvas; they still have to exist.
- Review header keeps **Stage in Outreach**; Invite and In-app notifications are omitted.
- Stage dialog keeps the verified selection (saved version, Outreach session, explicit review checkbox) required by the staging contract; the primary button stays "Stage saved version".
- The module shell's `← Modules / Workspace` breadcrumb row still renders above the workflow — removing it means editing shared shell chrome and is left to its own change.
- Blank template card previews an empty canvas (documented design gap MOD-D01).

## Verification

Finish-pass qualification is in progress on integration base `6d1465cf9`.
The original `b9eb11fa` rich sweep reproduced the exact five reported failures
(9 passed, 5 failed). All five final parity checks pass, including keyboard
navigation/filtering, 390px fit, 760px dialog and comment-count reload ownership.
Final TypeScript and scoped lint/format pass. The previously unrun families have
now run: asset/brand/provider pass; 13 delivery/receiving fixture failures are
being compared against current main. Broader gate failures remain explicit;
this document will receive the complete comparison before PR publication.

The following table is the original implementation evidence, retained as history:

| Command (from `apps/web`) | Result |
|---|---|
| `tsc --noEmit` | 0 errors |
| `eslint` on the four changed components | clean |
| `prettier --check` on changed files | clean |
| `playwright … newsletter-staging workspace-newsletter-atomic-save newsletter-figma-capture newsletter-figma-stage-capture` | 35 passed |
| `… newsletter-review newsletter-collaboration newsletter-template-library` | 33 passed |
| `… newsletter-document- newsletter-content newsletter-rich newsletter-basic-conversion newsletter-write-recovery newsletter-section-library newsletter-stock` | 52 passed, 5 failed |

The 5 failures are all in `newsletter-rich.spec.ts` (Outreach rich-draft routes,
not files this change touches). Verdict on the base commit is recorded in the
handoff before merge; if they are pre-existing they are quoted as such, not
silently excluded.

Captures: `C:/ProgramData/Hermes/cache/scratch/fe-newsletter/` (`01-template.png`,
`02-builder.png`, `03-review.png`, `04-stage.png`), compared against the Figma
exports in `…/fe-newsletter/figma/` at 1440x1040.

## Reviewer guidance

The CSS module is the visual contract — diff it against the frame geometry above
rather than reading the JSX line by line. The JSX change is structural only: the
same hooks, the same operations, the same save and staging paths.

Not yet run: production deployment and authenticated production acceptance.
The user has assigned completion to Codex, with existing Release retaining sole
cloud custody. No send is authorized by this visual-parity change.
