import { z } from "zod";
import { defineOperation } from "../contracts";
const source = "Core memory.controller.ts catalog and memory-catalog.ts";
export const memoryFilesOperations = {
  "settings.memory.files.catalog": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/catalog",
    source,
    request: z.object({}).strict(),
    response: z.array(
      z.object({
        type: z.string(),
        scope: z.enum(["firm", "client", "user"]),
        label: z.string(),
        blurb: z.string(),
        sections: z.array(
          z.object({
            key: z.string(),
            heading: z.string(),
            prompt: z.string(),
            example: z.string(),
          }),
        ),
      }),
    ),
  }),
} as const;
