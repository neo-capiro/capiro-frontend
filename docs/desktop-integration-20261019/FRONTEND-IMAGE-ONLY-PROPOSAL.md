# Held image-only deployment and rollback proposal

**Review only; not executed or approved for deployment.** The built frontend can preserve the existing narrow Core/Meri request boundary with the qualified roster absent. Source review and synthetic tests support that limited configuration; live authenticated compatibility has not been established. There is a material functional difference: fixed `clients.list` becomes unavailable when the pair is absent, whereas the currently deployed frontend source can admit it. A release owner must explicitly review that availability loss before selecting this option.

The [machine-readable proposal and rollback record](FRONTEND-IMAGE-ONLY-PROPOSAL.json) contain the exact image delta, all 24 preserved parameter names, public bindings and observed baseline. The [build receipt](FRONTEND-BUILD-RECEIPT.md) qualifies the candidate image. This proposal requires no new build and no Core upgrade, but does not authorize either a frontend rollout or restoration action.

## Read-only baseline

Initial readbacks completed at `2026-10-19T20:50:12.5070982Z`, region `us-east-1`. A public-only frontend service readback at `20:55:55.9907600Z` reconfirmed revision 18, counts, completed rollout and the recorded circuit-breaker configuration:

| Item | Observed state |
| --- | --- |
| CloudFormation stack | `Capiro-Portfolio-Preview-Service`, `UPDATE_COMPLETE`, last updated `2026-10-18T15:37:38.587Z` |
| Frontend service / cluster | `capiro-portfolio-preview` / `capiro-portfolio-preview` |
| Frontend task | `capiro-portfolio-preview:18`, ACTIVE; desired/running/pending 1/1/0; deployment COMPLETED |
| Current frontend source tag | `67fdf56b8f63f25c95dd2c0a2ff0139dcfe3cfb8` |
| Current frontend digest | `sha256:0401f61d490cac98baaebeaf9ccd1daf08b19bc730aa9d313b33abf007cf9fce` |
| Runtime confirmation | Running container digest equals the stack/task image; load-balancer target healthy. ECS task/container health is UNKNOWN, not a claimed container health-check pass. |
| Resources | Fargate, 512 CPU units, 1024 MiB, X86_64/Linux; default product `portfolio` |
| Existing Core | `capiro-preview-first-chat-core:2`, deployment COMPLETED, desired/running/pending 1/1/0 |
| Existing Core image | `capiro/preview-core@sha256:46acfc0734fd40afdfca6851ab542173b9d35eb9658d35c60180d716c02acde8` in the same registry |
| Core task source marker | `RELEASE_SHA=ade7fc883b7459cbc50e6f71d40ce3644bace5ea`; not serving-source/authority proof |
| New Core flags | `PREVIEW_NATIVE_GETS_ENABLED` and `CORE_ROSTER_PREVIEW_ENABLED` absent from the current task environment |
| Frontend roster pair | Both variables absent; current stack has neither roster parameter |

The frontend legacy source marker `6542f5b0...` is deployment intent, not a claim that existing Core serves that SHA. Existing Core is not the separately proposed `50475125` candidate. No authenticated Core request, Meri write or private client lookup was performed for this receipt.

## Minimal configuration difference

Use the **existing deployed stack template**, with `UsePreviousTemplate=true`. Preserve each of its other **24 parameters** using `UsePreviousValue=true`. These retain the current template and parameter values under the documented [UpdateStack](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_UpdateStack.html) and [Parameter](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_Parameter.html) semantics. Change exactly one parameter:

```diff
 StackName: Capiro-Portfolio-Preview-Service
 UsePreviousTemplate: true
-ImageUri: 967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview@sha256:0401f61d490cac98baaebeaf9ccd1daf08b19bc730aa9d313b33abf007cf9fce
+ImageUri: 967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview@sha256:32941b84d67f5c276aedffee3b8ec3f96a4de8160d130842d91dadc18d334bd4
```

Do not apply repository `apps/web/deployment/portfolio/service.yml` as part of this proposal. The deployed stack uses names such as `PreviewReadOnly`, `PreviewReadBackendSource` and `PreviewMeriRuntimeSource`; the repository template uses different `CapiroPreview...` names and contains roster parameters. Replacing that template would exceed this image-only diff. The projected template summary declares `CAPABILITY_IAM` and no transforms; the proposed acknowledgment covers that existing template and does not authorize an IAM resource change.

Preserve all environment entries, private client selection, Clerk secret references, service/resource settings, desired count, roles, networking, listeners, DNS and health checks. Secret values and references are not included in this packet. A recreated task can resolve a rotated secret reference differently; the release owner must privately verify binding/version stability before execution. Any drift requires a fresh proposal rather than silently copying this readback.

## Exact compatibility conditions

| Boundary | Preserve |
| --- | --- |
| Containment | `CAPIRO_PREVIEW_READ_ONLY=true`; never disable it to make held routes work |
| Native read source / origin | `6542f5b089656b6d255465edd464d06c2a0b408f` / `https://first-chat-preview.app-dev.capiro.ai/api` |
| Qualified fixed roster | Both `CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE` and `CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL` remain absent |
| Bootstrap | Enabled; retain private configured client, source `c64f0005cf14d69683aabafa11def4964d766832` and the existing first-chat API origin |
| Meri | Keep conversation workflow/routes enabled, origin `https://meri-preview.capiro.ai`, source `176a8811a9b05d8613282e70bd7a57ebd75ca201`, digest `sha256:5534edfe5805eec7a5d0bce66b2c85765fe2f957173ddd3ce2726bed67e322d8`, consumer contract `0.1.10` |
| Other workflows | Action/document workflows remain false; document operation remains empty; meeting and broader APIs stay held |

Only exact `/api/capiro/clients.list` selects the qualified roster target. With its pair absent it returns 503 before Clerk/token/fetch, without ordinary-Core fallback. Native `/api/backend/core/me`, `/api/backend/core/clients`, `/api/backend/core/clients/{canonicalUuid}` and fixed `/api/capiro/me.read` retain their legacy target. Meri/Portfolio native client selection and selected-client detail verification do not depend on the held fixed roster. Ordinary Portfolio/Modules screens remain visible, while their broader APIs stay held; visibility is not readiness.

Source evidence at the built commit: [read target selection](https://github.com/neo-capiro/capiro-frontend/blob/e6180219b589ae8fced7155d1c451840c8663d94/apps/web/src/shared/preview/read-config.server.ts#L72), [containment](https://github.com/neo-capiro/capiro-frontend/blob/e6180219b589ae8fced7155d1c451840c8663d94/apps/web/src/shared/preview/backend-policy.server.ts#L11), [bootstrap boundary](https://github.com/neo-capiro/capiro-frontend/blob/e6180219b589ae8fced7155d1c451840c8663d94/apps/web/src/shared/preview/first-chat-write.server.ts#L7), [Meri boundary](https://github.com/neo-capiro/capiro-frontend/blob/e6180219b589ae8fced7155d1c451840c8663d94/apps/web/src/shared/preview/meri-conversation-route.server.ts#L43), [native client API](https://github.com/neo-capiro/capiro-frontend/blob/e6180219b589ae8fced7155d1c451840c8663d94/apps/web/src/shared/portfolio/api/clients.ts#L24) and [selected-client verification](https://github.com/neo-capiro/capiro-frontend/blob/e6180219b589ae8fced7155d1c451840c8663d94/apps/web/src/shared/session/SelectedClient.tsx#L27).

The completed build includes receiving tests for missing/wrong roster pairs, no dispatch on denial, legacy native reads, authority-header rejection and unrelated held operations; bootstrap and Meri route tests exercise their independent bindings without the roster pair. These are synthetic regressions. They do not prove successful calls against the observed Core image or the currently running Meri service.

## Review and acceptance before any release

1. Parent/release owner reviews the image-only scope and fixed-roster availability loss, coordinates with Meri, and separately authorizes execution. Core's candidate with reported HIGH findings remains held; this option would keep the current Core untouched.
2. Re-read exact service/task/template/parameter state and private binding versions. Require the recorded baseline or stop for coordination. Confirm retained old image/task revision and repository availability. Verify the current template still declares only `CAPABILITY_IAM` with no transforms; this proposal permits no IAM changes.
3. If separately authorized, prepare and review the actual CloudFormation change set. Expected changes are the task definition's image and service task reference only, with no resource replacement outside the task revision, parameter activation or environment changes. No change set exists from this task.
4. Qualify the future running digest, target health, sign-in and existing native `me`/client reads using an approved visible client. Verify held roster/meeting/broader API responses, no-store and preserved current Meri behavior under its owner's approved procedure. Do not create a meeting or paid Meri run just to test this frontend change.

## Prepared rollback receipt

Status: **prepared, not executed**. Exact previous image remains in ECR and task revision 18 remains ACTIVE. Rollback restores stack `ImageUri` to:

```text
967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview@sha256:0401f61d490cac98baaebeaf9ccd1daf08b19bc730aa9d313b33abf007cf9fce
```

Use the same retained template and all 24 previous parameter values; the JSON receipt includes that inverse configuration. A CloudFormation rollback/update may create a new revision equivalent to 18, so do not predict its revision number. The baseline service already has deployment circuit-breaker rollback enabled (100% minimum / 200% maximum healthy deployment limits); that covers deployment health and does not prove functional acceptance or replace the release owner's decision.

Return to the old image if the new digest cannot serve healthy, sign-in/native selection regresses, Meri behavior regresses, held operations become admitted, private bindings drift, or the fixed-roster availability loss is unacceptable. Reconfirm the restored running digest, target health, native paths, held routes and Meri bindings; record execution time and actual revision only if a rollback occurs. No Core/Meri update, database down-migration, secret rotation, data deletion or receipt/history removal is part of rollback. This rollback plan is valid only for the proposed image-only change; concurrent configuration changes require coordination.
