# Exact PortfolioIndex cohesion review

Accepted for this finite correction, not a blanket size exemption:

- File `apps/web/src/features/portfolio/index/PortfolioIndex.tsx`, 418 nonblank lines, fingerprint `20e7c9daf399395e159833b5c43744ba8bc5e6add49bbaa0fb22f31fbd54a3e9`.
- Function `PortfolioIndex` at line47, 370 nonblank lines, fingerprint `81352fd3ffd6b394c5877801d2b51607088b6c2a0dbb2a5b0a68d3716382b3e7`.
- Exact changed source SHA256 `915bef440404c2218822cf7744d959b50e120481e15f470b88cf4bb6ceaa0f69`; compared to parent3886881d.

I read the complete owner and the attention child, existing CSS and consumer map. The owner assembles the Portfolio index: current query states, URL filters, catalog projection, profile/prospect presentation and existing dialog triggers. Data access remains in query hooks, catalog filtering in `catalog-projection`, attention permission/feed filtering in its existing query/model child, profile ordering in `PortfolioProfiles`, and creation/objective dialogs in their respective components. It does not add HTTP, persistence, provider execution or server authorization responsibilities.

The entire changed behavior is the order of one existing child within the same layout container; its input and presence condition are unchanged. Restoring attention before profiles makes single-column DOM/reading/focus order match the existing mobile requirement. Desktop retains explicit grid columns/rows in `portfolio.module.css:613–627`. This is an appropriate change in the composition owner. Extracting the surrounding JSX solely to reduce the line count would obscure the intended sibling ordering and does not resolve a new responsibility problem. No new abstraction or import edge is warranted.

The scope requires the existing mobile order/pulse and desktop geometry assertions plus relevant accessibility/navigation consumers; no baseline rewrite. Author final ten-spec Modules replay reports60/60; the 28-spec Portfolio union was still in progress when this assessment was written. Architecture boundary errors are zero; the18 inherited unreviewed obligations are neither accepted nor altered by this two-fingerprint review. Final source rehash and browser results remain part of the source handoff.
