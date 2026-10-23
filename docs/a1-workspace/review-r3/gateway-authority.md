# WS-03 descendant gateway verification

Test-only companion to the bounded backend #105 correction for comments,
checks, edit-lock and anonymization. Baseline is #117 `f7b42d81` (local
equivalent `c3603732`). No frontend production, gateway, shared-shell,
dependency, lockfile or test configuration changed.

The generic backend proxy reaches all 13 named descendant routes. The typed
Capiro gateway additionally exposes comment list/create/resolve. Workspace's
existing authority remains authoritative; no duplicate frontend ACL was added.

`apps/web/tests/workspace-descendant-gateway.test.ts` checks both actual gateway
functions. Sixteen ordinary tests pin method/path forwarding, trusted token use,
discarded browser identity/cookie headers, opaque 404 bodies and no-store caching.
Eighteen joined cases connect those same functions to a local Nest Workspace
server running the real controllers/services and draft authority. Ten denial
scenarios each traverse 13 generic routes and three typed operations. They
assert no descendant reads/effects. Owner/editor/viewer/held-owner/prospect-owner
positive controls remain available.

## Results

- Joined frontend **34/34**, zero failed or skipped, process exit 0.
- Explicit backend wrapper **1/1**, process exit 0. It requires zero skipped
  frontend cases and successful child exit; JSON success alone is insufficient.
- The direct Workspace matrix separately passes **267/267**.
- Canonical web TypeScript check: **exit 0**, zero diagnostics with a 4-GiB heap.
- Exact new-file ESLint: **exit 0**, zero errors/warnings.

The normal frontend run intentionally reports the 18 joined cases skipped when
no fixture server is supplied. Its 16 passing forwarding cases alone are not
claimed as end-to-end authority proof. The explicit backend runner is outside
the normal backend spec glob so a routine backend test does not require another
repository checkout. It accepts `WS03_FRONTEND_CHECKOUT` and starts/cleans up its
own loopback servers and child Vitest process. The joined receipt here has all
34 cases enabled.

The server uses a trusted synthetic TenantGuard context and a tenant/parent-aware
Prisma fixture. Actual authority helpers execute; no live JWT, database, Clerk,
provider, browser or production service is used. Native PostgreSQL negatives
and live/native qualification remain Fable-run and unexecuted here.

Dependencies were reused from the existing installation, with the preexisting
package-local Meri contracts dependency link restored. The initial default-heap
typecheck exhausted its heap; an intermediate typecheck with that package link
missing reported one unrelated Meri diagnostic. The final linked canonical
web typecheck passes without editing Meri source. The joined backend run uses
the disclosed cached Workspace `NODE_PATH` and unchanged Jest configuration;
earlier adapter-resolution/type-identity setup failures ran zero tests and are
not gate passes. No dependency was added and no diagnostic was suppressed.

Evidence is summarized in `gateway-authority.json`; the backend's
`docs/a1-workspace/review-r3/descendant-authority.*` contains its authority,
mutation, parity and native-gate receipt. No new production build, clean install,
full-unit rerun, browser qualification, SQL execution, ship request, merge or
deployment is claimed for this test-only addition. The #105 deployment hold
remains, along with the prior #117 qualification gaps.
