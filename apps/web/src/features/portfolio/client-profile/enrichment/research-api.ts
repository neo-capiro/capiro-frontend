import type { ApiClient } from "@/shared/portfolio/api/http";
import { runSchema, setupSchema } from "./contracts";
import { enrichmentPath } from "./queries";
import { attachmentSchema } from "@/features/portfolio/files/public";
import {
  validateResearchSelection,
  type ResearchCommand,
  type ResearchInput,
} from "./research-contracts";

export async function prepareResearch(
  api: ApiClient,
  clientId: string,
  input: ResearchInput,
  guard: () => void,
  signal: AbortSignal,
) {
  guard();
  const setup = await api.request(
    "core",
    `${enrichmentPath(clientId)}/setup`,
    setupSchema.refine((value) => value.clientId === clientId),
    { signal },
  );
  guard();
  signal.throwIfAborted();
  const files = input.attachmentIds.length
    ? await api.request(
        "core",
        `engagement/attachments?${new URLSearchParams({ clientId })}`,
        attachmentSchema
          .array()
          .refine((rows) => rows.every((row) => row.clientId === clientId)),
        { signal },
      )
    : [];
  guard();
  signal.throwIfAborted();
  return {
    requestId: crypto.randomUUID(),
    input: validateResearchSelection(input, setup, files),
  };
}
export async function sendResearch(
  api: ApiClient,
  clientId: string,
  command: ResearchCommand,
  guard: () => void,
  signal: AbortSignal,
  received: (command: ResearchCommand) => Promise<unknown>,
) {
  guard();
  signal.throwIfAborted();
  const run = await api.request(
    "core",
    `${enrichmentPath(clientId)}/runs`,
    runSchema.refine(
      (value) => value.clientId === clientId && value.id === command.requestId,
    ),
    {
      method: "POST",
      body: { requestId: command.requestId, ...command.input },
      signal,
    },
  );
  // Persist validated late acknowledgement only to the original actor/client scope.
  await received(command);
  guard();
  signal.throwIfAborted();
  return run;
}
