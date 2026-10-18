# Modules and Settings shared desktop visual follow-up

Date: 18 October 2026 UTC. Source base: frontend PR #92, `271a267d`. The feature-owned Modules and Settings changes are in [PR #94](https://github.com/neo-capiro/capiro-frontend/pull/94); its [frame-to-route audit](https://github.com/neo-capiro/capiro-frontend/blob/codex/modules-settings-figma34-20261018/docs/modules-settings/FIGMA-3.4-DESKTOP-AUDIT-20261018.md) maps the 1440 × 1040 light frames and contract limits. This follow-up owns only the shared header, rail, and table presentation proposed there. The actual Figma Modules hub (`1064:191436`) and Settings Personal (`1064:243056`) frames were inspected.

## Shared source changes

- `ModuleHeader` keeps the existing `HeaderFrame` and 196 px brand slot. A functional 32 × 32 PanelLeft button at x176/y16 controls either the Modules rail or the Settings rail through a local `ModuleShell` client provider. Its `aria-controls`, `aria-expanded`, keyboard activation, and visible focus state were checked. The control is hidden at tablet and phone widths, where the existing mobile Modules menu remains.
- The Modules header now inherits `HeaderFrame`'s 1 px divider below the 64 px content band. The 232 px Modules rail stays within the 975 px viewport below the header, keeps its Settings link at y988, and scrolls its module links internally on short desktop windows. The Settings rail also stays viewport-bound at desktop widths while retaining authorized Capiro HQ entries and internal scrolling. No Portfolio or Meri header geometry changed.
- The shared `module-ui/DataTable` now supports an opt-in `visuallyHiddenHeader` column property. It leaves `<th scope="col">` and a nonempty accessible label in place while hiding only its visual text. All existing callers retain their current headings by default. PR #94's Team Members, Pending Invitations, and Profiles action columns must explicitly opt in during integration; this branch does not edit their feature-owned columns.

The current Modules and Settings browser captures are `/tmp/figma34-modules-shell-1440.png` and `/tmp/figma34-settings-shell-1440.png`. Both are ordinary-route 1440 × 1040 light captures using local test data. The Modules capture measures header `(0,0,1440×65)`, button `(176,16,32×32)`, rail `(0,65,232×975)`, and Settings link `(16,988,199×36)`. The feature content in this branch remains PR #92's earlier Hub/Settings version, so compare its shell anchors rather than treating the capture as PR #94 feature parity.

## Remaining coordination

- PR #94 must opt the desired action columns into the hidden-header API and check that the column is still named “Actions” to assistive technology. The shared wrapper alone intentionally makes no visible table change.
- The standard Figma Settings rail omits Capiro HQ, but authorized Capiro admins currently use those links. Their destination needs a design decision before hiding or relocating the group.
- Figma's returned PanelLeft asset URL failed with HTTP 403 and zero downloaded bytes using its documented retrieval method. The installed Lucide PanelLeft matches the measured size/position; SVG byte identity is unverified. No asset manifest or lockfile was changed.
- Mobile, dark, contract-specific Team Pending, Integrations, Profiles ownership, and Billing states remain with their respective owners and design decisions. No runtime, chat, proxy, auth, or deployment source was changed in this shared pass.

## Verification

The focused ordinary-route Playwright spec covers `/modules` and `/settings/personal` at 1440 × 1040, including rail/toggle bounds, desktop scrolling, keyboard focus and activation, collapsed state, tablet rail, and existing phone navigation. It passed **2/2 after the Settings viewport rule**. Existing navigation and mobile Settings regressions passed **2/2**. Focused lint found zero errors and two existing image warnings; Prettier and `git diff --check` passed. The architecture gate reported `errors: []` and zero blocking size findings after the shared table header was extracted into its own small presentation component. `npm run build` passed for `@capiro/meri-client` and the Next.js web app, including TypeScript and 283 static pages.
