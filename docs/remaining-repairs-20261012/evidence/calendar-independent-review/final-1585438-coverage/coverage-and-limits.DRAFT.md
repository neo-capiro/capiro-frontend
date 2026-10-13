# 1585438 coverage and limits addendum — awaiting Portfolio completion

**Prepared, not sealed.** Root's completed full Portfolio receipt is required before finalization. Partial progress is not final qualification.

Source `1585438295776604f23a5cb5ab592729f7c468ca`; root tree `2c2236b9004b04f309dc0cdd9b360d8c6b97a2bd`; application tree `82cf7118a68c6ac45087a0198e1917fbd001cc6e`; runtime source tree `fa4ca7b5ca126f7bcdc1cf816584fa0303d61704`. The runtime source is unchanged from d68. The test-inclusive application tree changed from d68's `9f0698bd6d9cfefb7648fd899ee22f4e3b541617`: the only test change adds explicit expanded/listbox/option-focus barriers to the MS08 keyboard scenario; the other changed path is its structure review.

The [sealed d68 audit](../final-d68-coverage/coverage-and-limits.md) remains immutable, including its 207/1 Modules failure and unrun Portfolio cutoff. All prior sealed hashes were reverified. This addendum rebinds its 46 exact references to the new source; it does not erase the earlier failure.

| Gate | Exact-source result observed |
| --- | --- |
| Clean install, combined static/unit/transport checks, production build | Exit 0 |
| Elements preparation and qualification | Exit 0 |
| Actual Next standalone host smoke | Exit 0; no credentials or native service interception |
| Docker context checks | Exit 0 |
| Modules browser | **208 passed, zero failed**, one worker, zero retries |
| Portfolio browser | **PENDING root completion** |
| Docker image build | Recorded exit 1; neither context success nor host smoke is an image/runtime deployment qualification |

## What navigation evidence establishes

Actual [standalone checks](/workspace/capiro-remaining/apps/web/tests/production/verify-standalone.mjs:67) cover **desktop four-mode navigation and back/forward**: Meri, Portfolio, Modules and Settings. The four-mode/history segment explicitly restores a 1440px viewport before Modules/Settings at line 161. **Mobile (390px) covers Portfolio entry and return to Meri only**, in both light and dark themes; it does not establish mobile four-mode history. Same-document navigation, scoped styling, images and no overflow are asserted in these bounded credential-free setup/home surfaces.

The [shared integration fixture](/workspace/capiro-remaining/apps/web/test/browser/integration.spec.ts:37) additionally exercises client hints, cross-mode draft scope, history and a mobile Modules menu. Its Clerk identity, navigation adapters and API responses are synthetic. It is separate evidence from actual Next standalone navigation.

## Coverage that remains bounded

- Sign-out, expiry, organization/session changes and client/tenant replacement have explicit shared-boundary and feature fixture assertions, including hidden former data/drafts, no replay and refused late results. These do not execute real Clerk login/logout/token revocation or native ACL changes.
- Interrupted/ambiguous writes have feature-specific request-count, exact-key, retained-draft, reload and current-read checks. They do not prove native durability, exactly-once provider effects, real network partition recovery or worker/database restart behavior.
- Meri's real public transport/AI SDK composition is qualified offline with injected streams. Reconnect cursor, malformed/replayed events and authoritative run status are covered; stop/dispose explicitly detach without durable cancellation. The full Meri composer/workspace remains a disconnected sample with send and Stop/Steer/Resume/Fork/Approve/Download disabled. A connected authenticated workspace, execution/control receipts and source/artifact access remain unimplemented or unrun in this frontend scope.
- Desktop/mobile screenshots, selected Figma comparisons, keyboard focus, semantics and geometry checks are bounded evidence. They do not establish all-frame Figma pixel parity, a complete assistive-technology/WCAG audit, zoom/reduced-motion coverage, Firefox/WebKit/device coverage or connected-workspace accessibility.
- No real provider messaging, billing, paid-model/native mutation, deployed-container behavior or production cutover is qualified by these fixture/host results.

No source/index changes or runtime execution were performed for this addendum. Root retains final gate ownership. Final sealing waits for the full Portfolio completion notice and immutable raw result/exit receipts.
