# WS-03 classified descendant gateway verification

Test-only companion to backend #105's bounded follow-up to comment6331549181.
No frontend production, shared shell, package/lock/config or send-recovery change.
Prior frontend head `b6f0fd74`; backend prior head `308f7854`.

Extends the existing gateway fixture with document listing, quality-fix creation
and version list/create/restore. Tests independently check the route manifest,
trusted forwarding, opaque404/no-store, preserved version403, owner/editor/readable
roles, revoked/held/prospect controls and forged parents. The generic proxy reaches
the actual backend controllers/services through local HTTP; typed-comment coverage
from the earlier revision remains unchanged.

- Final enabled run: **57/57, zero skipped/failed, exit0**; backend wrapper1/1.
  This is21 standalone forwarding cases plus36 fixture-dependent cases. Without
  the loopback fixture, the normal run explicitly skips those36 cases.
- Canonical web typecheck: **exit0, zero diagnostics**. Scoped lint: **exit0**.
- Backend final restored targeted run:480/480; seven new mutants killed. Those
  backend receipts are separately recorded in its review-r4 evidence.
- Existing dependency installation reused. No clean install, full-unit/build,
  browser, live JWT/provider or native database qualification is claimed.

The real gateway/functions and backend controllers/services run; identity and
storage are synthetic. Nominated read/effect counters do not cover all authority
bytes: the existing config selection may contain content. This is not native SQL,
RLS, concurrency or no-SQL-effect proof. No claim of a collaborator-list HTTP leak;
its controller already checks canRead. Version correction concerns read ordering.

Proportional design review: this file exceeds400 nonblank lines because it extends
one gateway-to-fixture verification workflow. Existing request/config/fixture/
assertion helpers are reused. The only >80-line function is a describe registration
callback; executing callbacks remain small. There is no new production owner,
transport abstraction or duplicated browser authority. Exact source hash and
measurements are recorded in JSON; no shared architecture registry changed.

An initial fixture-array inference error was corrected with an explicit State
annotation, preserving values/assertions. Lint was rerun from its canonical web
working directory after a root-directory invocation found no config. These setup
attempts are not passes. Final results above follow the correction.

**Workspace deployment HOLD remains.** Native PostgreSQL negatives are Fable-run;
frozen clean closure/Prisma parity, native RLS/revocation/concurrency, exact-image
binding, reviewed numbered SQL/fresh clone and migration → combined backend →
frontend gates remain. Backend108 remains NOT DEPLOYABLE. No SQL, merge, deploy or
ship request. New heads require re-review; historical acceptance is not transferred.
