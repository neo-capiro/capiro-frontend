# Independent Docker context correction review

**The .dockerignore correction is accepted. Changes are requested in the new regression CLI before its final source/evidence binding.** No Docker, browser, typecheck, test, installation or build was run by this reviewer; all runtime evidence below was produced by root and independently inspected read-only.

Reviewed source snapshot: scripts/docker-context-regression.mjs SHA256 `a5fe51f0563bf764ebc36ebade4cc317166796dda94b133ee89d0d712a28de8c`; .dockerignore SHA256 `0e4ca55ceb868d95b904348b39f3bd86ac55bf26d73cc922ccaea25af9e0b53a`. The four exact input snapshots and hashes are preserved in initial-source.json. Root HEAD at review was 3c64057d3a436a728cd35f05b805ce6e7e7e8577 with these changes uncommitted; this is not a new frozen source pin.

## Accepted behavior and evidence

The one-line `**/work` → `work` change narrows the artifact exclusion to the root work directory and restores tracked nested Work application files. Actual Docker/BuildKit `FROM scratch; COPY . /context/` handles ignore matching; the script does not reimplement Docker's matcher. It copies the tracked Work files and synthetic canaries into an isolated fixture, then verifies the real exported bytes and exclusions.

- `context-baseline` failed before exporting because Docker's default config directory was read-only. It is setup failure only; the initial report's missing-output booleans are not functional-red evidence.
- `context-baseline-writable-config` exported successfully (Docker exit0) and failed exactly the 12 required Work inclusions. All 21 canary expectations passed. This is the valid functional red.
- `context-corrected` exported successfully and passed all33 checks: 12 Work files plus21 canaries. Root work, root/nested node_modules, root/nested .next, root/nested .env secrets, outputs/evidence/docs, test/browser reports, .git, nested .qa and tsbuildinfo are excluded; root/nested .env.example remain included.

Independent inspection of all retained export files agrees with all99 recorded presence/hash results across those three attempts. All12 corrected Work payload hashes also match tracked HEAD blobs, including the route and public entry. d5dd0be contains11 matching Work files; PR14/7aca86e,104495d and current HEAD contain12. The regression discovers tracked Work members rather than fixing the expectation to an obsolete count.

The production Dockerfile builds from repository root with `COPY . .`, so the corrected rule directly addresses the observed missing-source defect. This small scratch export is not a full application/container build or production smoke qualification; those remain root-owned gates.

## Requested corrections

1. **Output containment checks are lexical.** At reviewed script lines51–55, resolve/startsWith checks the spelling of NEW_DIRECTORY but not symlinked ancestors. A path such as `/tmp/repo-alias/new-evidence`, where repo-alias points at the checkout, passes the existing outside-checkout check and creates fixture data inside source. Resolve an existing parent/ancestor canonically before allocating, reject a resolved checkout destination, and add a harmless symlink-path refusal control. This is source-demonstrated; no such directory was created by this review.

2. **Option lookup admits inherited keys.** At reviewed script lines87–90, indexing a normal object with arbitrary argv also resolves `toString`, `constructor` or `__proto__`. For example, `--artifacts NEW_DIRECTORY toString unused` can proceed instead of returning invalid-argument exit2. Use an own-key check, Map or explicit comparisons and preserve a no-allocation negative control. This was inspected in source, not executed.

3. **Bind the final helper to fresh evidence.** The valid red/green receipts identify helper SHA256 `f32e831974295df8a7c51b750880c145e8aa265a7e8366cbacdc09b10905a22b`; the reviewed current helper is `a5fe51f...`. Preserve existing attempts and run the bounded real-context/CLI controls against the final corrected bytes, or otherwise provide an exact supported delta binding. The .dockerignore hash in the green receipt already matches the reviewed correction.

These requests concern the new local verification utility's path/argument promises and evidence precision; they do not invalidate the real Docker observation or require reverting the exclusion fix. No changes were made to any source, frozen branch or prior evidence by this reviewer.

## Responsibilities and remaining limits

The helper has one cohesive responsibility: construct a bounded source/exclusion fixture, delegate context semantics to Docker, inspect its exported bytes, and preserve its receipt/logs. Functions remain below the80-line review threshold; no generic glob engine, deployment or application runtime was introduced. Built-in imports, constants and path calculation have no allocation/process side effects; child processes and fixture writes occur only after explicit invocation. The main-module guard makes imports safe. CLI help/invalid/reused-output controls are discovered by the existing root deployment-cli suite; root's preserved initial suite passed3/3, but did not cover the two gaps above.

The120-second child-process timeout and4MiB log buffers bound the local command; they are not a guarantee that a remote Docker daemon has terminated all work. Here the fixture uses scratch COPY only, without RUN, base-image pull, provider execution or publication. Full container build/smoke, final frozen source, and any shipping action remain separate. No native acceptance is implied.
