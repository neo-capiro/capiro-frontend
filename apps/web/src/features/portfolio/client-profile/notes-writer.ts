import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileClientSchema, profileNotesReceipt } from "./profile-receipts";
import { assertProfileSource, type ProfileSource } from "./profile-source";
export async function writeProfileNotes(
  api: ApiClient,
  cache: QueryClient,
  context: { clientId: string; actor: ProfileActor; source: ProfileSource },
  notes: string,
  signal: AbortSignal,
) {
  assertProfileActor(cache, context.actor, true);
  assertProfileSource(cache, context.source);
  if (
    !profileClientSchema(context.clientId, context.actor.tenantId).safeParse(
      cache.getQueryData(context.source.key),
    ).success
  )
    throw new ApiError(
      409,
      "Load the current client before replacing profile notes.",
    );
  if (notes.length > 20000)
    throw new ApiError(
      400,
      "Profile notes must be 20,000 characters or fewer.",
    );
  signal.throwIfAborted();
  return api.request(
    "core",
    `clients/${encodeURIComponent(context.clientId)}/profile-notes`,
    profileNotesReceipt(context.clientId, context.actor.tenantId, notes),
    {
      method: "PUT",
      body: { notes },
      signal,
    },
  );
}
