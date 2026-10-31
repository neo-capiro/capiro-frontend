import { z } from "zod";
import { defineOperation } from "../contracts";
import { hearingIdParams } from "./legiwatch-calendar-schemas";
import { folderBillSchema, folderSchema } from "./legiwatch-folder-schemas";
const folders =
  "apps/intel-api/src/tracker/folders/folder-tracker.controller.ts; folder-tracker.service.ts; sourcedata/folder-source-data.repository.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const empty = z.object({}).strict();
export const legiwatchFolderOperations = {
  "legiwatch.folders": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/folders",
    request: empty,
    response: z.array(folderSchema),
    source: folders,
  }),
  "legiwatch.folder.resolve": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folders/resolve",
    request: z
      .object({
        body: z
          .object({
            folderIds: z.array(z.uuid()).max(20).optional(),
            jurisdiction: z.string().regex(/^[A-Z]{2}$/),
            sessionKey: z.string().regex(/^\d{3,4}(x\d+)?$/),
            billNumbers: z.string().min(1).max(4000),
          })
          .strict(),
      })
      .strict(),
    response: z.array(
      z.object({
        token: z.string(),
        status: z.enum(["resolved", "duplicate", "ambiguous", "unresolved"]),
        bill: folderBillSchema.nullable(),
        reason: z.string().nullable(),
        alreadyIn: z.array(z.string()).optional(),
      }),
    ),
    source: folders,
  }),
  "legiwatch.folder.bulk": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folders/:id/bills",
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            billIds: z.array(z.string().min(1).max(100)).min(1).max(200),
            action: z.enum(["add", "remove"]),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      results: z.array(z.object({ billId: z.string(), status: z.string() })),
      alertsActivated: z.literal(false),
    }),
    source: folders,
  }),
} as const;
