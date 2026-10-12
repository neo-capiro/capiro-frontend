# Independent CP-03 review — 7ad0590

Reviewed exact commit `7ad059006c3f8286e7e578ead10eade14ff31da9` in `/workspace/capiro-next-delete`, based on `fd1176790a6fb31b7ae68587f965a22d4145d8a2`. All seven changed files were inspected, together with the existing file reader/scope/query owners, shared API transport/client-writer guards, native pinned DELETE/list excerpts, and supplied evidence. No source edits, browser/server/build, native/provider calls, or new test execution were performed. Supplied unit logs report 36 passing tests; browser qualification is separate.

## Finding requiring correction

**P2 — A failed deliberate current-files review leaves the canonical collection falsely current.** `apps/web/src/features/portfolio/files/deletion.ts:127` calls `filesOptions.queryFn` directly. If that current GET fails (including 403 or 503), nothing transitions the canonical current-files query to error/unavailable. `useFileDeletion.ts:57` records only the local dialog error. The existing failure unit case at `apps/web/tests/files-delete-recovery.test.ts:160` explicitly expects the earlier collection data to remain cached; its success/idle authority state is also unchanged.

Reproduction from the source: start with a successful two-file collection; DELETE file A returns an uncertain result; click Review current files and return 403; close the error dialog. FilesPage still evaluates its canonical collection as available (`FilesPage.ts:53`), and `currentFilesAvailable` still returns true. The fence correctly blocks file A, but file B has no attempt and can still pass deletion's current-list prerequisite. Prior collection content and unrelated file actions remain presented after a newer denied read. This is a confirmed frontend current-read authority gap; no actual native authorization bypass, object deletion, or privacy exposure was demonstrated.

Required bounded correction: a failed deliberate review must make that reader-scoped current collection unavailable while preserving the unknown attempt. Recovery must require a successful current read before actions return. Guard against an older failed review poisoning a newer successful list/reader generation. Add success → uncertain A DELETE → current GET 403/503 controls with an unrelated file B, asserting no usable old collection/actions, no second DELETE, and successful current-read recovery. The author and root were notified; the author confirmed the source gap and is preparing a follow-up.

## Accepted behavior within this candidate

- Attempt keys bind tenant, actor, client, and attachment; monotonic tokens prevent an older completion from clearing a newer attempt. Reader revision and operation lifetime remain canonical in file-reader/useFileScope.
- DELETE captures a current writer/read lifetime, requires a current matching collection row, blocks `delete_pending`, and synchronously installs a pending fence before dispatch. The hook also suppresses overlapping clicks. Native success requires `{ok:true}`; malformed success, transport/service failure, or lost authority after dispatch remains unknown.
- Definite native 400/401/403/404/409/422 refusals do not impose an unknown fence; backend access checks remain authoritative. No automatic repeat or retry loop was added.
- Deliberate review invokes an actual GET and never counts cached/background success as user reconciliation. Successful readback checks the reader lifetime, collection update count, and exact attempt token before publishing or clearing a fence.
- Pending readback stays fenced. Absence is explicitly unavailable/absent from visible state, not a deletion receipt. A present non-pending row permits a separate renewed confirmation; review itself performs no DELETE.
- FilesPage's reader-scoped dialog key and existing scope guard prevent late DELETE/review receipts from closing or populating a replacement actor/client view. Tests cover same-cache actor replacement, client abort/unmount, cache clear, and superseded successful list data. Browser behavior still requires the separate root qualification.

## Limits

The fence is intentionally cache-local, not durable or cross-tab idempotency. Hard reload/cache disposal (including shared ApplicationBoundary client/session replacement) discards it; the code does not claim server-side deduplication. A later freshly loaded view still relies on native lifecycle/ACL state and a new user confirmation. Native list visibility and absence cannot establish object or index erasure. The pinned native DELETE attempts recoverable object deletion and returns `{ok:true}`; provider effects and durability were not exercised.

## Exact structure review

Accept the cohesive responsibility of `FilesPage` at this exact source, independently of the functional correction above: function starts at line 17, **245 nonblank function lines**, fingerprint `6b1e2d5c668d17e152ce5d4dedb60bb2ed7827e2fbd68033559a0dff55bf8726`; file SHA-256 `f653edde31a3d6f020f46dc80a9015354d4fff72195c658e325f3d39b8019422`.

FilesPage retains one client collection's filtering, selection, folder/table presentation, and dialog composition. This repair removes DELETE transport/state ownership from the page and delegates it to the narrow deletion transaction owner, hook, and dialog. Those modules reuse the existing reader/scope/query owners; they do not create a second authorization layer or general workflow framework. The long body is cohesive screen composition, and arbitrary JSX fragmentation would not improve the boundary. No changed first-party file exceeds 400 nonblank lines, and the new deletion owners stay below the function threshold. Root owns the exact registry entry; any follow-up source change requires refreshed source evidence as applicable.

Disposition: **functional acceptance withheld for the failed-current-read finding; structure responsibility accepted for the exact FilesPage fingerprint.**


## Exact-pin correction re-review — 313f9fc

Re-reviewed corrective commit **`313f9fcf6cc80cbe43bf5aa79f2f31604e70207a`**, parent `7ad059006c3f8286e7e578ead10eade14ff31da9`; `apps/web` tree `dee5a298ea16d4ad2d699b6e05c333925ccd279c`. The original finding above is preserved as the historical review of 7ad0590. All three corrective files were inspected; no source edits, browser/server/build, native/provider calls, or independent test execution were performed by this reviewer.

**The original P2 failed-current-read finding is corrected at this pin.** `reviewFileDeletion` now follows the established `files/navigation.ts` current-read pattern: cancel the exact canonical query, recheck the captured lifetime, record its update count, install abort cancellation, and call `cache.fetchQuery({...filesOptions, staleTime:0})`. TanStack owns fetching, error, and successful state transitions; there is no hand-maintained Query.setState reducer or parallel read cache. A failed deliberate GET therefore makes the canonical collection unavailable, allowing the existing FilesPage/error and scope lifetimes to remove stale rows/actions and close the former dialog.

Before releasing uncertainty, successful readback still requires the current reader/execution, exactly one current collection update, and the original unknown attempt token. Pending or absent records retain the fence. Cancelling/replacing a read produces a retryable changed-state message, does not release the fence, and cannot commit the cancelled receipt over the newer canonical read. Abort listeners are removed in finally. The native DELETE path, strict `{ok:true}` acknowledgement, actor/tenant/client/attachment attempt keys, and cache-local scope remain unchanged.

Meaningful evidence reviewed:

- `/tmp/capiro-next-delete-evidence/authority-red.log`: the two new 403/503 current-review cases fail on the original path because `currentFilesAvailable` incorrectly remains true.
- `/tmp/capiro-next-delete-evidence/canonical-unit-green.log`: 39 focused tests pass. The new controls assert canonical error/unavailable state, prevent a different file B from dispatching after file A's failed deliberate review, preserve A's unknown fence through successful collection recovery, and require its explicit later review. Superseded successful and denied reads cannot replace or poison a newer canonical collection.
- The amended browser specification covers whole-view concealment, unrelated-file actions, recovery with the unknown fence intact, and old-read success/refusal replacement. At the time of this appended review the owner's final browser red/green/preservation qualification is underway; these browser results are not independently claimed here.

No new source defect was found in the bounded correction. **Source-level acceptance is granted for the original P2 correction at 313f9fc**, with root/owner browser and integrated qualification remaining separate gates. Native authorization, object/index erasure and durable/cross-tab idempotency limits from the original review still apply.

The exact FilesPage structure acceptance remains valid: source SHA-256 `f653edde31a3d6f020f46dc80a9015354d4fff72195c658e325f3d39b8019422`, 245 nonblank function lines, fingerprint `6b1e2d5c668d17e152ce5d4dedb60bb2ed7827e2fbd68033559a0dff55bf8726`; its bytes did not change in the correction. The deletion readback remains a cohesive operation with canonical query/lifetime ownership rather than a second state reducer.

Corrective source SHA-256 values:

- `apps/web/src/features/portfolio/files/deletion.ts`: `0e088571adc895994770155e8b329307fd8d2a2eefad8a4d108020425258bfdc`
- `apps/web/tests/browser/files-delete-recovery.spec.ts`: `ed33e04346bf1433d0cf647afd97d3c2489cbed691fd336191ae5929f26da9a5`
- `apps/web/tests/files-delete-recovery.test.ts`: `ae4306a4980b578fb87aaf6ae130a53ecd19c31cff0796bab4be6768c02afac0`


## Fresh correction review — 274a7d (silent-refetch admission)

Reviewed **`274a7d876d36a964aedf8081dc83225078fe092c`**, parent `313f9fcf6cc80cbe43bf5aa79f2f31604e70207a`, `apps/web` tree `d67f99d2fadb4cb1735dea9910c0c096b5eb0395`. This is a fresh review of all three corrective files plus the installed TanStack implementation and new evidence; acceptance was not carried automatically from the earlier pin. Earlier reports remain above as the history of the two narrower reviews. No browser/build/server/native/provider execution or source edits were performed by this reviewer.

The owner's later browser qualification exposed an additional recovery defect at 313f9fc: a silently cancelled TanStack fetch can adopt a replacement refetch promise. A `before + 1` successful update count alone could therefore release the unknown fence using a background read. The installed `@tanstack/query-core/src/query.ts` confirms both behaviors: silent cancellation returns the replacement retryer's promise, and cancellation aborts the original queryFn AbortController. The previous source-level acceptance is superseded by this exact-pin review for the complete recovery behavior.

The new admission check captures the **first actual queryFn request signal** using `originalRead ??= request.signal`; a replacement invocation cannot overwrite that evidence. Before settling an unknown attempt, the code now requires that original signal to exist and remain un-aborted, in addition to the existing current reader/execution, exact collection-update count, and attempt-token checks. Consequently an adopted replacement success cannot stand in for the user's original deliberate read. TanStack still exclusively owns canonical fetching/error/data transitions; no custom Query.setState reducer or parallel cache was introduced. The abort listener is still removed in finally, and the operation adds no automatic DELETE or replay.

Evidence independently inspected (executed by the owner, not replayed by this reviewer):

- `silent-supersession-red.log`: both true silent `refetchQueries` controls (obsolete response 200 and 403) fail before the signal guard because review resolves against the replacement collection instead of rejecting. This exercises the actual silent-cancellation path, unlike explicit cancel-then-fetch alone.
- `dispatch-unit-green.log`: all 39 focused unit controls pass with the guard, preserving the unknown fence and newer canonical collection in both cases.
- `browser-final.log`: the earlier candidate has two substantive stale-200/stale-403 failures, plus two modal-background locator failures that were corrected by closing/reopening the dialog while retaining fence assertions.
- `browser-dispatch-green.log` / `browser-dispatch-green.json`: the exact 274a7d candidate passes **12/12** browser controls, including the unchanged stale-200 and stale-403 assertions, failed-current-read 403/503 authority revocation/recovery, pending/absent truth, and scope replacement. The owner also retains the exact eventual-spec frozen-base red at `browser-red-dispatch.log` and related artifacts. Additional preservation/root integration runs remain their separate responsibility.

**Disposition: no remaining source defect found in the bounded CP-03 candidate at 274a7d; accept both current-read-authority and silent-refetch-admission corrections at this exact pin, subject to root's combined qualification.** This does not qualify native ACL/RLS, object/index erasure, durable/cross-tab idempotency, or deployment. The cache-local fence limitations in the original review remain accurate.

FilesPage remains byte-identical, so its exact 245-line cohesive-screen structure review and fingerprint remain valid. No new oversized function/file responsibility was introduced by the signal guard.

Exact corrective SHA-256 values:

- `apps/web/src/features/portfolio/files/deletion.ts`: `51402c45adc651e34f5d3d38f566dc7f054efc73f5fee4b6c7dca3661c93f0d3`
- `apps/web/tests/browser/files-delete-recovery.spec.ts`: `31bd8876d7edb4ed73a4412a629b2b6a63197a54fae43552f17865e5aec3f7a4`
- `apps/web/tests/files-delete-recovery.test.ts`: `a21cf371f77ba974560fc875223ce246e73e14b1065ce4b51bad15b588594004`
