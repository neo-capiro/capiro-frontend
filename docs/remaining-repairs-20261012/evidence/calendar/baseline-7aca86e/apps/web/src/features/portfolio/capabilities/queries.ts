"use client";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { capabilitySchema, fitSchema } from "./contracts";
export const capabilitiesKey = (id: string) => ["capabilities", id] as const;
export const fitKey = (id: string) => ["capability-fit", id] as const;
export function useCapabilities(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: capabilitiesKey(id),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/${id}/capabilities`,
        z.array(capabilitySchema),
        { signal },
      ),
  });
}
export function useCapabilityFit(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: fitKey(id),
    queryFn: ({ signal }) =>
      api.request("core", `clients/${id}/capability-fit`, fitSchema, {
        signal,
      }),
  });
}
