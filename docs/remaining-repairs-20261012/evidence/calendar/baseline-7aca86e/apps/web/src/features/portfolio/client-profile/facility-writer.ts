import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import {
  facilityRemovedReceipt,
  profileFacilityList,
  profileFacilityReceipt,
} from "./profile-receipts";
import { assertProfileSource, type ProfileSource } from "./profile-source";
import type { Facility } from "./contracts";

const stableFields = [
  "name",
  "addressLine",
  "city",
  "state",
  "zip",
  "employeeCount",
  "notes",
  "stateHouseDistrict",
  "stateSenateDistrict",
] as const;
export const facilityDraftRevision = (facility: Facility) =>
  JSON.stringify(
    [...stableFields, "congressionalDistrict" as const].map(
      (field) => facility[field] ?? null,
    ),
  );
export const facilitySaveReceipt = (
  clientId: string,
  tenantId: string,
  body: Record<string, unknown>,
  facilityId?: string,
) =>
  profileFacilityReceipt(clientId, tenantId, facilityId).refine((facility) =>
    stableFields.every(
      (field) =>
        !(field in body) || (facility[field] ?? null) === (body[field] ?? null),
    ),
  );
export type FacilityWriteContext = {
  clientId: string;
  actor: ProfileActor;
  source: ProfileSource;
  facility?: Facility;
};
export type FacilityCommand =
  | { kind: "save"; body: Record<string, unknown> }
  | { kind: "remove" };
export function assertFacilityWrite(
  cache: QueryClient,
  context: FacilityWriteContext,
  command: FacilityCommand,
) {
  assertProfileActor(cache, context.actor);
  assertProfileSource(cache, context.source);
  const saved = profileFacilityList(
    context.clientId,
    context.actor.tenantId,
  ).safeParse(cache.getQueryData(context.source.key));
  if (!saved.success)
    throw new ApiError(
      409,
      "Reload the current facilities before changing them.",
    );
  const rows = saved.data;
  if (context.facility) {
    const current = rows.find((row) => row.id === context.facility?.id);
    if (
      !current ||
      facilityDraftRevision(current) !== facilityDraftRevision(context.facility)
    )
      throw new ApiError(
        409,
        "The saved facility changed or is unavailable. Reload it before saving.",
      );
  } else if (command.kind === "remove")
    throw new ApiError(
      400,
      "Choose a current saved facility before removing it.",
    );
}
export async function writeFacility(
  api: ApiClient,
  cache: QueryClient,
  context: FacilityWriteContext,
  command: FacilityCommand,
  signal: AbortSignal,
) {
  assertFacilityWrite(cache, context, command);
  signal.throwIfAborted();
  const path = `clients/${encodeURIComponent(context.clientId)}/facilities${context.facility ? `/${encodeURIComponent(context.facility.id)}` : ""}`;
  if (command.kind === "remove") {
    await api.request("core", path, facilityRemovedReceipt, {
      method: "DELETE",
      signal,
    });
    return null;
  }
  return api.request(
    "core",
    path,
    facilitySaveReceipt(
      context.clientId,
      context.actor.tenantId,
      command.body,
      context.facility?.id,
    ),
    {
      method: context.facility ? "PATCH" : "POST",
      body: command.body,
      signal,
    },
  );
}
