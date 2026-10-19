"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertProfileActor, useProfileActor } from "./profile-access";
import { profileReadKey } from "./profile-keys";
import {
  normalizeProfileDistrict,
  profileEconomicFootprintSchema,
  profileDistrictEconomicContextSchema,
  profileDistrictStrategicSchema,
  profileDistrictPrioritySchema,
  type ProfileEvidenceScope,
} from "./profile-evidence-contracts";

function useProfileEvidenceQuery<Value>(
  scope: ProfileEvidenceScope | undefined,
  section: string,
  requested: boolean,
  needsDistrict: boolean,
  schema: z.ZodType<Value> | undefined,
  path: string | undefined,
) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useProfileActor();
  const district = scope?.district
    ? normalizeProfileDistrict(scope.district)
    : null;
  const scopeAvailable = Boolean(
    scope?.clientId.trim() &&
    scope.facilityId.trim() &&
    (!needsDistrict || district),
  );
  const enabled = requested && scopeAvailable && Boolean(actor);
  const query = useQuery({
    queryKey: [
      ...profileReadKey(scope?.clientId ?? "unavailable", section, actor),
      scope?.facilityId ?? null,
      district?.state ?? null,
      district?.districtCode ?? null,
    ],
    enabled,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      if (!actor || !scopeAvailable || !schema || !path)
        throw new Error("A current profile scope and session are required.");
      assertProfileActor(cache, actor);
      const value = await api.request("core", path, schema, {
        method: "GET",
        signal,
      });
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return value;
    },
  });
  return {
    ...query,
    enabled,
    scopeAvailable,
    data:
      enabled && actor && query.isSuccess && !query.error
        ? query.data
        : undefined,
  };
}
export function useProfileEconomicFootprint(
  scope: ProfileEvidenceScope | undefined,
  enabled: boolean,
) {
  return useProfileEvidenceQuery(
    scope,
    "economic-footprint",
    enabled,
    false,
    scope ? profileEconomicFootprintSchema(scope.clientId) : undefined,
    scope
      ? `intelligence/clients/${encodeURIComponent(scope.clientId)}/district-nexus-v2/economic-footprint`
      : undefined,
  );
}
export function useProfileDistrictEconomicContext(
  scope: ProfileEvidenceScope | undefined,
  enabled: boolean,
) {
  const district = scope?.district
    ? normalizeProfileDistrict(scope.district)
    : null;
  return useProfileEvidenceQuery(
    scope,
    "district-economic-context",
    enabled,
    true,
    district ? profileDistrictEconomicContextSchema(district) : undefined,
    district
      ? `intelligence/district-nexus/districts/${district.state}/${district.districtCode}/economic-context`
      : undefined,
  );
}
export function useProfileDistrictStrategic(
  scope: ProfileEvidenceScope | undefined,
  enabled: boolean,
) {
  const district = scope?.district
    ? normalizeProfileDistrict(scope.district)
    : null;
  return useProfileEvidenceQuery(
    scope,
    "district-strategic",
    enabled,
    true,
    scope && district
      ? profileDistrictStrategicSchema(scope.clientId, district)
      : undefined,
    scope && district
      ? `intelligence/district-nexus/districts/${district.state}/${district.districtCode}/strategic?clientId=${encodeURIComponent(scope.clientId)}`
      : undefined,
  );
}
export function useProfileDistrictPriority(
  scope: ProfileEvidenceScope | undefined,
  enabled: boolean,
) {
  const district = scope?.district
    ? normalizeProfileDistrict(scope.district)
    : null;
  return useProfileEvidenceQuery(
    scope,
    "district-priority",
    enabled,
    true,
    scope && district
      ? profileDistrictPrioritySchema(scope.clientId, district)
      : undefined,
    scope && district
      ? `intelligence/clients/${encodeURIComponent(scope.clientId)}/district-nexus-v2/priority-intelligence?state=${district.state}&district=${district.districtCode}`
      : undefined,
  );
}
