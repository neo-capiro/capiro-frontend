# Independent control receipt and archive review

**Pass for the reviewed offline scope. No remaining source defect found in this change.** The application source and frozen ZIP remain unchanged. This is not application release acceptance or authorization for cloud execution.

The current runner passed 29/29 independent probes; all three targeted controls fail against the previous runner. An independent replay of the author suite passed 39/39 tests. These cover the exact 13-field schema, placement after qualification/smoke/size validation and before authentication/push, separate stdout/stderr accounting under one cap, exact-cap/+1 refusal, atomic complete-receipt capacity, combined secret-capture bounds, invalid identities and every preceding gate failure. All AWS/Docker command invocations in probes were mocked; no cloud or Docker action ran.

The receipt includes its own prefixed JSON line and newline in stdoutBytes. It is at most 4096 bytes and must fit the shared remaining budget before any receipt bytes are emitted. Login/push output continues counting afterward. Platform/bootstrap/daemon output and the bounded failure footer remain outside these counters. The receipt is a local pre-push observation, not evidence of completed push, remote termination or a cloud cost ceiling.

The reported Windows digest is exactly reproduced by changing all 4939 Git members’ local and central DOS timestamps from UTC 11:48:20 to 07:48:20 and the appended marker creator system from 3 to 0. No payload, compression, CRC or size change is needed. The reviewed producer pins Git to process-local UTC0 and marker.create_system to 3, refuses existing outputs and requires the original exact hash/length. I independently rehashed the original ZIP and the full reproduction launched by the parent under America/New_York: both are 451977924 bytes with SHA-256 `252ccdf0d91d94a6b53e4a9d905534f2b4e325ef231481774154daa96bfacbf5`. Actual Windows reproduction and Library custody remain unconfirmed.

Reviewed hashes:

- runner.py: `f908e7bf7f7901f5215f902fdc87cdecdd95ba447536722aee4df1cd06bb1a0c`
- reproduce-source.py: `7e56d86db8ce7445b2e9e7e5a08ee543e91c18cdd078b463cd98755fbb82c18f`
- prepare.py: `7ba0358e89473bac1bdb2058f88e7669292fb6a0669573c7fe78dffa0bee6242`
- supervise.py: `1690197ae8790d6ae239736da74cd9945b91447d0d8d0a7abe987d23b2a9dd0a`
- Generated inline buildspec: `c20e6c14bb2308d95b02f3906aece7318bff1ffe3779b29f035db60c79c0269f` (14767 bytes).

CONTROL-GATE.md and ARCHIVE-FORMAT.md accurately describe this scope; their exact hashes and copied candidates are in independent-review.json and reviewed-candidate/. The unchanged supervisor retains the previous explicit design review. New runner functions are below the 80-nonblank-line threshold. Actual accepted byte limits, verified S3 version/custody, live external-watchdog consumption and cloud behavior remain outside this review. Application release blockers remain separately owned.

Raw evidence: protocol-review.py; protocol-review-results.json; author-suite-independent-replay.log; archive-independent-rehash.json; author-nonutc-reproduction.json; timezone-platform-variant-search.json; timezone-producer-control.json; frozen-format-spec.json; zip-platform-fields.json; frozen-one-byte-platform-variant.json; archive-review.md (includes primary producer references); application-source-diff.txt; reviewed-candidate/; buildspec.override.json. All paths are under /tmp/capiro-build-control-review.
