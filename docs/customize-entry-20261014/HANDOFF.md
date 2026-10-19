# Customize works from the current Portfolio view

Repair source: `74bc933c07df35e51b4f15c209ab9a2ddf90191c`, application tree `1f26d8e6de286321a9519ef001cde4eaefd33241`, runtime tree `20ba251625c467aa14074bc76b64d2a9439a831b`. The separate branch `repair/capiro-customize-entry-20261014` starts at PR26 `348bf98481268a5f06e26a924f0985b242265cbb`. PR25 remains frozen at `257cf5b5db673b31c98264f9da33759c68066ba4`; shipping still builds `5ca42049325881782bc9d2ac557450d642eccee8` from its existing packet. This repair is not an instruction to substitute a new image or configuration.

## Completed behavior

Ledger CORE-098 and CORE-005 describe customization and retained list/card presentation. Four new browser baselines reproduced a concrete defect: clicking Customize from a list, non-saved sort, filtered/no-match view or an unavailable-layout filtered list set local state but exposed no editor or failure explanation.

Customize now opens the complete current profile catalog in the existing inline saved-order grid regardless of the ordinary view. A visible status explains that all profiles are being rearranged and that the prior filters/view will return. Search, owner and local view/navigation controls are temporarily inactive; their URL values stay intact. The existing pointer and keyboard movement, local Cancel, explicit Save, version/conflict handling and uncertain-write review are unchanged. Done restores the exact filtered/list/sorted presentation and keyboard focus to Customize. Empty, failed and loading catalogs also retain a local exit.

The integration browser test enters from a filtered mobile list, reorders using the keyboard, holds the save response, checks that Done cannot dismiss the pending edit, then verifies one PUT containing the complete two-profile catalog and its expected version. After the verified receipt, Done returns to the original one-profile filtered list; reload preserves that filter and reopening Customize shows the saved full order. This is synthetic persistence evidence, not a native API success claim.

The missing-route case now exposes the existing unavailable-order explanation and disabled movement, with no Save or write. No false save, fallback localStorage persistence, extra reader, endpoint or backend authorization was introduced. No Commitments UI changed. Other feature implementations, original tests, lockfiles, shared session/authorization, shipping source and configuration remain preserved.

## Design and interaction review

The Figma design-to-code skill was applied to the ledger's existing selected 3.1 frame `Zc2dEN5aLU47dVdsewDmiJ / 411:41421`. Fresh high-fidelity context and its screenshot are in the evidence packet. The header Customize control, two-column desktop card grid, mobile single column, existing card renderer and rearrangement footer remain the design basis. There is no new overlay or static asset.

The changed interaction was visually inspected at 1440px desktop and 390px dark mobile, including unavailable and saved states. The scope explanation, controls and exit are legible without horizontal overflow. Filter controls are visibly inactive during the edit. Keyboard entry/movement/return focus and full-catalog saves were exercised. The mobile success capture was repeated from the top of the page so a full-page screenshot did not place the fixed header across its middle; the first capture remains preserved.

This is bounded comparison of the existing Customize interaction. Dynamic client names/logos, unavailable real metrics, live user imagery and other pre-existing full-frame differences are not replaced with Figma fixtures. No full-screen pixel parity, new mobile Figma frame or comprehensive assistive-technology acceptance is claimed.

Reviewed captures: [desktop reorder](customize-desktop.png), [mobile saved order](customize-mobile-dark.png), [mobile unavailable source](customize-unavailable-mobile-dark.png). The fixtures are synthetic.

## Current backend receiving dependency

The private receiving branch was refreshed after implementation: [backend PR4](https://github.com/neo-capiro/capiro-backend/pull/4), `codex/backend-cleanup-receiving-20261014`, now at **`a65ae3c8a9f1f0cf96d4f7d2ae30aad2fff172ff`**. It preserves the earlier Watchlist reception and adds the reviewed memo-parser reception. The exact handoff blob is `c6cbb246d71587c7dfb3a93a1c30e4603f3406b0`. None of that cleanup is a prerequisite for basic frontend preview access.

At that exact receiving head, the candidate `apps/api/src/users/portfolio-layout/portfolio-layout.module.ts` is absent. The existing `users.module.ts` blob `ee8239726abcdc91da5f2d23872a887fe42902b0` registers only UsersController, and `users.controller.ts` blob `1bd5eb81436f3857761f4aec4af05ee7742f5ed6` has no portfolio-layout route. Readbacks are preserved in `backend-dependency-readback.json`. No protected EngagementService implementation was read or changed.

The dedicated saved-layout candidate remains [capirov2 PR2385](https://github.com/neo-capiro/capirov2/pull/2385), draft/unmerged at **`46937ce53506657658fd85d9e6ef840abb842013`**. Its `GET/PUT /api/me/portfolio-layout` module is unregistered and proposed DDL is unallocated/unapplied. The existing frontend contract still requires the full current catalog, actor/tenant echo, expected version and exact accepted order. Receiving/registration, allocated migration and native persistence/catalog/membership/concurrency checks remain that backend owner's work. This frontend change does not activate it or modify auth. Current deployed-source/route availability has not been observed.

## Evidence and remaining acceptance

See [QUALIFICATION.json](QUALIFICATION.json), [EVIDENCE-MANIFEST.json](EVIDENCE-MANIFEST.json) and [evidence.tar.gz](evidence.tar.gz). Four original failing browser cases now pass. The source passes seven new and 27 unchanged index/layout browser cases, the 35 relevant unit contracts, 111 root controls, web types, changed-file lint/format, public packages and architecture. The production build and actual-server result are recorded separately in the qualification receipt; do not infer native API behavior from the unconfigured local server.

Architecture retains 488 signals: 467 exact reviews, 21 inherited unreviewed and zero blocking/errors. The changed index composition function and stylesheet received the [bounded responsibility review](STRUCTURE-REVIEW.md). An initial attempt appended duplicate review records; the guard correctly refused them, then the existing records were replaced with current exact fingerprints and prior review records were archived. No threshold or assertion changed.

One initial broader browser run completed 22 cases but failed to write an existing screenshot when the workspace filled. All seven original/new integration cases had passed before that capacity failure. The corrected full 34-case run passes with zero retries; its failed predecessor is preserved. Dependencies were reused unchanged, not freshly installed. Only this owner's generated PR26 browser harness and Next output were archived after exact file/hash/mode verification to make room for the new build; every source, older branch and shipping input remains unchanged. Archive custody receipts retain their paths and hashes.

Both 337-row native ledgers are byte-identical to PR26. No native row is accepted by this bounded UI repair, and the ledger does not gate Neo's basic preview access. Remaining live-only work includes normal existing-account/tenant authentication, deployed saved-layout availability, authorized persistence/read-back across sessions, native version conflicts and catalog/membership changes. Full native/Figma/accessibility acceptance remains separate. No live backend request, provider send, paid workload, privilege/security change, resource creation, merge or deployment occurred.
