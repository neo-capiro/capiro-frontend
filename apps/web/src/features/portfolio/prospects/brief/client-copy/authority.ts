import type { ApiClient } from "@/shared/portfolio/api/http";
import type { useCapiro } from "@/shared/capiro/CapiroBoundary";
import {
  verifyProspectWriter,
  type ProspectWriter,
} from "@/features/modules/workspace/prospect-actions-public";
import { readClientBriefContext } from "./review";

/** Hide the installed private view if its fresh authority check cannot finish; the journal remains held. */
export class ClientBriefAccessError extends Error {}
export async function verifyClientBriefAccess(
  api: ApiClient,
  workspace: ReturnType<typeof useCapiro>,
  actor: ProspectWriter,
  prospectId: string,
  clientId: string,
  signal: AbortSignal,
  guard: () => void,
) {
  try {
    guard();
    signal.throwIfAborted();
    await verifyProspectWriter(workspace, actor, signal, guard);
    await readClientBriefContext(api, prospectId, clientId, signal, guard);
    guard();
    signal.throwIfAborted();
  } catch (cause) {
    throw new ClientBriefAccessError(
      cause instanceof Error
        ? cause.message
        : "Current access could not be checked. Restore recovery before continuing.",
      { cause },
    );
  }
}
