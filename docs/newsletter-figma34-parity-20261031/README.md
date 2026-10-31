# Newsletter workflow — Capiro 3.4 Figma parity

Living handoff. Update in place as the surface or the frames change.

**To finish merge and ship, read `HANDOFF.md` in this directory first** — it
carries the exact state, the traps (unrelated dirty PNGs, stale harness port),
the remaining gates, the commit/PR commands and the ship checklist. `PR-BODY.md`
is the ready-to-use pull-request body.

## Target

Capiro 3.4 Modules/Settings, newsletter family (`zGvvF6V6hh7yweoplCdpdE`). The
frames draw their visible variant in the `NL/*` layers; the older sibling
`Main` layer in each frame is hidden and is **not** the target.

| Step              | Frame       | Visible layer                |
| ----------------- | ----------- | ---------------------------- |
| Select template   | 1064:260850 | 1170:275456                  |
| Builder           | 1064:260936 | 1170:275629                  |
| Review            | 1064:261027 | 1170:275852                  |
| Stage in Outreach | 1064:261084 | 1170:275995 (overlay/dialog) |

Geometry taken from the frames: 1208px Workspace body, 24px gutter, 1160px
content column, 18px breadcrumb, 34/20 heading, 16px section rhythm, 36px
controls, 45px inputs, 12px panel radius, 17px panel padding, builder columns
154 | canvas | 354, review columns preview | 354.

## Implementation

- `apps/web/src/features/modules/workspace/newsletter/newsletter-figma.module.css`
  — the whole 3.4 geometry for the workflow. It is imported only by the four
  newsletter components, so no other Workspace screen changes. Above 1101px the
  page pulls the shell's 40/64px inset back to the frame's 24px gutter
  (`margin: -16px -40px 0`) instead of editing the shared shell padding.
- `NewsletterWorkflow.tsx` — 5-segment breadcrumb, per-step heading/subtitle,
  per-step action row, builder (rail / canvas / inspector) and review grids.
- `NewsletterTemplates.tsx` — tabs, "Find your starting point" filter panel,
  "Recommended for your work" gallery, card anatomy (thumbnail, chip, name,
  description, Preview + Apply).
- `NewsletterComments.tsx` — Comments inspector: title, hint, `Open · N` /
  `Resolved · N` tabs, comment cards with status chip, composer.
- `NewsletterStaging.tsx` — the existing 760px 3.4 dialog chrome is kept; the
  review body now opens with the frame's "Prepare this version for delivery"
  panel.

## Deliberate deviations (capability kept, frame element not drawn)

These are recorded decisions, not oversights. Each would otherwise render a
dead affordance or delete a capability the product already has.

- Builder header keeps **Save draft** (save without leaving) beside Preview /
  Save and exit / Stage in Outreach; the frame's `Actions` and `Comments`
  buttons are omitted (no behaviour behind them in this surface).
- Builder rail draws ADD CONTENT + BLOCKS + the ten block kinds that exist. The
  frame's Blocks/Sections/Styles/Optimize tabs, Video/Apps/Footer blocks,
  Columns layouts and Saved sections are omitted — nothing implements them.
- Builder inspector is **Newsletter settings** (Subject, Preview text, Document
  name, Client, Firm name, Mailing address, Change template, Convert to rich
  newsletter). The 3.4 frames move these off-canvas; they still have to exist,
  and the inspector is where the frame family puts per-document controls.
- Review header keeps **Stage in Outreach** (the frame only offers it from the
  builder); Invite and In-app notifications are omitted.
- Stage dialog keeps the verified selection (saved version, Outreach session,
  explicit review checkbox) required by the staging contract, and its primary
  button stays "Stage saved version".
- Blank template card previews an empty canvas rather than sample copy
  (documented design gap MOD-D01).

## Evidence

- `test/browser/newsletter-figma-capture.spec.ts` — 1440x1040 captures of the
  three steps into `CAPIRO_FIGMA_CAPTURE_DIR` (default
  `C:/ProgramData/Hermes/cache/scratch/fe-newsletter`).
- `test/browser/newsletter-figma-stage-capture.spec.ts` — the stage dialog.
- `workspace-newsletter-atomic-save.spec.ts` (10), `newsletter-staging.spec.ts`
  (23) pass on the final bytes.

## Finish-pass responsibility review (pending independent acceptance)

<a id="responsibility-review"></a>

The scoped stylesheet is the four-frame newsletter visual contract, and only
newsletter components import it. Unused new selectors were removed. Shared
`Tabs` owns keyboard behavior rather than each screen implementing another tab
controller. Shared shell geometry and tokens remain outside this change.

`NewsletterWorkflow` composes the existing save/recovery, conversion, comments
and staging owners. Its one review-only comment query is supplied to
`NewsletterComments`, ensuring tab counts and rows refresh together after a
decision; standalone comments retain their existing local query. No persistence
or authorization owner changes. `NewsletterTemplates` owns selection/filtering
of existing presets; its library tabs link to the canonical Workspace/Templates
surfaces without duplicated or truncated lists or preset-only filters.
`NewsletterStaging` retains its existing four-state transaction and receipt
owners and adds presentation only. These cohesive responsibilities require
exact size-review records, not splitting solely to evade thresholds.

The existing handoff's nine staging entries expand to eleven files (eight
source/spec files plus the three files in this documentation directory).
The required size-review metadata exception is proposed separately and is not
applied or counted as approved until independent review and Root disposition.

The finish pass preserves the existing subject/preheader review rows and guarded
Workspace exit. The new Modules breadcrumb is a static label, so it cannot bypass
unsaved-edit confirmation or the editor's disabled state. Canonical library links
are another explicit visual behavior difference from an inline library preview.
