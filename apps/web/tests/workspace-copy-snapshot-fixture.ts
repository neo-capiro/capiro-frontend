import type { SavedSnapshotExport } from "../src/shared/capiro/operations/workspace-exports";
import { copyBody, copyDetail, copyIds } from "./workspace-brief-copy-fixtures";

export function copySnapshot(): SavedSnapshotExport {
  return {
    schemaVersion: 1,
    tenantId: copyDetail.tenantId,
    draftId: copyIds.draft,
    id: copyIds.request,
    label: "Original copy",
    authorId: "synthetic-author",
    authorKind: "user",
    createdAt: "2026-10-13T00:00:00Z",
    snapshot: {
      prospectId: copyIds.prospect,
      docTitle: "Saved prospect draft",
      config: { clientId: null, unknownSetting: { retained: true } },
      ask: { original: true },
      documents: [
        {
          id: copyIds.document,
          name: "Saved copied tab",
          ordinal: 1,
          body: structuredClone(copyBody),
          sourceBriefVersion: structuredClone(
            copyDetail.document.sourceBriefVersion,
          ),
        },
        {
          id: copyIds.other,
          name: "Other saved tab",
          body: { arbitrary: ["Retained other tab"] },
        },
      ],
      sourceEvidence: structuredClone(copyDetail.sourceEvidence),
      atomicBriefSave: {
        requestId: copyIds.request,
        snapshotHash: "f".repeat(64),
      },
    },
  };
}
