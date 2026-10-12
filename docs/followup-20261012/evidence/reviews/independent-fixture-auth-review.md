Read-only source review of root fixture adaptation `a69e0924b15bf963b27ad8274adf87c93b39359a`: **PASS, no confirmed defect**. The commit changes only `apps/web/tests/browser/clerk.tsx`; production authentication, session boundary, transport and server configuration are unchanged.

The canonical Portfolio fixture server already maps `@clerk/nextjs` to `tests/browser/clerk.tsx`. That file now re-exports `useAuth`, `ClerkProvider`, `ClerkLoaded`, `ClerkLoading`, `ClerkFailed` and `SignIn` from the existing `apps/web/test/browser/clerk.tsx`. The relative path resolves within the existing `apps/web` Vite filesystem allow-list. These are the exports used by ApplicationBoundary/AuthenticationProvider and the relevant sign-in fixtures; the reused mock owns one `test:session` external store and its existing synthetic identity replacement behavior. The Work authority harness can therefore mount the actual application providers through the normal Portfolio suite configuration without a special external Clerk alias.

Independent Git comparison confirmed the Portfolio `UserButton` function is byte-identical to its parent commit: Test account label, monogram and32px styling are preserved. It is intentionally not re-exported from the Modules mock, whose Test profile avatar differs. Re-exporting the other functions creates no second session store and does not add a production auth bypass. The imported file accesses `window` because it is a browser-only fixture; this is not a new production/SSR module.

The separately reviewed `PortfolioHarnessProviders` composes existing DataProvider/CapiroDataProvider for general component tests, with one expiry callback. It does not claim Clerk or selected-client verification; Work's dedicated authority harness uses real ApplicationBoundary plus the synthetic session owner for those controlled assertions. This preserves the distinction between component-fixture behavior and real authentication/native acceptance.

Pinned SHA-256:

| File | SHA-256 |
| --- | --- |
| apps/web/tests/browser/clerk.tsx | `4d33465d536a14f819e1596f9563e168a02538a545f388b60ee3ef7a58a946ce` |
| apps/web/test/browser/clerk.tsx | `1fc6432fe37e193a97863f6d93ad922cd18ae48e6bb1ee2348f5f897f2403b50` |
| apps/web/tests/browser/server.mjs | `eedc3911d74e8159d105b2bea55c07ac935b05c90f71292b0138a00c6efae420` |
| apps/web/tests/browser/portfolio-harness-providers.tsx | `cf00e5c1872525771d470e254bed3c7bd3f60d13fee9e1961304c5bf6a8cd9ff` |

No tests/browser/build/server/native actions were run by this reviewer, so normal-suite execution is still a qualification step, not a result of this source review. No source or original triage manifest was edited. Final Work and Modules corrective commits remain subject to their separate delta reviews.
