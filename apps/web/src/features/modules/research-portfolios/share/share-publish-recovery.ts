import type { OperationRequest } from "../../../../shared/capiro/contracts";
import { researchShareOperations } from "../../../../shared/capiro/operations/research-share";
export type SharePublishInput = OperationRequest<
  (typeof researchShareOperations)["research.shareLinks.publish"]
>;
export type SharePublishActor = { tenantId: string; userId: string };
export const sharePublishRecovery = {
  schema: researchShareOperations["research.shareLinks.publish"].request,
  requestId: (input: SharePublishInput) => input.body.operationKey,
};
export function sharePublishScope(
  actor: SharePublishActor,
  portfolioId: string,
) {
  return JSON.stringify([
    "research-share-publication-v1",
    actor.tenantId,
    actor.userId,
    portfolioId,
  ]);
}
