import { ApiError, type ApiClient } from "../api/http";
import { identitySchema } from "./identity";
import type { ClientWriter } from "./client-writer";
export async function verifyCoreWriter(
  api: ApiClient,
  actor: ClientWriter,
  signal: AbortSignal,
  assert: () => void,
) {
  signal.throwIfAborted();
  assert();
  const identity = await api.request("core", "me", identitySchema, { signal });
  signal.throwIfAborted();
  assert();
  if (
    identity.user.id.toLowerCase() !== actor.userId.toLowerCase() ||
    identity.tenant?.id.toLowerCase() !== actor.tenantId.toLowerCase() ||
    !["standard_user", "user_admin", "capiro_admin"].includes(
      identity.role ?? "",
    )
  )
    throw new ApiError(
      403,
      "The current Core session cannot recover this saved intent.",
    );
}
