"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { profileReadKey } from "./profile-keys";
import { assertProfileActor, useProfileActor } from "./profile-access";
import {
  boundaryCollectionSchema,
  boundaryManifestSchema,
  facilityNexusSchema,
  representationSchema,
} from "./facility-map-contracts";

export function useFacilityRepresentation(clientId: string, enabled: boolean) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useProfileActor();
  const query = useQuery({
    queryKey: profileReadKey(clientId, "representation", actor),
    enabled: enabled && Boolean(actor),
    queryFn: async ({ signal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertProfileActor(cache, actor);
      const rows = await api.request(
        "core",
        `clients/${clientId}/representation`,
        representationSchema,
        { signal },
      );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return rows;
    },
  });
  return {
    ...query,
    data:
      enabled && actor && query.isSuccess && !query.error
        ? query.data
        : undefined,
  };
}
export function useFacilityNexus(clientId: string, enabled: boolean) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useProfileActor();
  const query = useQuery({
    queryKey: profileReadKey(clientId, "district-nexus", actor),
    enabled: enabled && Boolean(actor),
    queryFn: async ({ signal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertProfileActor(cache, actor);
      const value = await api.request(
        "core",
        `intelligence/clients/${clientId}/district-nexus-v2`,
        facilityNexusSchema,
        { signal },
      );
      if (value.clientId !== clientId)
        throw new Error(
          "The footprint response belongs to a different client.",
        );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return value;
    },
  });
  return {
    ...query,
    enabled: enabled && Boolean(actor),
    data:
      enabled && actor && query.isSuccess && !query.error
        ? query.data
        : undefined,
  };
}
export function useFacilityBoundaries(enabled: boolean) {
  const api = useApi();
  const manifest = useQuery({
    queryKey: ["facility-map", "boundary-manifest", "C"],
    enabled,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        "intelligence/district-nexus/boundaries?status=C",
        boundaryManifestSchema,
        { signal },
      ),
    staleTime: 300_000,
  });
  const geometry = useQuery({
    queryKey: ["facility-map", "boundaries", "C", manifest.data?.hash],
    enabled: enabled && Boolean(manifest.data),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        "intelligence/district-nexus/boundaries/C/geojson",
        boundaryCollectionSchema,
        { signal },
      ),
    staleTime: 300_000,
  });
  return { manifest, geometry };
}
