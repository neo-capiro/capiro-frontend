"use client";
import { useState } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import type { Question } from "@/shared/capiro/operations/objective-questions";
import type { QuestionEvidenceSnapshot } from "@/shared/capiro/operations/objective-question-evidence";
import { FileVersionHistory, useFiles } from "../../files/public";
import type { Objective } from "../contracts";

type Props = { objective: Objective; snapshot: QuestionEvidenceSnapshot; question?: Question };
function DocumentVersions({ objective, snapshot, question }: Props) {
  if (snapshot.selector.kind !== "document") throw Error("Document citation required.");
  const files = useFiles(objective.clientId);
  const query = useCapiroQuery("objectives.questions.evidence.documentHistory", {
    params: { clientId: objective.clientId, objectiveId: objective.id },
    body: question
      ? {
          from: "question",
          questionId: question.id,
          questionVersion: question.version,
          digest: snapshot.digest,
        }
      : { from: "preview", selector: snapshot.selector },
  });
  const anchor =
    !query.loading &&
    !query.error &&
    query.data?.clientId === objective.clientId &&
    query.data.objectiveId === objective.id &&
    query.data.objectiveVersion === objective.version &&
    query.data.anchor.attachmentId === snapshot.selector.attachmentId &&
    query.data.anchor.contentHash === snapshot.version
      ? query.data.anchor
      : undefined;
  const available =
    anchor &&
    !files.isPending &&
    !files.isFetching &&
    !files.error &&
    files.data?.some((file) => file.id === anchor.headId);
  if (!available)
    return (
      <div>
        <p role="status">
          {query.loading || files.isPending || files.isFetching
            ? "Checking current source and client files…"
            : "This exact cited file version is unavailable. Refresh source access and client files to try again."}
        </p>
        <button
          type="button"
          className="button"
          onClick={() => {
            query.reload();
            void files.refetch();
          }}
        >
          Recheck cited file
        </button>
      </div>
    );
  return (
    <FileVersionHistory
      clientId={objective.clientId}
      attachmentId={anchor.headId}
      citedVersion={{ attachmentId: anchor.attachmentId, contentHash: anchor.contentHash }}
    />
  );
}
export function QuestionDocumentSource(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="button" onClick={() => setOpen(!open)}>
        {open ? "Hide document versions" : "Inspect cited document"}
      </button>
      {open && <DocumentVersions {...props} />}
    </div>
  );
}
