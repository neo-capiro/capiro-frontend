# PR17 qualification recipe and documentation review

**Frozen source manifest and DOC-01 repair accepted. Recipe requires the four bounded corrections in [FINDINGS.json](FINDINGS.json) before publication as a reliable qualification recipe.** These are documentation-script findings, not new application defects. This reviewer did not execute the recipe, start a browser/server/build, install dependencies or run qualification gates.

The exact inspected recipe has SHA256 `3173d0e313d64c92335eb98f0ccd378784b5eaf312873e3e4ac9b3fc68210e70`. It is producer-reported syntax checked only; no execution evidence is claimed. Subsequent edits need a refreshed recipe hash and review. The packet preserves the reviewed bytes and static verification separately from prior sealed evidence.

## Exact source and manifest

The live source HEAD is `d4be41e60516e576c74afa304b50ed67da15cb93`, root tree `401cadde371b91606e3346243aaca6b6225aafcb`, application tree `6ae2118b797f478f5a63788841a9777d67c8001e`, source tree `02ad682840eec3b2d8091b37de9b8c45a984e542`. The 9,199-entry, 1,461,207-byte tree text exactly matches independent `git ls-tree -r --full-tree` output at the frozen commit. Its SHA256 is `3543e51118452efafcf64b8c8c75e1067b7d3f520827bc39a728f4a4448ea360`. All seven critical input sizes/hashes match both frozen Git and current file bytes. [Verification receipt](VERIFICATION.json) contains the comparisons.

The new recipe/docs are uncommitted documentation at review time. Its clean-worktree and exact-HEAD preconditions intentionally reject running it directly in this current dirty evidence-producing checkout. Publish clear usage: retain the recipe outside a separate clean checkout of the exact source and invoke it from that checkout. Do not change its expected source to an evidence-only descendant merely to make it run.

## Required recipe corrections

1. **RECIPE-01 — browser evidence:** the environment probe and Portfolio/production use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; Modules uses two different override variables. Normalize them to one declared policy or record both actual launch policies. `browser.version()` is a real launched-version observation. The fallback `chromium.executablePath()` is the default full Chromium path; installed Playwright selects headless-shell for default headless launch, so it is not proof of the launched executable path. The bounded installed-code excerpts are preserved in [UPSTREAM-EXCERPTS.json](UPSTREAM-EXCERPTS.json).
2. **RECIPE-02 — attachment preservation:** the external Modules JSON path does not move its failure attachments. Pass the external artifacts path through the direct workspace command, leaving workers, timeouts and retries unchanged. The current config otherwise places its screenshots/traces inside the checkout.
3. **RECIPE-03 — result directory:** enforce the stated outside-checkout path contract before doing work, including canonical parent/symlink handling. The frozen Elements helper already enforces this later and would otherwise reject an inside-checkout result directory after earlier gates ran.
4. **RECIPE-04 — final source pin:** reassert exact commit/root/application tree before writing completion. A clean changed HEAD passes the current `git diff HEAD` check; merely recording it is insufficient for an exact-source completion claim.

## Compatible commands and error handling

Static package/lock inspection confirms the Playwright package is hoisted at the root at version `1.61.1`, so the root inline import is supported by this frozen lock. The Portfolio root script forwards CLI arguments; the Modules direct workspace script avoids ambiguous extra forwarding. Installed reporter code confirms `PLAYWRIGHT_JSON_OUTPUT_FILE` takes precedence over configured JSON output. The Elements helper and production runner accept their positional output arguments. Elements is intentionally Linux x64 and fetches only its pinned esbuild artifacts; this is part of the future recipe, not a reviewer network execution.

`TZ=UTC` and disabled Next telemetry are explicit. The gate function captures start/end timestamps, combined stdout/stderr and the command's actual exit status, then fails closed; it does not convert failed gates into passes or retry them. Previous external evidence directories cannot be reused. The recipe calls the canonical application build, not Docker or the CodeBuild buildspec. No recipe command creates AWS resources, builds/pushes an image or deploys. Browser installation with OS dependencies is an explicit future installation operation, not an image-publication action.

## DOC-01 resolved and causal limits retained

Both relative links in `reviews/profile-REVIEW.md` resolve to exact copies of the sealed original JSON files:

- `REVIEW-RECEIPT.json`: 3,860 bytes, SHA256 `77f93ae09ee590412e4b4647e37be12d7cecd376775fc0fca048bcf00e6b52e1`.
- `AWS-FAILURE-EVIDENCE.json`: 18,324 bytes, SHA256 `21f89c46e5af85b5f249602481c3fe35731d91b02080c01f75cedf23d13f06c7`.

The existing independent profile review itself remains unchanged. IMPLEMENTATION now correctly distinguishes AWS **installed** Chromium149.0.7827.55 from its **unrecorded actual launched browser**, and local recorded Chromium154.0.8037.57. It does not claim the browser difference caused the failures. For maximum precision, its Playwright comparison should say the AWS lock pins `1.61.1`, since the report did not capture a resolved AWS runtime-version receipt.

No new qualification disposition is supplied here. The first complete exact-source Portfolio run remains **FAILED: 1,121 passed / 1 failed**, with the ENOSPC screenshot/trace failure and unreached later assertions preserved in its separate review. The complete unchanged-source rerun and later Modules/build/server receipts are separate and still require final review. Syntax checking this recipe cannot replace those gates.
