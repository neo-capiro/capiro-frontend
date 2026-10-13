# Supplemental axe audit: findings remain

The existing installed **axe-core 4.14.0** was injected locally into isolated fixture pages. Each audit calls `axe.run(document)` with **all default rules and no options, filtering, exclusions or suppression**. No dependency was installed or changed. Runner script hash, exact page/source bindings, browser version, all violation/incomplete nodes and screenshots are preserved in the six `a11y/*.json` files; `A11Y-SUMMARY.json` retains every reported node.

The six runner checks completed using one worker, 30 seconds per case and zero retries. This means collection succeeded, **not that accessibility passed**. Incomplete results remain unresolved manual-review work.

| Synthetic state | Viewport | Violations: rule IDs and node counts | Incomplete: rule IDs and node counts |
| --- | --- | --- | --- |
| Portfolio | 1440×1040 | color-contrast 2; heading-order 1; label-content-name-mismatch 1 | aria-prohibited-attr 3; color-contrast 13; label-content-name-mismatch 1 |
| Portfolio | 390×844 | color-contrast 2; heading-order 1; label-content-name-mismatch 1 | aria-prohibited-attr 3; color-contrast 13; label-content-name-mismatch 1 |
| Meri | 1440×1040 | aria-allowed-role 1; color-contrast 3; region 1 | aria-prohibited-attr 1; color-contrast 1 |
| Meri | 390×844 | aria-allowed-role 1; color-contrast 1; region 1 | aria-prohibited-attr 1 |
| Modules | 1440×1040 | color-contrast 31; region 1 | color-contrast 2 |
| Modules | 390×844 | color-contrast 31; region 1 | color-contrast 1 |

Reported impacts and source context:

- **Serious color contrast:** reported foreground `#78716c` on `#f5f5f4` gives 4.39:1 where 4.5:1 is required. Shared light tokens originate in `apps/web/src/app/globals.css:2–6`. Portfolio eyebrow and Add profile card are affected; Meri Recent/preferences and sample scope label are affected on desktop, with the scope label retained on phone; Modules section labels, relationship copy and chip links account for the 31 affected nodes. This is a source-style finding observed with loaded fonts, not an invented comparison color.
- **Moderate heading order:** the Portfolio profile card jumps to its `h3` in `features/portfolio/index/ProfileResults.tsx:107` in the current default composition. This audit does not establish every page's heading hierarchy.
- **Serious label/content mismatch reported by axe:** Portfolio's card link at `ProfileResults.tsx:103` has `aria-label="Open Test Aerospace"` while visible nested text also contains initials and sector. Preserve the exact raw node for semantic review; no label was rewritten to make the scan pass.
- **Minor aria-allowed-role and moderate region:** Meri's production-owned disconnected notice is a `footer role="note"` at `shared/shell/ProductShell.tsx:34`. It appears below the desktop screenshot edge but is part of the audited document. It is not a fixture-host-only addition.
- **Moderate region on Modules is fixture-only:** `.test-notice` comes from `test/browser/main.tsx:146`, outside application landmarks. Keep the raw finding but do not misattribute that notice to compiled production ModuleHub.

Raw incomplete checks include node targets, markup, impact and explanatory data; none were recategorized as passing. The same source may produce repeated findings at two widths, so node counts must not be summed as unique defects. These are light-theme default home states only. No screen-reader walkthrough, interaction audit, dark-theme audit, dynamic dialog state, real sign-in, native API behavior or complete WCAG conformance claim is made. Figma comparison remains independent.
