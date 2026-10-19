# Backend PR3 receiving checkpoint

Received [backend draft PR3](https://github.com/neo-capiro/capiro-backend/pull/3) at **`96a32150553c423ca182cc3fb345113f5993f016`**, tree `5b477c36de1b70f335dbc5751cdcc8935c80d259`, stacked on PR2. All 56 changed paths are under `docs/preview-readonly-native-20261013/`. Product source remains **`111f269d749cae0249c2141779bd6d7deb93f45c`**, tree `719c8292fc0c9cf4e8242b8d58efb2d004ad0a1f`. Direct pinned reads also confirm identical route-policy and controller Git blobs across both heads; the [receipt](BACKEND-PR3-RECEIPT.json) records those comparisons and all changed paths.

The frontend runtime source binding therefore stays `111f269d749cae0249c2141779bd6d7deb93f45c`. The backend evidence head is recorded separately. The admitted contract remains exactly GET `/api/me`, GET `/api/clients`, and GET `/api/clients/:uuid`. No frontend source, token selection, target binding, route allocation or deployment configuration change is needed for PR3.

## Corrected backend runtime instructions

The reviewed backend entrypoint is `/app/apps/api/dist/preview-readonly/preview-main.js`. The earlier extra `src` segment is superseded. The backend container proposal overrides **both** entryPoint and command:

```json
{
  "entryPoint": ["/usr/bin/dumb-init", "--", "node"],
  "command": ["/app/apps/api/dist/preview-readonly/preview-main.js"],
  "workingDirectory": "/app/apps/api"
}
```

These instructions apply to the separate backend container. The frontend Dockerfile and its image-build inputs are unchanged. The backend's ordinary `serve` dispatcher must not be selected for this isolated bootstrap. PR3's scoped production-options compile emitted 38 files without diagnostics; this remains short of full image/ABI qualification.

The proposed backend ALB check is GET `/api/__preview_liveness`, with success matcher exactly `403`. It observes a listening process responding through the existing deny policy. PR3's synthetic emitted-module HTTP test records no request auth/database calls, including when its fake database becomes unavailable. It does not prove current database readiness, release identity, Clerk authority or native business RLS. This path remains outside the frontend receiver's admitted routes; there is no new health handler.

The permission proposal now names physical SQL column **`tenants.settings_jsonb`**. Prisma already used the correct mapping, so product code is unchanged. This corrects a future runtime-owner review document; no grant was executed. See the exact [entrypoint correction](https://github.com/neo-capiro/capiro-backend/blob/96a32150553c423ca182cc3fb345113f5993f016/docs/preview-readonly-native-20261013/RUNTIME-ENTRYPOINT-CORRECTION.md) and [permission correction](https://github.com/neo-capiro/capiro-backend/blob/96a32150553c423ca182cc3fb345113f5993f016/docs/preview-readonly-native-20261013/RUNTIME-PERMISSIONS-CORRECTION.md).

## Concrete integration status

Frontend [draft PR24](https://github.com/neo-capiro/capiro-frontend/pull/24) is implemented and published. Qualified source remains `5ca42049325881782bc9d2ac557450d642eccee8`, app tree `dbd6aebbae52b5ded5611b21c3ff057b881cf92f`: 2,880 tests, types, full lint/format, public-package/architecture checks, production build, 90 actual HTTP observations and 30 browser observations passed. Existing evidence and exact image-input archive hashes remain unchanged. This receiving update changes documentation only; it does not rerun or relabel those source checks, or perform a duplicate rebuild.

PR3 reports six passing native PostgreSQL catalog controls for the unchanged PR2 Prisma owner. Those controls do not qualify native business-row RLS, the identity/client endpoints, DML refusal, effective reader grants, real Clerk, or a full image. Its smallest native fixture remains blocked by capacity on the backend owner's local PostgreSQL volume. This frontend receiving checkpoint is complete independently of that capacity work and unrelated Meri work; no cleanup donor or database action was undertaken here.

Activation remains held pending that native backend proof, the existing production token's required active `sid` and organization claims, clean-install/image qualification, and the designated shipping review. The [auth contract note](AUTH-CONTRACT-NOTE.md) and [qualification report](QUALIFICATION.md) continue to apply. All **337 Portfolio native rows remain unaccepted**. No source target, deployment, grant, credential, resource or authentication change was enabled.
