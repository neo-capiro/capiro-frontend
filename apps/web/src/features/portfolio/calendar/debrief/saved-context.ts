import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { debriefContextSummarySchema } from "../commands/input";

export type SavedDebriefContextBinding = {
  id: string;
  meetingId: string;
  clientId: string | null;
  revision: string;
};

export function readSavedDebriefContext(
  api: ApiClient,
  expected: SavedDebriefContextBinding,
  signal?: AbortSignal,
) {
  const schema = z
    .object({
      id: z.literal(expected.id),
      meetingId: z.literal(expected.meetingId),
      clientId: z.literal(expected.clientId),
      revision: z.literal(expected.revision),
      generatedFrom: debriefContextSummarySchema.nullable(),
    })
    .strict();
  return api.request(
    "core",
    `engagement/meetings/${encodeURIComponent(expected.meetingId)}/debriefs/${encodeURIComponent(expected.id)}/context`,
    schema,
    { signal },
  );
}
