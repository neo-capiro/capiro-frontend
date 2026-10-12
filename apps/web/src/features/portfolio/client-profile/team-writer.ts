import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import {
  profileMemberOptionsSchema,
  profileTeamSchema,
  teamRosterReceipt,
  type TeamChange,
} from "./profile-receipts";
import { assertProfileSource, type ProfileSource } from "./profile-source";

export type TeamWriteContext = {
  clientId: string;
  actor: ProfileActor;
  roster: ProfileSource;
  options?: ProfileSource;
};
export function assertTeamChange(
  cache: QueryClient,
  context: TeamWriteContext,
  change: TeamChange,
) {
  assertProfileActor(cache, context.actor, true);
  assertProfileSource(cache, context.roster);
  const saved = profileTeamSchema.safeParse(
    cache.getQueryData(context.roster.key),
  );
  if (!saved.success)
    throw new ApiError(
      409,
      "Reload the current account team before changing it.",
    );
  const team = saved.data;
  if (change.kind === "remove") {
    const member = team.find((row) => row.userId === change.userId);
    if (!member || member.isOwner || member.ownerRank)
      throw new ApiError(
        409,
        "Change the owner order explicitly before removing a ranked owner from the team.",
      );
    return;
  }
  if (!context.options)
    throw new ApiError(
      409,
      "Reload current member options before changing this team.",
    );
  assertProfileSource(cache, context.options);
  const available = profileMemberOptionsSchema.safeParse(
    cache.getQueryData(context.options.key),
  );
  if (!available.success)
    throw new ApiError(
      409,
      "Reload current member options before changing this team.",
    );
  const members = available.data;
  if (!members.some((member) => member.id === change.userId))
    throw new ApiError(
      409,
      "That member is no longer available. Choose a current member.",
    );
}
export async function writeTeamChange(
  api: ApiClient,
  cache: QueryClient,
  context: TeamWriteContext,
  change: TeamChange,
  signal: AbortSignal,
) {
  assertTeamChange(cache, context, change);
  signal.throwIfAborted();
  const clientId = encodeURIComponent(context.clientId);
  const roster = await api.request(
    "core",
    `clients/${clientId}/team${change.kind === "remove" ? `?userId=${encodeURIComponent(change.userId)}` : ""}`,
    teamRosterReceipt(change),
    {
      method: change.kind === "remove" ? "DELETE" : "POST",
      body:
        change.kind === "add"
          ? { userId: change.userId, role: change.role.trim() }
          : undefined,
      signal,
    },
  );
  return { kind: "roster" as const, roster };
}
