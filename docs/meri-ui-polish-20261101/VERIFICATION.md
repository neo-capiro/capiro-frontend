# Meri scrolling and sidebar sizing

The chat shell now bounds the transcript to the visible viewport, while the sidebar scrolls independently. A short window or tall composer can scroll the conversation frame so Send remains reachable. The sidebar divider supports pointer dragging, arrow keys (Shift for larger steps), Home/End and Enter to reset. Its 232–480px width is a device-local appearance preference; the existing tablet rail and phone workspace menu remain.

Recent titles use two visible lines, retain their complete accessible names and hover titles, and mark the selected conversation. No service, account, Research lifecycle, legislative, package or lockfile changes are included.

## Evidence scope

All screenshots in this directory are from isolated synthetic fixtures with mocked services. The unchanged b400955b baseline visibly lets a long recent title overlap the transcript and gives the long transcript zero internal scroll range. The same fixture passes after this change. Live app inspection is **not verified**: supported Computer Use stopped because it could not reliably determine the Windows browser URL. Merge, deployment and serving acceptance are separate requirements.

- [Baseline desktop](desktop-before.png)
- [Desktop after](desktop-after.png)
- [Wide sidebar, dark mode](desktop-wide-dark.png)
- [Phone after](phone-after.png)
- [Short window with a multiline draft](short-composer-after.png)

## Validation

The focused fixture command uses the existing Vite development harness and a separate temporary browser context. It does not use a signed-in product profile or run a local production build.

```powershell
$env:CAPIRO_BROWSER_TEST_DEV='1'
$env:CAPIRO_BROWSER_TEST_PORT='5417'
node ../../node_modules/@playwright/test/cli.js test --config test/browser/playwright.config.ts test/browser/meri-layout-resize.spec.ts test/browser/meri-sidebar-toggle.spec.ts test/browser/meri-chat-first.spec.ts --grep 'divider|long transcript|blocked preference|short phone|invalid saved|functional desktop sidebar|desktop healthy empty|desktop tools|phone .*viewport|failed history read' --reporter=list
```

Run from apps/web, using the repository lock and Node24.22.1. Coverage includes pointer and keyboard resizing, width limits, cancellation, persistence, collapse/tablet behavior, blocked/invalid storage, long transcript and history scrolling, keyboard transcript scrolling, title containment, light/dark desktop widths, 320/390px phones, short-height composer access, empty/error states and Tools focus behavior.

The existing Figma Home toggle fixture fails before rendering its heading under the current harness; the identical failure was reproduced on unchanged b400955b. It is retained and was not weakened or skipped in source. Development runs emit duplicate session-key console warnings on both unchanged baseline and candidate.

Full type checking reports the same five errors on unchanged b400955b and this change: DocumentInspectionSummary, workflow-adapter and meri-document-access-fixtures have inherited XML typing gaps; objective-legacy-plan-boundary has two possibly-undefined accesses. The full architecture scan also retains the baseline's 11 boundary errors and 156 blocking size findings, with no added findings or errors in the changed files. These baseline failures are not described as passing gates.

Final results: focused browser fixtures **13/13 passed**; recents and Research shell/retirement units **14/14 passed**; changed-file ESLint and Prettier checks passed. The baseline failures and live-verification limitation above remain open.
