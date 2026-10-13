# Current-status test correction

The initial run's status-read failure was an unreachable test schedule under the newly integrated canonical read guard, not evidence that stale native A data overwrote B. The test was authored while status reads directly called the adapter; the current implementation publishes fetching through the canonical query. FunnelStepGuard now wraps its children in PendingFields disabled by session.isFetching.

The preserved trace shows the first Check current status entered a held session GET. The second click resolved the expected button but repeatedly found it disabled until the canonical30s timeout. The failure snapshot includes the disabled reconciliation button and all plan controls. Trace network contains only two native session requests: the initial read and the held A read. The attempted B request never dispatched. This agrees with current source; neither a timeout increase nor a forced click would represent the supported UI.

Root authorized a bounded test-only correction. The same case now asserts the held current read disables Check current status and Continue, admits no second request and no repeated write, then releases an unchanged same-session A snapshot. It verifies that this read leaves the earlier write explicitly unknown and Continue disabled. Only a subsequent deliberate status click reads B; all original B-initialization, final-route and one-write assertions remain.

The previous concurrent B-before-A completion schedule is intentionally no longer claimed as browser coverage. Native read supersession remains an independent pure-test seam in apps/web/tests/onboard-funnel-current-read.test.ts; no test execution or result is inferred here. The other browser case still exercises held A write completion after persisted session B replacement under unchanged Clerk authority.

## Exact scope and preservation

- Only apps/web/test/browser/onboard-host-funnel.spec.ts changed.
- Original SHA-256: a6e9bfd5237f783c3a3f5710b42164fcbc8db7d21d2b39e2132e5b243492a454.
- Corrected SHA-256: 2f8cb71e52b0194380b705ee0d920b6dd9e91ae0961f36581705c27045cf38f6.
- Failed trace SHA-256:7d7b3cf00ea1d0b96c3d008c6ff7321f1ad517750d903bf14e9463cd29b6ca28.
- The file's34 original assertion expressions are retained; nine assertions added,43 total. The held A response changes from plan_selected/paid to its unchanged verified/null snapshot, and its release moves before the second explicit status click. The title describes serialization rather than out-of-order completion.
- The first held-write case and both viewport cases are byte-identical. All three other owned Host files are byte-identical to the sealed authoring packet. No original17 passing cases or the375px failure assertion was weakened.
- Original source, initial.log, error context, screenshot, full trace, selected chronology and exact patch are preserved here. The original authoring packet remains unchanged.

## Verification and limits

Installed Prettier check and TypeScript parsing pass. The corrected file has193 nonblank lines with no architecture size signals. No browser/server/build/typecheck/install/native call or production edit was performed. Corrected browser result remains NOT_RUN until the root's planned replay after feature freeze. The independent375px overflow failure remains with its feature owner.
