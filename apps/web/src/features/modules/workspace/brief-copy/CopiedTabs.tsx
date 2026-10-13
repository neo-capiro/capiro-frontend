import Link from "next/link";
import type { WorkspaceDraftDocument } from "@/shared/capiro/operations/workspace-documents";
import { Panel } from "@/shared/module-ui";
export function CopiedTabs({ draft }: { draft: WorkspaceDraftDocument }) {
  const copies = draft.documents.filter(
    (document) => document.sourceBriefVersion,
  );
  if (!copies.length || !draft.prospectId) return null;
  return (
    <Panel title="Copied Core brief tabs">
      <p>
        These independent copies use atomic tab saves and Workspace history.
        Original Core versions remain unchanged.
      </p>
      {copies.map((document) => (
        <p key={document.id}>
          <Link
            href={`/modules/workspace?${new URLSearchParams({ prospectId: draft.prospectId!, draftId: draft.id, copyDocumentId: document.id })}`}
          >
            {document.name} · Core version{" "}
            {document.sourceBriefVersion!.versionNumber}
          </Link>
        </p>
      ))}
      <p>
        Whole-draft version restore is unavailable while this draft contains a
        bound Core copy.
      </p>
    </Panel>
  );
}
