import { z } from "zod";
import { acknowledged, type ApiClient } from "@/shared/portfolio/api/http";
import {
  capabilityInputSchema,
  capabilitySchema,
  fitSchema,
  type CapabilityInput,
} from "./contracts";

export type CapabilityExecution = {
  signal: AbortSignal;
  guard: () => void;
};
export type CapabilityChange =
  | { type: "save"; body: CapabilityInput }
  | { type: "remove" };

export async function saveCapability(
  api: ApiClient,
  clientId: string,
  capabilityId: string | undefined,
  body: CapabilityInput,
  execution: CapabilityExecution,
) {
  execution.guard();
  // This editor submits a complete PE array, seeded from the legacy scalar when
  // necessary. Validate that full snapshot before retiring the old scalar;
  // omitted/partial input must never clear an association.
  const input = capabilityInputSchema.parse(body);
  // The existing receipt has no client echo. An edit does have an exact record
  // target; accepting another ID would incorrectly acknowledge this draft.
  const receipt = await api.request(
    "core",
    `clients/${clientId}/capabilities${capabilityId ? `/${capabilityId}` : ""}`,
    capabilityId
      ? capabilitySchema.extend({ id: z.literal(capabilityId) })
      : capabilitySchema,
    {
      method: capabilityId ? "PATCH" : "POST",
      body: { ...input, peNumber: null },
      signal: execution.signal,
    },
  );
  execution.guard();
  return receipt;
}

export async function removeCapability(
  api: ApiClient,
  clientId: string,
  capabilityId: string,
  execution: CapabilityExecution,
) {
  execution.guard();
  const receipt = await api.request(
    "core",
    `clients/${clientId}/capabilities/${capabilityId}`,
    acknowledged,
    { method: "DELETE", signal: execution.signal },
  );
  execution.guard();
  return receipt;
}

export async function refreshCapabilityFit(
  api: ApiClient,
  clientId: string,
  execution: CapabilityExecution,
) {
  execution.guard();
  const receipt = await api.request(
    "core",
    `clients/${clientId}/capability-fit/refresh`,
    fitSchema,
    { method: "POST", signal: execution.signal },
  );
  execution.guard();
  return receipt;
}
