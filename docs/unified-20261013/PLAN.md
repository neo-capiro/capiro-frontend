# Unified application qualification — 13 October 2026

The dedicated `integration/capiro-unified-20261013` branch consolidates the published Newsletter, shipping, Onboard and Meri action source heads. Existing branches and immutable evidence remain. The worktree reuses the isolated Onboard execution directory at `/tmp/capiro-onboard-execution-20261013` (logical path `/workspace/capiro-onboard-port-20261013`) after its source was committed and published. Reusing this installed graph avoids another large duplicate graph; the final gate still starts with `npm ci --ignore-scripts`.

`INPUTS-AND-PRESERVATION.json` records the exact heads, ancestry, seven equal feature/test trees and807 byte-identical original test bindings. The original Portfolio head's later historical handover publication is already an ancestor; it is preserved without materializing its large archived context in the sparse execution worktree. Meri PR1 is not integrated separately.

## Shared integration decisions

- One `apps/web`, existing HeaderFrame/navigation, root `/` and compatible Portfolio routes, `/meri`, `/modules`, `/settings`, health/sign-in/calendar and narrow service routes remain. Onboard's existing canonical funnel/setup/public-IT paths and the new `/meri/actions` host join that application.
- Package dependencies/lock are the union: one active Capiro shared artifact, exact native Stripe versions, separate new public Meri action receiver and unchanged legacy event-stream peers. Every public artifact manifest remains checked. No existing lock version/integrity is replaced to resolve a merge.
- The browser harness mounts both actual hosts beneath the canonical ApplicationBoundary. Meri's explicit connection and same-client pause/resume rules coexist with Onboard's private/public capability scopes. The thin proxy matcher retains both allocations.
- Architecture rules retain the full union, including exact Onboard server-only pricing admission and Meri fixed-action route/public-export restrictions. Exact reviewed fingerprints are retained; inherited unreviewed findings stay visible.
- All feature implementations and original meaningful tests survive. Shared conflict resolution does not create a second application, transport authority or backend implementation.

## Final gate

Freeze one source commit before clean install. Record source/tree/app/lock bindings before and after every gate. Run canonical combined check, Elements, public renderer/receiving browser checks, all Portfolio browser cases, all Modules/shared/Onboard/Meri browser cases, one production build and actual standalone server/navigation/header/asset gates. Portfolio may run sequential shards because of constrained temporary storage; case selection, assertions,30-second default/four inherited90-second timeouts and zero retries remain unchanged. Aggregate each shard's complete JSON rather than infer success from prior branches.

Keep historical failures and passing evidence separate. A source correction restarts the necessary exact-source gates. Only reproducible download/compile caches may be retired with explicit receipts; source, original evidence, installed graphs and existing archives remain preserved. No container/image build or deployment is part of this gate.

Native current authority/provider/task/payment effects, full Figma and accessibility acceptance,337 Portfolio native row criteria, musl image qualification and designated-session AWS shipping remain open unless their own required evidence exists. Synthetic browser checks and glibc standalone execution do not close them.
