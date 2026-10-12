# Newsletter public-package consumer

PR16 slice2 consumes the governed backend package and qualifies its actual public exports. The rich editor and record-routing port remain unfinished. PR15 source `1585438295776604f23a5cb5ab592729f7c468ca` and evidence head `3a83e874383d9129726689bb8fc66438c2f18f18` stay frozen and retain their separate shipping handoff.

## Immutable input and ownership

The producing source is `neo-capiro/capirov2@fe50dc1c2de1660a036e338cf81acdcf0f2fb26a`. The artifact is published at [distribution commit 62d057b4](https://github.com/neo-capiro/capirov2/blob/62d057b4a17b2c038920f10b93e83e51e46239bc/docs/shared-newsletter-packed-distribution-20261012/artifact/capiro-shared-0.0.0.tgz).

| Binding | Value |
| --- | --- |
| Package | Private `@capiro/shared@0.0.0`, CommonJS ES2022 plus declarations |
| Exact bytes | 510,772; 182 regular entries |
| SHA256 | `697d826647e88e7f8559da386be7de1ae6408dc61c73877b86c2e17275fd63ab` |
| SHA512 integrity | `sha512-CK2DLxUPCTs+PkBwx8GOjRLfh6jssTddIX2zgxiFw2hjVcHLF65oA8vJJ+LIR00r9XBnxFdYYoD2ZAkgY698Sw==` |
| Distribution Git blob | `04ea25adba740eca8f677c0259e45211b73c5f2e` |
| Browser exports | `@capiro/shared/newsletter`, `@capiro/shared/newsletter-render` |

The two public entries close over `newsletter`, `newsletter-render`, `newsletter-fonts`, `newsletter-fonts.catalog` and `newsletter-social-share`. The package has no runtime dependencies. Its other existing exports remain prohibited by the frontend architecture allowlist. No backend checkout, editable renderer/DTO copy, private import or new package version is introduced.

`vendor` owns immutable input/provenance. The existing package checker applies the same byte-binding validation to both explicitly named Meri/newsletter manifests. `packages/qualification-newsletter` owns test consumption, declarations and actual browser evaluation. The root manifest discovers the workspace/typecheck and adds its tests to `check`; the root lock adds exactly three entries while preserving all930 prior entries. The source allowlist adds exactly two reviewed subpaths. All original guard/package assertions survive; a failing baseline demonstrates that the new public exports were previously refused.

The application source is unchanged. The qualification package is not an application import target. All179 original assets, totaling486,014 bytes, retain their C/W bindings. Rich `NewsletterStage`/`WsNewsletterStage` UUIDs remain separate from `WsDocVersion` snapshot/CAS/receipt identities. This slice supplies no bridge, conversion, routing change or native operation.

## Preserved fixtures and design review

Four files are exact copies from the producer's published consumer evidence: `renderer-characterizations.cjs`, `original-C-renderer-golden.json`, `consumer-positive.ts` and `consumer-negative.ts`. The golden contains116 original-C records, SHA256 `b56b5d3526230e9011aaa82f258c7327816a60a78ddc020714c81e9c7d98b32f`. It is never regenerated from the candidate. The producer's historical runner is reference evidence only because it contains backend paths and golden generation.

The corpus keeps API inventories, URL safety, escaping, merge text, fonts/assets, visibility, all16 blocks, sanitizer policy, survey callbacks, social targets, document HTML/plain text and original templates together. Its `characterize` function is an immutable provenance fixture with95 nonblank lines and fingerprint `91a2a65b65a0314b42debf1e647c84f759e5f3c95314af549d188de82ccb3f94`. Retaining the complete upstream function preserves its ordering and exact-byte audit; it does not authorize a production size exemption. Authored consumer/CLI functions have no size findings. Browser bundling, browser execution, declaration compilation and corpus assertions retain separate cohesive owners.

The synchronous synthetic clock and randomness match the original fixture environment: `2026-10-12T12:00:00.000Z` and `0.125`, restored in `finally`. These controls establish no application ID or authority guarantee. Installed JavaScript and declarations are checked against all10 producer entry hashes.

## Qualification scope

Development runs passed120 Node tests,116 cases in actual Chromium, four declaration checks, the workspace typecheck, public-package checks, all33 architecture/package unit cases and two CLI smoke cases. The current application architecture scan reports427 size signals:403 reviewed,24 inherited/unreviewed and0 blocking, with0 boundary errors. The [final exact-source receipts](PACKED-QUALIFICATION.md) are published with the evidence commit.

The initial Node harness run passed118 and failed2 inventory cases because Node's CommonJS-to-ESM namespace includes interop markers. The corrected harness passes the actual CommonJS objects to the unchanged original CommonJS corpus, then independently asserts every named ESM export, exact namespace keys and alias identity. Both original failures remain in the evidence. No golden/corpus expectation was weakened. Declaration negatives require exactly two TS2345 and one TS2322 diagnostic in each module mode; resolution errors cannot count as success.

The browser uses Vite8.3.4 and Playwright1.61.1 with system Chromium154.0.8037.57. Its recorded graph has only the five packed modules and three test inputs, no external imports. The actual page returns116 exact golden results with0 page requests and0 page errors; page requests are refused. This is pure renderer execution, not an editor screenshot or visual/accessibility acceptance.

The candidate package was installed separately using offline npm with lifecycle scripts, audit, funding and update notification disabled. One package was installed. TypeScript5.9.3, Vite and Playwright were borrowed read-only from the existing PR15 dependency installation; the symlinks are local setup only and are excluded from Git. Root lock generation also ran offline without lifecycle scripts. An initial npm test wrapper printed an update notification, so this evidence makes no blanket zero-network claim for every process. No real provider or native request was run.

Full PR16 clean root install, combined application qualification, production build/server, full browser suites, Figma, accessibility and native authentication/persistence are **NOT_RUN for this source**. PR15 qualification is not transferred to PR16. The producer's291 backend tests are historical backend evidence, not tests executed by the frontend owner. No merge, deployment, AWS action or change to credentials/security/database state occurred.

## Remaining implementation

Modules Workspace still needs the rich document/revision editor, assets and review flow. Modules Engagement still needs rich-stage/legacy-record destination dispatch; the current validator strips `metadata.newsletterStageId`, so this distinction must be preserved before connecting dispatch. The exact saved-version OutreachV3 flow and its acknowledgement/replay controls remain unchanged. Original test histories remain mapped requirements.

The distribution prerequisite is closed. Rich UI, original behavior parity, native authorization/durability, backend parser/full Workspace typing, deployed asset origin, desktop/mobile design and accessibility acceptance remain open. Review/account-status GETs may have effects and were not probed. Future isolated UI tests must refuse or intercept collaborators. All337 Portfolio native rows remain held.
