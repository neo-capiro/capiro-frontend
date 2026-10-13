# CR-07 and CR-11 bounded mail successor

Base: `fd1176790a6fb31b7ae68587f965a22d4145d8a2`. Worktree `/workspace/capiro-next-mail`, branch `repair/capiro-next-mail-20261012`. Frozen source and prior Calendar branches/evidence were preserved.

## Delivered behavior and ownership

- **CR-07 — saved signature display:** the composer shows the saved user's formatted signature even when automatic append is disabled, and the send review previews it only when selected. Loading, empty and failed reads remain distinct; retry is an explicit read. The review stores a preview snapshot. `appendSignature` remains the existing per-message boolean and the preview HTML never enters `bodyHtml`, preventing duplicate append.
- `email/SignaturePreview.tsx` owns presentation isolation. It reuses installed DOMPurify and the already adopted sandboxed-iframe approach, with a stricter policy for composer review: no scripts/forms/embedded frames/navigation, no automatic remote images or stylesheets. Safe inline raster images remain; remote images become text placeholders. Source HTML is never rewritten in the stored signature or outbound body. No Settings private module or new dependency is imported.
- **CR-11 — local Undo:** `email/useMailRewrite.ts` retains the body immediately preceding the most recent successful text-changing verified rewrite. Undo restores exactly that local body once, without network writes. Another successful rewrite replaces the snapshot; failed/unverified rewrites retain the current body and prior valid Undo. Undo is disabled while another rewrite awaits. Manual body edits, recipient/client/thread lifetime replacement, unmount and invalidated/changed actor authority dispose the snapshot. Restoring the old scope does not revive it. The existing authority guard is checked again before local restoration.
- `MailCompose.tsx` only composes these existing responsibilities; CSS adds bounded iframe sizing. Related synthetic harness/test changes exercise client replacement without changing application session infrastructure.

## Native and design truth

Read-only native references: pinned backend `243248e726243c44bd4b9d24fd1ed220da18c56a`, `users.controller.ts` GET/PUT me/email-signature, `common/sanitize-signature.ts`, and `engagement.service.ts` resolveSenderSignatureHtml/send append excerpts. Exact excerpts are retained in this evidence directory. GET returns `html:string|null` and `enabled:boolean` for the authenticated actor. The backend remains authoritative for signature sanitization and send-time append; there is no signature version/receipt contract tying the read preview to an immutable future append. This repair makes no such guarantee and introduces no endpoint.

The Figma design-to-code skill was read. Stored frame433:77331/435:82802 structure and the assessment's referenced433:77577/435:82656 support saved signature and Undo controls. The parent433:77331 screenshot shows the contact drawer, while435:82802 is clipped1x1. The implementation qualifies these two interaction/display facets and current desktop/mobile rendering; it does **not** claim complete pixel parity with the off-canvas composer. No static asset was introduced or substituted.

## Red evidence

`before-results.json` and `before-output/` bind the initial15 control run on the unchanged shipping base: **13 failures, 2 passes**. The failures demonstrate missing saved-signature preview, indistinct signature-read failure recovery and missing Undo; downstream lifetime scenarios stop at the missing Undo action, so this is not a claim of13 separate source defects. Both existing empty-signature controls passed.

The first candidate run had16/17 passes and one misplaced test assertion referencing an out-of-scope variable. It was corrected without relaxing behavior and retained as `intermediate-harness-results.json`; it is not a source defect.

A final adversarial image-map control caught a residual `area href` permitted by the generic HTML sanitizer profile. `map-link-before-results.json` and `map-link-before-output/` preserve that single red. All href attributes are now removed from preview markup in addition to the sandbox/CSP protections. Native stored signatures do not permit image maps; this specifically hardens malformed/untrusted read content.

## Verification and limits

- Existing focused unit suites: **64/64 passed** (`unit.log`): mail-rewrite, email-compose, mailbox-selection and thread-mail.
- Affected browser run: **62/62 passed** (`broad-after-results.json`, `after.log`):18 new local display/lifetime tests plus44 unchanged email-compose/mail-rewrite/thread-mail controls, one Chromium worker, zero retries. This run precedes the final href hardening; the directly affected local suite is replayed separately afterward.
- Final local browser, typecheck, lint, formatting, source binding and cleanup results are recorded below after completion.
- Architecture scan has zero dependency errors. Two existing owner functions require renewed exact-source review; `structure-review-proposal.json` contains fingerprints, source hashes and cohesive-responsibility rationale. Root owns independent acceptance and the registry.

All backend/provider/model interactions in browser controls are intercepted synthetic requests. No native/provider sends, paid model call, AWS, build, full browser gate, merge or deployment was run. Root owns integrated qualification. Sending capability and native authentication/provider durability are not newly accepted by these local facets.

## Replay

From worktree root with its unchanged fixture server on5191 and a borrowed dependency link:

```
node node_modules/@playwright/test/cli.js test --config=/tmp/capiro-next-mail-evidence/browser.config.ts
```

From `apps/web`:

```
node ../../node_modules/vitest/vitest.mjs run tests/mail-rewrite.test.ts tests/email-compose.test.ts tests/mailbox-selection.test.ts tests/thread-mail.test.ts
```

External browser config has `webServer:undefined`, one worker, zero retries and `/usr/bin/chromium`. No shared config or fixture server source was edited.

## Final result and cleanup

Commit **`c9647ce40adf401cdbe8fb499b915612a8ffad16`** contains four production files and two focused test/harness files. `SOURCE-AND-RESULTS.json` binds exact source hashes and tree.

Final directly affected local browser suite: **18/18 passed** after href hardening (`browser-results.json`, `final-local.log`). An additional **1/1 supplemental visual control** captured the scrolled desktop and mobile preview on the committed application (`desktop-preview-results.json`, `desktop-preview-output/`). Source assertions were not weakened. Final TypeScript, ESLint, Prettier and git diff whitespace checks passed.

The two production function responsibility reviews and one404-nonblank-line focused test-module review are proposed in `structure-review-proposal.json`; independent acceptance and registry writes remain root-owned. No remaining implementation blocker was found within CR-07/CR-11. Native send/auth/model behavior and immutable-signature verification remain unqualified by synthetic tests; no pixel-level Figma parity is claimed.

Owned server PID617610 was explicitly terminated. `ss` showed no5191 listener and TCP connect returned111/connection refused before releasing the slot. Borrowed node_modules symlink removed. Frozen worktrees, other servers, shared files and historical evidence were not modified.
