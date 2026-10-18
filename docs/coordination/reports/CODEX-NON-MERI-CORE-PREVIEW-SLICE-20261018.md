# Non-Meri Core preview source slice — 18 October 2026

## Source and ownership

This branch starts from frontend PR #97 (`d9959a9cee267365d1f13a72351802a66c6dbfe2`). Core receiving PR #96 source `784b1c3a91eb6d78f16d92c42e71f05c12c5b5bb` qualifies native, authenticated `GET /api/me`, `GET /api/clients`, and `GET /api/clients/:id` in source. A running Core image, listener, tenant/Clerk pairing, and live roster receipt are separate release gates.

The frontend preview route validator continues to own the exact read allowlist and native Clerk session forwarding. Portfolio owns client-list presentation; Modules owns its client scope selector. The selected-client provider remains the canonical client-detail verification boundary. The preview proposal generator owns only public source/origin metadata. No backend, AWS, Meri runtime, shared shell, tokens, lockfile, or service template changes are in this branch.

## Route and data checklist

| Surface | Qualified preview behavior | Deliberately unavailable dependency |
| --- | --- | --- |
| `/` and `/portfolio` | Read-only Clients catalog from the existing raw Core `clients` read. Count, search, and rows use only returned `profileType=CLIENT` records; each row can select that client in Modules. | Account owners/options, BD prospects, saved layout, alerts, profile details, and mutations are not mounted in the preview catalog. |
| `/modules` | Client scope options use the raw Core roster; the ordinary `clients.list` query is disabled in this mode. A selected URL client still requires the existing Core client-detail verification. | Module data, cards, actions, and ordinary fixed-operation reads are not shown as available in the limited mode. |
| Ordinary Portfolio and Modules | Existing behavior remains the default. The ordinary Portfolio `type=CLIENT` tab no longer starts BD prospect/member-option reads or displays cached BD state. | Other ordinary service reads remain governed by existing configuration. |
| `/api/backend/core/me`, `/clients`, `/clients/:UUID` | Existing preview route allowlist and proxy enforce native token, bounded response validation, server-set tenant assertion, and no-store responses. | Other Core routes and all writes remain held by existing preview containment. |
| `/api/capiro/me.read`, `/clients.list` | Existing read allowlist remains intact for legacy callers. | No general `/api/capiro/*` expansion. |

This source does not assert Figma parity for the limited preview screen. Existing Figma asset URLs were inaccessible (HTTP 403) during the desktop audit; no asset byte identity claim is made.

## Exact binding delta

The existing preview remains off by default. The legacy Core read binding remains source `6542f5b089656b6d255465edd464d06c2a0b408f` with `https://first-chat-preview.app-dev.capiro.ai/api`. For this new limited mode, the proposal generator requires `previewReadEnabled: true` and an explicit `qualifiedCoreReadApiBaseUrl` equal to a separately owner-qualified canonical HTTPS DNS URL ending exactly `/api`. It then emits:

```text
CAPIRO_PREVIEW_READ_ONLY=true
CAPIRO_PREVIEW_READ_BACKEND_SOURCE=784b1c3a91eb6d78f16d92c42e71f05c12c5b5bb
CAPIRO_PREVIEW_READ_API_BASE_URL=https://<owner-qualified-core-preview-host>/api
MERI_FIRST_CHAT_BOOTSTRAP_ENABLED=false
```

The frontend rejects a missing/mismatched pair, production/front-end/ordinary/Meri origin, credential, port, query, fragment, malformed path, and PR96 plus first-chat bootstrap co-activation. The proposal generator preserves all existing Meri conversation and proxy bindings. No concrete new Core host is claimed in this source branch.

The parent-owned `apps/web/deployment/portfolio/service.yml` still constrains read source and URL to the legacy pair. Its separate source edit must admit PR96, validate a canonical explicit `/api` origin, and keep the legacy first-chat rules. Until then the new proposal cannot be applied through that template.

## Release gates

1. The Core owner supplies the serving image digest and source/image match, a live listener with `PREVIEW_NATIVE_GETS_ENABLED=true`, exact preview host, matching Clerk issuer/app/tenant claims, active membership, and a real visible client receipt. The checked-in Core image pin is `null` and service desired count is zero.
2. The shipping owner verifies that the new shared Core read target has equivalent tenant and client-detail behavior for Meri's selected-client check. The browser URL `/api/backend/core/clients/:UUID` is shared, so the frontend cannot choose different Core images by page. The existing chat rollout must not be interrupted.
3. The shared shell owner resolves navigation/header links that still lead to unqualified Portfolio or Modules destinations in limited mode. Those links are outside this source branch; the inner catalog and hub state identify the available slice.
4. The shared service template owner applies and independently validates the parameter change above. No deployment or AWS resource mutation is part of this work.

## Verification

- Preview route, containment and first-chat Vitest: 149 passed. Public proposal validator: 10 passed. Modules hub component Vitest: 3 passed.
- Portfolio index Playwright: 10 passed, including direct Clients and Prospects-to-Clients cache transition. Preview Playwright: 3 passed, including denied selected-client detail. Both browser suites use intercepted synthetic responses.
- Web TypeScript passed. The production workspace build passed after a local lockfile install; its route table includes `/`, `/portfolio`, `/modules`, and the existing strict backend and Capiro route handlers.
- Architecture scan: zero errors, zero blocking size findings; 513 exact reviews and 18 unchanged inherited signals. The policy exception permits only the two server pages to read the qualified preview UI mode.
- [Desktop light component screenshot](assets/non-meri-preview-clients-desktop-light.png), 1440×900. It verifies the limited catalog's current layout with synthetic roster data and does not establish Figma parity.

The synthetic tests and build cannot establish live Core access, Meri compatibility, or Figma asset identity.
