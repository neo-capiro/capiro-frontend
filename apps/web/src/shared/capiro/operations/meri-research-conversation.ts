import { z } from "zod";
import { defineOperation } from "../contracts";

const uuid = z.uuid().refine((value) => value === value.toLowerCase());
// Strip unrelated legacy row fields at the gateway. The public session receiver owns capture validation.
export const researchConversationRow = z.object({
  id: uuid,
  tenantId: uuid,
  userId: uuid,
  clientId: z.null(),
  status: z.literal("active"),
  archivedAt: z.null(),
  trashedAt: z.null(),
  metadata: z.object({ researchPortfolioScope: z.unknown() }),
});
const source =
  "Core MeriController conversations create/get; MeriService.createConversation/ensureConversationAnyStatus; ResearchPortfolioMeriScopeService.resolve and authorizeResearchPortfolioConversation";
export const meriResearchConversationOperations = {
  "meri.research.conversation.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/conversations",
    source,
    requestLimitBytes: 1024,
    request: z.strictObject({
      body: z.strictObject({ researchPortfolioId: uuid }),
    }),
    response: researchConversationRow,
  }),
  "meri.research.conversation.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/conversations/:id",
    source,
    request: z.strictObject({ params: z.strictObject({ id: uuid }) }),
    response: researchConversationRow,
  }),
} as const;
