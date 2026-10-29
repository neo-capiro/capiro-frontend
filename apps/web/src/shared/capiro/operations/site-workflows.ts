import { z } from "zod";
import {
  parseSaveSiteWorkflow,
  parseSiteWorkflowManifest,
  parseSiteWorkflowConversationId,
} from "@capiro/shared/site-workflows";
import { defineOperation } from "../contracts";
import { publicContract } from "../public-contract";
const source =
  "Core site-workflows/controller.ts @c8e583c109aab7d0788df19acaea16945c9c1e90";
const parsed = <T>(parse: (raw: unknown) => T) =>
  publicContract(parse, "Invalid site workflow");
const configuration = z
  .object({
    manifest: parsed(parseSiteWorkflowManifest),
    manifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
    enabled: z.boolean(),
  })
  .strict();
const receipt = z
  .object({
    requestId: z.string().uuid(),
    configuration,
    savedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export const siteWorkflowOperations = {
  "meri.siteWorkflows.catalog": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/site-workflows/catalog",
    source: "Core site-workflows/controller.ts @721f0ed00 (native-session conversation catalog)",
    request: z
      .object({
        body: z
          .object({
            conversationId: parsed(parseSiteWorkflowConversationId),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ workflows: z.array(configuration).max(256) }).strict(),
  }),
  "settings.siteWorkflows.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/site-workflows",
    source,
    request: z.object({}).strict(),
    response: z.object({ workflows: z.array(configuration).max(256) }).strict(),
  }),
  "settings.siteWorkflows.save": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/site-workflows",
    source,
    request: z.object({ body: parsed(parseSaveSiteWorkflow) }).strict(),
    response: receipt,
  }),
  "settings.siteWorkflows.receipt": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/site-workflows/requests/read",
    source,
    request: z
      .object({ body: z.object({ requestId: z.string().uuid() }).strict() })
      .strict(),
    response: z
      .object({ requestId: z.string().uuid(), receipt: receipt.nullable() })
      .strict(),
  }),
};
