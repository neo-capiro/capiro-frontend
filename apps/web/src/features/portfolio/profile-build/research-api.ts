import { sameSubject, type ProfileSubject } from "./subject";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { runSchema, setupSchema } from "./contracts";
import { profileBuildPath } from "./queries";
import {
  researchFilesSchema,
  matchesResearchScope,
  validateResearchSelection,
  type ResearchCommand,
  type ResearchInput,
} from "./research-contracts";

export async function prepareResearch(
  api: ApiClient,
  subject: ProfileSubject,
  input: ResearchInput,
  guard: () => void,
  signal: AbortSignal,
) {
  guard();
  const setup = await api.request(
    "core",
    `${profileBuildPath(subject)}/setup`,
    setupSchema.refine((value) => sameSubject(value.subject, subject)),
    { signal },
  );
  guard();
  signal.throwIfAborted();
  const files = input.attachmentIds.length
    ? await api.request(
        "core",
        `engagement/attachments?${new URLSearchParams({ [subject.kind === "client" ? "clientId" : "prospectId"]: subject.id })}`,
        researchFilesSchema(subject),
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
  subject: ProfileSubject,
  command: ResearchCommand,
  guard: () => void,
  signal: AbortSignal,
  received: (command: ResearchCommand) => Promise<unknown>,
) {
  guard();
  signal.throwIfAborted();
  const run = await api.request(
    "core",
    `${profileBuildPath(subject)}/runs`,
    runSchema.refine(
      (value) =>
        sameSubject(value.subject, subject) &&
        value.id === command.requestId &&
        matchesResearchScope(command.input, value),
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
