# Initial preview: connected and unavailable

The initial goal is roster selection, existing native reads and truthful UI states. It is not full Portfolio/Modules/Settings functionality. "Connected" here means admitted by the current request configuration; this lane has not verified a signed-in live response. The readback at 20:50 UTC has frontend task revision 18 on source `67fdf56b8f63f25c95dd2c0a2ff0139dcfe3cfb8`; merged UI source `5cd5f20d` and pin successor `e6180219` are not deployed. The successor's [single image build and scan passed](FRONTEND-BUILD-RECEIPT.md); its [image-only option](FRONTEND-IMAGE-ONLY-PROPOSAL.md) is held for review and preserves the current Core/Meri configuration.

| Feature | Current state | Initial preview acceptance / remaining dependency |
| --- | --- | --- |
| Identity and native client list/detail | Connected through existing narrow Core routing; live success unverified | Verify the same signed-in actor and one approved visible client; preserve native authority and existing Meri bindings. |
| Qualified fixed client roster (`clients.list`) | Held in the successor while its roster pair is absent; native Meri/Portfolio client selection remains independently admitted | Qualify exact Core `50475125` image/source, flags and roster Host before activation. The image-only alternative keeps this fixed route unavailable, a functional change from deployed source `67fdf56`; review that availability loss explicitly. |
| Existing repaired UI loading/error/cancellation states | Source and focused UI tests available in merged main | Confirm the receiving frontend source and visible held states. UI tests do not prove backend functionality. |
| Calendar, meeting detail, notes and debriefs | Unavailable; four Core GET authority blockers | Current handlers enforce tenant/meeting ownership but do not establish current selected-client visibility. Keep held pending a separate server authority successor. |
| Existing meeting Save/reopen | Unavailable; authority plus mutation-shape blocker | Current frontend sends `clientId`; even an unchanged value invokes Core reassignment. A separately reviewed five-field body omitting `clientId` and current-client authority are required. No test write is admitted. |
| Personal/Profiles/Team, Directory and Research reads | Mostly held; source contracts are not native-preview readiness | Other than `me`/`clients`, the proposed fixed reads use ordinary auth and need separate route/auth/data/schema review. Invitations use Clerk; Directory needs snapshots and FEC can write an audit record; Research requires grants and bounded fixtures. |
| Planner/Strategies, Workspace, Intelligence/Tracker and Billing | Unavailable under this roster-only plan | Qualify each owning service, origin and workflow separately. Keep unavailable/hosted-portal states truthful. |
| Module-wide metrics, inviter identity, Directory Add-to-client and generic New Event | Missing/undecided contracts | Keep unavailable; do not fabricate counts, associations or event semantics. |
| Prep/notetaker/sync, provider sends, governed Objective actions and other writes | Held | Separate authority/runtime/action qualification. Meri repair continues independently. |

## Exact initial route and binding plan

Keep only the existing native reads and the one separately qualified fixed roster operation below. Do not add meeting, general Modules or Settings routes.

| Browser GET | Exact upstream GET | Target |
| --- | --- | --- |
| `/api/backend/core/me` and `/api/capiro/me.read` | `/api/me` | `https://first-chat-preview.app-dev.capiro.ai` |
| `/api/backend/core/clients` | `/api/clients` | Same legacy first-chat target |
| `/api/backend/core/clients/{canonicalUuid}` | `/api/clients/{canonicalUuid}` | Same legacy first-chat target |
| `/api/capiro/clients.list` | `/api/clients` | `https://core-roster-preview.capiro.ai` after separate qualification |

The server retains native Clerk session retrieval and its trusted tenant selector. Preserve strict canonical paths/query schemas, browser authority-header rejection, no-store/no-redirect behavior and response validation. Roster smoke uses omitted filters or `includeArchived=false`; Core refuses archived-inclusive reads. No arbitrary upstream target or ordinary-auth fallback is admitted.

| Frontend variable | Required value |
| --- | --- |
| `CAPIRO_PREVIEW_READ_ONLY` | `true` |
| `CAPIRO_PREVIEW_READ_BACKEND_SOURCE` | `6542f5b089656b6d255465edd464d06c2a0b408f` |
| `CAPIRO_PREVIEW_READ_API_BASE_URL` | `https://first-chat-preview.app-dev.capiro.ai/api` |
| `CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE` | `50475125275853299798fc40f8cb119f0b865464` only after qualification |
| `CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL` | `https://core-roster-preview.capiro.ai/api` only with that source |

The last two remain absent/held now. The template continues to allow only an empty roster source. [Source review](CORE-ROSTER-PIN.md) and [public proposal](CORE-ROSTER-PIN.json) do not supply runtime evidence.

For Core `50475125`, explicitly qualify `PREVIEW_NATIVE_GETS_ENABLED=true` for existing native reads. Roster additionally requires `CORE_ROSTER_PREVIEW_ENABLED=true`, exact roster Host DNS/TLS/routing with a reject guard, exact image digest/serving `RELEASE_SHA`, and same-user/current-membership/client visibility checks. Preserve existing bootstrap/identity/context/membership POST routes, Meri bindings, secrets, worker settings and the retained deny guard. Neither flag grants meeting or other ordinary-auth routes.

The four held meeting GETs are `/api/engagement/meetings`, `/api/engagement/meetings/{id}`, `/api/engagement/meetings/{id}/notes` and `/api/engagement/meetings/{id}/debriefs`. `GET /api/engagement/capabilities` is a source-supported configuration read but still uses ordinary auth and stays outside this initial cohort. `PUT /api/engagement/meetings/{id}` remains held; neither static fixture IDs nor UI filtering resolve the authority gap.

Neo approved the combined USD 6 Core/frontend request at 20:21 UTC on 19 October. The single frontend build succeeded with no retries; [its receipt](FRONTEND-BUILD-RECEIPT.md) records exact source/image/scan evidence and the prior successful 4 GiB full typecheck. No further build, deployment or activation is authorized by this checklist. The parent must review the concrete configuration and coordinate any release separately. The initial route plan continues to supersede earlier broader meeting/15-read cohort proposals.
