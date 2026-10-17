# First-chat frontend origin proposal

Source-only proposal for the reviewed Portfolio preview. These values are not a deployment receipt or permission to activate services.

| Binding | Proposed nonsecret value | Status |
| --- | --- | --- |
| Browser origin, frontend `CAPIRO_REQUEST_ORIGIN`, Core `WEB_ORIGIN`, Meri Stage 3 `origins.frontendOrigin` / `http.frontendOrigin` | `https://portfolio-preview.app.capiro.ai` | Exact shared value to review in each service's deployment input. The frontend server sets this value as the upstream conversation `Origin` only after canonical configuration and request-URL checks. |
| Frontend `CAPIRO_EXISTING_APP_URL` | `https://portfolio-preview.app.capiro.ai` | Already fixed by the reviewed Portfolio preview source; the conversation proxy also requires it to match in preview mode. |
| Frontend `MERI_API_BASE_URL` and `CAPIRO_PREVIEW_MERI_RUNTIME_ORIGIN` | `https://meri-preview.capiro.ai` | Proposed matching HTTPS root target; DNS, TLS, listener reachability and serving revision are pending. This is a server-side target, not a browser destination. |
| `CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION` | `0.1.8` | Reviewed frontend consumer source requirement; producer/package and serving receipt still require matching qualification. |
| `CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE` | **PENDING** | Fill only from the selected, qualified Meri serving source commit. |
| `CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST` | **PENDING** | Fill only from the image digest paired with that serving source and accepted scan/build receipt. |
| `MERI_FIRST_CHAT_CLIENT_ID` | **PENDING** | Fill only after current Core tenant/member/client admission is verified. |
| Frontend successor source and image | **PENDING** | This source change has focused checks only; no successor image is qualified. |

The route gate requires `CAPIRO_PREVIEW_READ_ONLY=true`, `CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED=true`, and `MERI_CONVERSATION_WORKFLOW_ENABLED=true`, alongside the matching Meri origin, source, digest and contract version above. Core bootstrap separately requires `MERI_FIRST_CHAT_BOOTSTRAP_ENABLED=true`, an approved first-chat Core target, its source marker and the selected client. The source markers `6542f5b089656b6d255465edd464d06c2a0b408f` (Core reads) and `c64f0005cf14d69683aabafa11def4964d766832` (bootstrap) identify reviewed frontend expectations, not live service proof.

The current Portfolio service template emits only `MERI_API_BASE_URL` (default empty) and `MERI_CONVERSATION_WORKFLOW_ENABLED` (default false). It does not emit `CAPIRO_REQUEST_ORIGIN`, the additional preview route/runtime pins, or first-chat bootstrap settings. A separate reviewed deployment-source change is required before those values can be applied. Strategy and Onboard remain held; this proposal does not alter action/document workflow flags, credentials, CORS, the service template, or AWS.

At Meri PR #121 `c7af4ed6389405c50a6621535a33fd253d5de7c4`, the public listener accepts an absent `Origin` and refuses a present value that differs from `http.frontendOrigin`. The new frontend proxy sends the trusted configured value for conversation POST, history, and reconnect GET. Its browser remains same-origin and never calls the Meri target directly.
