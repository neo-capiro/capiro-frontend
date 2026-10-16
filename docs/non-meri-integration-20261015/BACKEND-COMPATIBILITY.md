# Existing-backend compatibility

The three-input integration changes presentation, local interaction and receipt confirmation. It adds no service route, wire field, enum, migration, feature flag or backend image dependency. The complete fixed-operation tree, HTTP gateways, session/auth infrastructure, package manifests/root lock, Next config and Dockerfile are exact frozen4e objects. Their source object IDs are independently recorded below; actual deployed compatibility is a separate observation. One separate QA-only commit adds an explicit Modules URL readiness wait to the existing standalone history probe; it changes no application or service behavior.

| Changed surface | Existing request and receiving requirement |
| --- | --- |
| Profile archive/restore | `settings.profiles.archive`, `params.clientId`; `settings.profiles.restore`, same ID and `body.status=active`. Existing client receipt must match target ID and expected resulting status. |
| OAuth reconnect | `settings.integrations.startMicrosoft/startGoogle`, existing optional `body.connectionId`. Existing authUrl/connectionId must match a reconnect target before navigation. |
| Sync/disconnect | Existing provider-specific sync/disconnect operations and `params.connectionId`; matching account identity, existing statistics or affirmative disconnect receipt. IMAP remains unavailable. |
| Planner comments | `planner.task.comment`, existing task ID plus `{kind:comment,text}`. No HTML or new format/version field is persisted. Preview/formatting is local; saved comments remain literal by default. |
| Team | Existing `engagement.tasks` with optional client ID and `settings.tenantMembers`. Closed tasks are excluded before owner grouping; only member names reread on name retry. No assignment/plan mutation. |
| Meetings/Prep | Existing `engagement.meetings`, `engagement.library`, `engagement.meeting` and optional prep arrays. The frontend preserves requested-meeting/client receipt checks and supplied safe Join validation; authorization remains authoritative at the backend. |

Exact Git tree identities, unchanged from4e:

- `apps/web/src/shared/capiro`: `b57edac006b419e848c2272e1e249a02037bbcd3`.
- `apps/web/src/app/api`: `1895c29c4285bf7c6202697e8d3b5840d1c1d757`.
- `apps/web/src/shared/portfolio/api`: `604a5cf893ec7db7a8f243bc715f0f3d88dac85d`.
- The original three-input application checkpoint retained production-probe tree `673bde48ae9aa6ea769999b500ef455907e9680a`. The later one-line QA correction at `c90b9cd60ce140db2ffa4ec3f7fd4cdac30578d0` changes that test tree to `f7950b605cf27fb7b9953799567ecf7d7aea89e0`; no probe assertion or limit is removed or relaxed.

This frontend release can remain independent of the new Objective operational, Engagement plan/wave/office and Meri work. It does not consume those proposals. It can reuse the current preview backend if that deployment satisfies these existing frozen4e contracts. This source proof does not assert an unobserved deployed backend revision or authenticated response shape. A wrong-target/absent receipt is refused rather than relabelled success; do not relax those guards to accommodate an incompatible deployment.

Before rollout, Shipping should bind its retained current backend image/service identity and approved existing-contract evidence. Reuse existing authenticated observations where exact source/config remains applicable; do not send real archive/restore/OAuth/sync/disconnect/comment/meeting mutations as a smoke test. Anonymous health, setup screens and fixture intercepts cannot establish authenticated API compatibility. Any actual contract gap is specific to the old operation, rather than a reason to wait for unrelated new feature APIs.

Fable's separately audited `c7e060007f5cd5a9b786442d0cc168a73c5565a8` is not included. A later integration must preserve PR53 `ProfileSettings.tsx`/`IntegrationSettings.tsx` guards and reconcile all `SettingsScreen.tsx` callers with its new MeriPreferences slot. Keep preferences disabled/unconnected, fixture and ordinary account destinations distinct, selected-client navigation and overlay focus/dismissal intact. Parent's read-only no-overlap finding is not merge/runtime acceptance. Coordinate the shared architecture record files field-wise; do not modify Fable source or root session/HTTP/HeaderFrame/config/lock for this release.
