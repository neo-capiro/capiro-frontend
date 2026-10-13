import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import type { Matter, MatterDetail } from "./contracts";
import { matterEditRevision } from "./matter-edit";
import { matterKey, mattersKey } from "./queries";
import {
  assertMatterEditor,
  currentAdvocacyActor,
  currentAdvocacyRead,
  scopedAdvocacyKey,
  type AdvocacyActor,
} from "./read-state";

export type MatterEditReview = {
  actor: AdvocacyActor;
  clientId: string;
  matter: MatterDetail;
  listCount: number;
  detailCount: number;
};
export function captureMatterEdit(
  cache: QueryClient,
  clientId: string,
  matter: MatterDetail,
): MatterEditReview {
  const actor = currentAdvocacyActor(cache);
  if (!actor)
    throw new ApiError(
      403,
      "A current session is required to review this matter.",
    );
  assertMatterEditor(cache, actor);
  const listKey = scopedAdvocacyKey(mattersKey(clientId), actor);
  const detailKey = scopedAdvocacyKey(matterKey(clientId, matter.id), actor);
  const list = cache.getQueryData<Matter[]>(listKey);
  const detail = cache.getQueryData<MatterDetail>(detailKey);
  if (
    !currentAdvocacyRead(cache, listKey) ||
    !currentAdvocacyRead(cache, detailKey) ||
    !list?.some((row) => row.id === matter.id) ||
    !detail ||
    matterEditRevision(detail) !== matterEditRevision(matter)
  )
    throw new ApiError(
      409,
      "Reload the current matter and matter list before editing.",
    );
  return {
    actor,
    clientId,
    matter,
    listCount: cache.getQueryState(listKey)!.dataUpdateCount,
    detailCount: cache.getQueryState(detailKey)!.dataUpdateCount,
  };
}
export function assertMatterEditSource(
  cache: QueryClient,
  review: MatterEditReview,
) {
  assertMatterEditor(cache, review.actor);
  const current = captureMatterEdit(cache, review.clientId, review.matter);
  if (
    current.listCount !== review.listCount ||
    current.detailCount !== review.detailCount
  )
    throw new ApiError(
      409,
      "The matter changed or refreshed after review. Reload it before saving.",
    );
}
