import { canonicalWorkspaceSnapshot } from "@capiro/shared";
import {
  objectiveWorkspaceDestination,
  requireObjectiveWorkspace,
} from "./objective-work-destinations";
import {
  objectiveResourceId,
  type ObjectiveDestinationQuery,
} from "./objective-destination-binding";
import { captureObjectiveRead } from "./objective-read-admission";
import type { z } from "zod";

/** Canonical producer plus hash verifies the selected saved snapshot, never live content. */
export async function receiveObjectiveWorkspace(
  value: z.infer<typeof objectiveWorkspaceDestination>,
  draftId: string,
  versionId: string,
  query: ObjectiveDestinationQuery,
  signal: AbortSignal,
  selectedHash?: string,
  isCurrent?: () => boolean,
) {
  const capturedDraft = objectiveResourceId.parse(draftId),
    capturedVersion = objectiveResourceId.parse(versionId),
    expectedHash = selectedHash;
  const captured = captureObjectiveRead(query, signal, isCurrent);
  const receipt = requireObjectiveWorkspace(
    objectiveWorkspaceDestination.parse(value),
    capturedDraft,
    capturedVersion,
    captured.query,
  );
  const snapshotJson = canonicalWorkspaceSnapshot(receipt.snapshot);
  const frozenSnapshot = JSON.parse(snapshotJson) as unknown;
  try {
    const bytes = new TextEncoder().encode(snapshotJson);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    captured.admitted();
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (
      hash !== receipt.snapshotHash ||
      (expectedHash !== undefined && expectedHash !== hash)
    )
      throw new Error(
        "The selected saved Workspace revision changed. Return to the Objective to review its saved version.",
      );
    return { ...receipt, snapshot: frozenSnapshot };
  } catch (error) {
    captured.admitted();
    throw error;
  }
}
