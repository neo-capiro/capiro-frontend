import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { clientSchema } from "@/features/portfolio/index/contracts-public";
import type { CapabilityExecution } from "./writer";

// Existing ClientsController.UpdateClientDto fields only. The native service
// owns funding-profile validation, including retention of historical codes.
const registrationInputSchema = z.object({
  uei: z.string().max(12),
  cageCode: z.string().max(5),
  naicsCodes: z.array(z.string()),
  pscCodes: z.array(z.string()),
  setAsideCertifications: z.array(z.string()),
});
export type RegistrationInput = z.infer<typeof registrationInputSchema>;

export async function saveRegistrations(
  api: ApiClient,
  clientId: string,
  body: RegistrationInput,
  execution: CapabilityExecution,
) {
  execution.guard();
  const receipt = await api.request(
    "core",
    `clients/${clientId}`,
    clientSchema.extend({ id: z.literal(clientId) }),
    {
      method: "PUT",
      body: registrationInputSchema.parse(body),
      signal: execution.signal,
    },
  );
  execution.guard();
  return receipt;
}
