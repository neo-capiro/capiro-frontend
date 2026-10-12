import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { advocacyPath, loadMatter, loadMatters } from "./queries";
import {
  matterEditRevision,
  matterUpdateReflected,
  type MatterUpdate,
} from "./matter-edit";
import type { MatterEditReview } from "./matter-edit-scope";

export async function prepareMatterEdit(
  api: ApiClient,
  review: MatterEditReview,
  signal: AbortSignal,
  assertCurrent: () => void,
) {
  assertCurrent();
  signal.throwIfAborted();
  const matters = await loadMatters(api, review.clientId, signal);
  signal.throwIfAborted();
  assertCurrent();
  if (!matters.some((matter) => matter.id === review.matter.id))
    throw new ApiError(
      404,
      "This matter is no longer in the current client list.",
    );
  const current = await loadMatter(
    api,
    review.clientId,
    review.matter.id,
    signal,
  );
  signal.throwIfAborted();
  assertCurrent();
  if (matterEditRevision(current) !== matterEditRevision(review.matter))
    throw new ApiError(
      409,
      "The current matter differs from your review. Reload it before saving.",
    );
}
export async function reloadMatterEdit(
  api: ApiClient,
  review: MatterEditReview,
  signal: AbortSignal,
  assertCurrent: () => void,
) {
  signal.throwIfAborted();
  assertCurrent();
  const matters = await loadMatters(api, review.clientId, signal);
  signal.throwIfAborted();
  assertCurrent();
  if (!matters.some((matter) => matter.id === review.matter.id))
    throw new ApiError(
      404,
      "This matter is no longer in the current client list.",
    );
  const matter = await loadMatter(
    api,
    review.clientId,
    review.matter.id,
    signal,
  );
  signal.throwIfAborted();
  assertCurrent();
  return { matters, matter };
}
export async function submitMatterEdit(
  api: ApiClient,
  clientId: string,
  id: string,
  input: MatterUpdate,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  await api.request(
    "core",
    `${advocacyPath(clientId)}/${encodeURIComponent(id)}`,
    z.null(),
    { method: "PATCH", body: input, signal },
  );
}
export async function readMatterEditResult(
  api: ApiClient,
  clientId: string,
  id: string,
  input: MatterUpdate,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const current = await loadMatter(api, clientId, id, signal);
  signal.throwIfAborted();
  if (!matterUpdateReflected(current, id, input))
    throw new ApiError(
      409,
      "The current matter does not confirm all reviewed changes. The submitted result is still unknown; another save is disabled.",
    );
  return current;
}
