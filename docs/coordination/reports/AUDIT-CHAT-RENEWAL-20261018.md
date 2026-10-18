# Meri initial-draft recovery after session renewal

Base: frontend PR97 `a0a542d5eff162bef572564ff0397e460d74ed77`. The user confirmed overlapping lanes stopped and authorized the remaining expiry/reconnect repair. PR97's transient-failure conversation preservation and ordinary first-ACK draft clearing remain included and are not rewritten.

## Problem and implementation

An initial admission could commit while its reply was lost and the browser session expired. Reconnecting and retrying the exact request then recovered a successful answer, but the old prompt remained in the composer. Its consumption guard had belonged to `MeriLiveConversation`, which unmounts when the session expires, while the draft itself belonged to `useConversationSession`.

Keep both local responsibilities in the same conversation lifetime: `initial-draft.ts` owns the captured prompt, captured draft and edit marker; `useConversationSession` retains that owner through replacement sessions and records all composer edits, including edits made while disconnected. The live view consumes only a positively observed submit. The guard is cleared before notifying React, making repeated effects idempotent. Newer typing remains intact, including text edited away and back to the same original words.

The existing run journal still owns immutable request identity and retry bytes. Account, client or selected conversation replacement still replaces this local draft owner. This change supplies no browser authorization and changes no proxy, identity gate, source flag, package pin or lockfile.

## Evidence

- Before repair, an isolated temporary harness loading the exact PR97 live-component source failed the new expiry/reconnect test: expected an empty composer after the recovered answer, received `Original initial message`. The temporary harness did not replace tracked worktree files.
- The repaired source passed 12/12 browser cases across `meri-initial-reconnect.spec.ts`, `meri-initial-input.spec.ts` and `meri-stored-conversation-recovery.spec.ts`. They cover exact retry identity, no duplicate dispatch, newer disconnected drafts, edits back to the same words and refused foreign-actor renewal without a late dispatch.
- Focused unit checks passed 58/58. Independent review reran 34/34 of those cases and found no blocking issue.
- TypeScript passed with a 6 GiB Node heap. Default 2 GiB attempts exhausted the heap; they did not establish a source failure. Scoped lint passed with two existing dependency warnings; formatting, architecture and whitespace checks passed.
- The root production build passed and generated 283/283 pages.

The default Playwright browser download was a corrupt archive in this environment. An initial launch attempt against a zero-byte partial executable failed before application assertions. The successful run used an independently launch-checked Chromium 153 test executable extracted from the pinned `@sparticuz/chromium@153.0.0` package outside the project. No project dependency or browser configuration was changed for that environment workaround.

Browser responses were synthetic fixtures. This verifies application behavior, not live Clerk/Core/Meri availability. No main merge, deployment, provider request or database operation occurred.
