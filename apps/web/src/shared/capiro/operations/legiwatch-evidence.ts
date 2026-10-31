import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  evidenceId,
  evidenceScope,
  evidenceSource,
} from "./legiwatch-evidence-schemas";
const source =
  "apps/intel-api/src/tracker/editorial/editorial.controller.ts + evidence.service.ts (retained research and briefing citations)";
export const legiwatchEvidenceOperations = {
  "legiwatch.evidence.source": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/source/:kind/:id",
    request: z
      .object({
        params: z
          .object({
            kind: z.enum(["news", "budget", "personnel", "research"]),
            id: evidenceId,
          })
          .strict(),
        query: evidenceScope.optional(),
      })
      .strict(),
    response: evidenceSource,
    source,
  }),
} as const;
