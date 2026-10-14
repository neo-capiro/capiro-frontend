import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  objectiveDestinationBinding,
  objectiveDestinationQuery,
  objectiveResourceId as id,
} from "./objective-destination-binding";

/** Existing saved target identity; no Directory profile or cached labels. */
export const objectiveDirectoryDestination = z
  .object({
    destination: objectiveDestinationBinding
      .extend({ kind: z.literal("directory_target") })
      .strict(),
    target: z
      .object({
        id,
        clientId: id,
        sourceDirectory: z.enum(["congress", "state", "staff"]),
        memberId: z
          .string()
          .refine(
            (value) => !!value.trim() && Array.from(value).length <= 128,
            "Invalid saved target identity.",
          ),
      })
      .strict(),
  })
  .strict()
  .refine(
    ({ destination, target }) =>
      destination.resourceId === target.id &&
      destination.clientId === target.clientId,
    "The Objective destination does not match the saved client target.",
  );

export const directoryObjectiveOperations = {
  "directory.objectiveDestination": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients/:clientId/targets/:targetId/objective-destination",
    request: z
      .object({
        params: z.object({ clientId: id, targetId: id }).strict(),
        query: objectiveDestinationQuery,
      })
      .strict()
      .refine((value) => value.params.clientId === value.query.clientId),
    response: objectiveDirectoryDestination,
    source:
      "neo-capiro/capiro-backend@917fed9be648dc4abfd6770e0e391ce2e3fe3928 docs/backend-directory-objective-20261014/HANDOFF.md; ClientTargetsController/Service.objectiveDestination",
  }),
} as const;
