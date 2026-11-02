import { z } from "zod";
import { receiveSkillSelection } from "../meri-conversations/query-journal";
import {
  requireMeriTabStorage,
  tabRecord,
  TabJournalUnavailable,
  type TabStorage,
} from "../meri-conversations/tab-journal";
import type { ArtifactPreview } from "./artifact-access";

const receive = (value: unknown) => {
  const parsed = z
    .strictObject({
      filename: z.string().min(1).max(512),
      selection: z.unknown(),
    })
    .parse(value);
  const selection = receiveSkillSelection(parsed.selection);
  if (!selection.documentRevision || selection.skill || selection.windowRequest)
    throw new TabJournalUnavailable();
  return { filename: parsed.filename, selection };
};
export type RevisionHandoff = ReturnType<typeof receive>;
/** The tab scope a handoff is written under; a library session or an office editor origin supplies it too. */
export type HandoffContext = Readonly<{
  tenantId: string;
  actorId: string;
  conversationId: string;
  selectedClientId: string | null;
}>;
/** Unsent navigation hints scoped to the original conversation. Current runtime re-reads the selected source. */
export function revisionHandoff(context: HandoffContext, storage?: TabStorage) {
  const ready = requireMeriTabStorage(storage);
  if (!ready) throw new TabJournalUnavailable();
  const record = tabRecord(
    { ...context, clientId: context.selectedClientId },
    "handoff",
    receive,
    "document-revision",
    ready,
  );
  return {
    read: record.read,
    /** Exactly one immutable version: its artifact, version and bytes digest, read again by the service on use.
     * A generated or Office version qualifies; a native file has no artifact identity to revise. */
    write(
      inspection:
        | ArtifactPreview
        | {
            artifactId: string;
            versionId: string;
            objectSha256: string;
            filename: string;
          },
    ) {
      if ("kind" in inspection && inspection.kind !== "generated")
        throw new Error("Native revision unavailable");
      record.write(
        receive({
          filename: inspection.filename,
          selection: {
            documentRevision: {
              artifactId: inspection.artifactId,
              versionId: inspection.versionId,
              objectSha256: inspection.objectSha256,
            },
          },
        }),
      );
    },
    clear(expected: RevisionHandoff) {
      if (JSON.stringify(record.read()) !== JSON.stringify(expected))
        throw new TabJournalUnavailable();
      record.clear();
    },
  };
}
