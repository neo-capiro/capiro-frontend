# Cached signature review correction

Committed `57ad7722d72f9cd609df4908381e4b284b634081`, parent `c9647ce40adf401cdbe8fb499b915612a8ffad16`, tree `a7e55c48dd648c0a88cc81934fbbd4ddc5e82d0d`. This is the narrow follow-up to the independent P2 finding; the original Mail handoff/evidence remains unchanged.

## Behavior and ownership

`apps/web/src/features/portfolio/relationships/MailCompose.tsx` now requires a successful signature query with no error and no fetch in progress before displaying or snapshotting saved HTML. Composer and review use the same predicate. The review captures current/loading/unavailable display status, shows no cached signature after failed/pending refresh, and explains when the review opened before loading finished or cannot supply a preview. A known empty current signature has separate empty copy. The append choice and plain body request remain unchanged; review says the saved signature will be requested at send time instead of promising the preview will be appended.

No signature HTML enters `bodyHtml`; no new transport, contract, authority, version receipt, or provider operation was introduced. DOMPurify/sandbox rendering, signature GET, native saved-signature resolution, and local Undo remain in their existing owners. Native 243248e resolves the sender's saved signature at send time, so the browser preview remains an informative read rather than an immutable send receipt.

The only second changed file is `apps/web/tests/browser/mail-local-draft.spec.ts`. It adds three cached-success→stale-remount→403/503/held-read→Review controls. They assert no stale iframe, truthful review copy, no current composer iframe, exactly preserved plain body/append flag, and no rewrite/remote-content effects. No old test or assertion was removed. The remount uses the actual 30-second query stale lifetime; no production or synthetic harness API was added.

## Red and green evidence

- `before-source.json` binds unchanged c9647ce application bytes and the final regression spec. `before-results.json`, `before.log`, and `before-output/` preserve all three observed failures: expected 0 review signature iframe, received 1 after 403, 503, or held refresh. These are three controls for the same presentation defect, not three native authorization failures.
- `after-results.json` / `after.log`:65/65 affected browser tests pass with1 worker, 0 retries,system Chromium on owned 5191. This includes all 62 prior affected tests plus the same three new red controls; final spec SHA is byte-identical to the red run.
- `visual-results.json` / `visual.log`:1/1 supplemental 503 control passes. The external copied spec preserves assertions and adds only the screenshot capture plus absolute import resolution. `unavailable-review.png` was visually inspected on the final source; the review has clear status copy and no stale signature content.
- TypeScript, scoped ESLint, Prettier, and git diff checks pass. `architecture.json` has 0 dependency errors. The local branch retains two exact review signals: updated MailCompose and unchanged original useMailRewrite; root owns registry integration. An initial unsupported `--json` invocation returned usage 2 and was rerun with the documented no-argument command; the retained JSON is that completed scan.
- No build/full suite or additional unit rerun was performed for this UI-only correction. Original 64 unit results remain earlier evidence; they are not described as a new run. Root owns combined exact-source qualification.

## Exact structure review

`structure-review-proposal.json` records MailCompose at 361 nonblank function lines (file 396), fingerprint `024c124c331a351cede7aef7a9eac568dd49edcf28ebea0130511dab6f78d256`, SHA `7e31e5655e2d9a2340aa2c0bf041f9d4cf8ed13b5b6f0dfbc2dde60154437ae7`. Capturing preview state is part of the existing draft-to-review owner, with no unrelated domain or duplicated transport/authority. The test module is 480 nonblank lines, SHA `e0225fbaed91849f066ec68bc09110c80a966685935c98a3b7769a18fe868024`; its existing common synthetic fixture naturally owns the saved-signature lifecycle cases. Exact independent peer acceptance is being supplied separately by the Prospect reviewer; root alone updates registries.

## Resource release and limits

`browser-release.json` proves owned node PID 641118 under parent 641115 was stopped with SIGTERM, session 81156 exited 143, PID is absent, port 5191 returns connection-refused 111, and the borrowed frozen node_modules link was removed. The worktree is clean. A direct `/proc/PID/cwd` check was denied; ownership was instead verified through the recorded exec session, exact node command and parent command naming this evidence log before signalling only the owned node. No root or other agent server was signalled.

All network effects were intercepted synthetic fixtures. No native send, live provider/model/backend write, auth/durability deployment, new Figma parity, merge or deployment claim is made. This correction does not change the existing append preference's cached fallback; the presentation no longer represents retained HTML as a current successful read.
