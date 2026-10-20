# Non-Meri Core preview source slice — 18 October 2026

## Source and ownership

This branch starts from frontend PR #97 (`d9959a9cee267365d1f13a72351802a66c6dbfe2`). Core receiving PR #96 source `784b1c3a91eb6d78f16d92c42e71f05c12c5b5bb` qualifies native, authenticated `GET /api/me`, `GET /api/clients`, and `GET /api/clients/:id` in source. A running Core image, listener, tenant/Clerk pairing, and live roster receipt are separate release gates.

The frontend preview route validator continues to own the exact read allowlist and native Clerk session forwarding. Portfolio owns client-list presentation; Modules owns its read-only client roster. The selected-client provider remains the canonical client-detail verification boundary. The preview proposal generator owns only public source/origin metadata. Preview-only shell links now expose the qualified list and preserve Meri mode navigation. No backend, AWS, Meri runtime, tokens, lockfile, or service template changes are in this branch.

## Route and data checklist

| Surface | Qualified preview behavior | Deliberately unavailable dependency |
| --- | --- | --- |
| `/` and `/portfolio` | Read-only Clients catalog from the fixed `clients.list` operation. Count, search, and rows use only returned `profileType=CLIENT` records. | Client selection, account owners/options, BD prospects, saved layout, alerts, profile details, and mutations are not mounted in the preview catalog. |
| `/modules` | A read-only list of visible client names uses the same fixed `clients.list` operation. A manually supplied URL client still requires the existing legacy Core client-detail verification. | Client selection, module data, cards, and actions are unavailable in the limited mode. |
| Ordinary Portfolio and Modules | Existing behavior remains the default. The ordinary Portfolio `type=CLIENT` tab no longer starts BD prospect/member-option reads or displays cached BD state. | Other ordinary service reads remain governed by existing configuration. |
| `/api/backend/core/me`, `/clients`, `/clients/:UUID`, and `/api/capiro/me.read` | The legacy first-chat read pair remains pinned. Existing preview route allowlist and proxy enforce native token, bounded response validation, server-set tenant assertion, and no-store responses. | Other Core routes and all writes remain held by existing preview containment. |
| `/api/capiro/clients.list` | An exact-path branch requires a separate qualified Core roster pair plus the legacy pair. Incomplete configuration holds the read. | No general `/api/capiro/*` expansion or Meri Core-read retargeting. |

This source does not assert Figma parity for the limited preview screen. Existing Figma asset URLs were inaccessible (HTTP 403) during the desktop audit; no asset byte identity claim is made.

## Exact binding delta

The existing preview remains off by default. The legacy Core read binding remains source `6542f5b089656b6d255465edd464d06c2a0b408f` with `https://first-chat-preview.app-dev.capiro.ai/api`. For this new limited mode, the proposal generator requires `previewReadEnabled: true` and an explicit `qualifiedCoreClientRosterApiBaseUrl` equal to a separately owner-qualified canonical HTTPS DNS URL ending exactly `/api`. It then emits:

```text
CAPIRO_PREVIEW_READ_ONLY=true
CAPIRO_PREVIEW_READ_BACKEND_SOURCE=6542f5b089656b6d255465edd464d06c2a0b408f
CAPIRO_PREVIEW_READ_API_BASE_URL=https://first-chat-preview.app-dev.capiro.ai/api
CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE=784b1c3a91eb6d78f16d92c42e71f05c12c5b5bb
CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL=https://<owner-qualified-core-preview-host>/api
# MERI_FIRST_CHAT_BOOTSTRAP_ENABLED may remain true with its existing pinned POST pair.
```

The frontend rejects a missing/mismatched pair, production/front-end/ordinary/Meri origin, credential, port, query, fragment, and malformed path. The separate roster pair can coexist with first-chat bootstrap; Meri's raw Core identity, roster, detail, conversation, and pinned POST bindings are unchanged. No concrete new Core host is claimed in this source branch.

The parent-owned `apps/web/deployment/portfolio/service.yml` still lacks the two roster parameters and task environment bindings. Its separate source edit must add the PR96 source guard, canonical explicit `/api` origin guard, and retain the legacy first-chat rules. Until then the new proposal cannot be applied through that template. The proposal test marks those two missing template fields as pending owner work.

## Release gates

1. The Core owner supplies the serving image digest and source/image match, a live listener with `PREVIEW_NATIVE_GETS_ENABLED=true`, matching Clerk issuer/app/tenant claims, active membership, and a real visible client receipt. PR #96 pins its native GET Host to `first-chat-preview.app-dev.capiro.ai`; a distinct roster origin needs a qualified Core source/host successor and matching listener. The checked-in Core image pin is `null` and service desired count is zero. The current portfolio-preview DNS resolves to its isolated frontend ALB, and the proposed Core rules are on a different listener; there is no qualified `/api` upstream yet.
2. Meri retains the reviewed legacy raw Core pair and independently pinned first-chat POST pair. Client selection in Portfolio and Modules remains held because its shared raw detail request cannot use the new roster pair; the legacy detail path has a reported live 404 that still needs diagnosis. The existing chat rollout must not be interrupted.
3. The shared service template owner adds and independently validates the two new roster parameters. No deployment or AWS resource mutation is part of this work.

## Verification

- Focused preview route, containment, first-chat, and Modules Vitest: 195 passed. Public proposal validator: 11 passed, including an explicit pending-template gate.
- Portfolio index Playwright: 10 passed, including direct Clients and Prospects-to-Clients cache transition. Preview Playwright: 3 passed, including held selection and preview-only shell navigation. Both browser suites use intercepted synthetic responses.
- Web TypeScript, lint, and production build passed after the composition correction; the route table includes `/`, `/portfolio`, `/modules`, and the existing strict backend and Capiro route handlers.
- Architecture scan: zero errors, zero blocking size findings; 514 exact reviews and 18 unchanged inherited signals. The policy exception permits only the two server pages to read the qualified preview UI mode.
- [Desktop light component screenshot](assets/non-meri-preview-clients-desktop-light.png), 1440×900. It verifies the limited catalog's current layout with synthetic roster data and does not establish Figma parity.

The synthetic tests and build cannot establish live Core access, Meri compatibility, or Figma asset identity.
