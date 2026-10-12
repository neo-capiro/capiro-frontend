import { z } from "zod";
import { defineOperation } from "../../contracts";
import { clientSchema } from "./schemas";

const source =
  "apps/api/src/clients/clients.controller.ts:343-370 + clients.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const clientParams = z.object({ clientId: z.uuid() }).strict();
export const profileOperations = {
  "settings.profiles.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/clients",
    request: z
      .object({
        body: z
          .object({
            name: z.string().min(1).max(200),
            website: z.string().max(2048).optional(),
            description: z.string().max(10000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: clientSchema,
    source,
  }),
  "settings.profiles.archive": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/clients/:clientId",
    request: z.object({ params: clientParams }).strict(),
    response: clientSchema,
    source,
  }),
  "settings.profiles.restore": defineOperation({
    service: "core",
    method: "PUT",
    path: "/clients/:clientId",
    request: z
      .object({
        params: clientParams,
        body: z.object({ status: z.literal("active") }).strict(),
      })
      .strict(),
    response: clientSchema,
    source,
  }),
} as const;
