import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { clientSchema } from "@/shared/session/client-contract";
import {
  briefCopySourceSchema,
  type BriefCopySource,
} from "@/shared/capiro/operations/workspace-brief-copy";
import { clientBriefCopyTimestamp } from "@/shared/capiro/operations/workspace-client-brief-copy";
import { prospectForIdSchema, type Prospect } from "../../contracts";
import { readBrief, readVersion, type BriefScope } from "../api";
import type { BriefVersion, CurrentBrief } from "../contracts";

export type ClientBriefSelection = { source: BriefCopySource; title: string };
export type ClientBriefReview = {
  prospect: Prospect;
  client: { id: string; name: string };
  selection: ClientBriefSelection;
};
export function selectClientBrief(
  scope: BriefScope,
  brief: CurrentBrief["brief"],
  version: BriefVersion | null | undefined,
): ClientBriefSelection {
  if (
    !brief ||
    !version ||
    brief.tenantId !== scope.tenantId ||
    brief.prospectId !== scope.prospectId
  )
    throw new Error("Choose a saved brief version from this prospect.");
  return {
    title: brief.title,
    source: briefCopySourceSchema.parse({
      kind: "core_prospect_brief_version",
      prospectId: scope.prospectId,
      briefId: brief.id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      sectionsHash: version.sectionsHash,
      snapshotHash: version.snapshotHash,
    }),
  };
}
/** Current authority reads only; historical recovery must not depend on the saved source still existing. */
export async function readClientBriefContext(
  api: ApiClient,
  prospectId: string,
  clientId: string,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  const [prospect, client] = await Promise.all([
    api.request(
      "core",
      `business-development/prospects/${prospectId}`,
      prospectForIdSchema(prospectId),
      { signal },
    ),
    api.request(
      "core",
      `clients/${clientId}`,
      clientSchema.refine(
        (row) => row.id === clientId && row.status !== "archived",
      ),
      { signal },
    ),
  ]);
  guard();
  signal.throwIfAborted();
  if (
    !prospect.convertedAt ||
    prospect.linkedClientId !== clientId ||
    prospect.status !== "active"
  )
    throw new ApiError(
      409,
      "Review the current converted prospect and its linked client before copying a brief.",
    );
  return { prospect, client: { id: client.id, name: client.name } };
}
export async function readClientBriefReview(
  api: ApiClient,
  scope: BriefScope,
  clientId: string,
  selection: ClientBriefSelection,
  signal: AbortSignal,
  guard: () => void,
): Promise<ClientBriefReview> {
  const pinned = structuredClone(selection);
  briefCopySourceSchema.parse(pinned.source);
  if (pinned.source.prospectId !== scope.prospectId)
    throw new Error(
      "The selected saved source belongs to a different prospect.",
    );
  guard();
  signal.throwIfAborted();
  const [context, root, version] = await Promise.all([
    readClientBriefContext(api, scope.prospectId, clientId, signal, guard),
    readBrief(api, scope, signal),
    readVersion(
      api,
      scope.prospectId,
      pinned.source.versionNumber,
      pinned.source.versionId,
      signal,
    ),
  ]);
  guard();
  signal.throwIfAborted();
  clientBriefCopyTimestamp.parse(context.prospect.updatedAt);
  const current = selectClientBrief(scope, root.brief, version);
  if (JSON.stringify(current) !== JSON.stringify(pinned))
    throw new Error(
      "The selected saved source changed. Open the brief and review it again.",
    );
  return {
    ...context,
    selection: current,
  };
}
export function assertClientBriefReview(
  review: ClientBriefReview,
  current: ClientBriefReview,
) {
  if (
    review.prospect.id !== current.prospect.id ||
    review.prospect.updatedAt !== current.prospect.updatedAt ||
    JSON.stringify(review.client) !== JSON.stringify(current.client) ||
    JSON.stringify(review.selection) !== JSON.stringify(current.selection)
  )
    throw new Error(
      "The prospect, linked client or saved brief changed. Refresh this review before copying.",
    );
}
