"use client";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { statusLabels, type Objective } from "./contracts";
import { ObjectiveFields } from "./ObjectiveFields";
import { ObjectiveReadiness } from "./ObjectiveReadiness";
import {
  ObjectiveEditorActions,
  ObjectiveEditorFeedback,
  ObjectiveReadyConfirmation,
} from "./ObjectiveEditorControls";
import { useObjectiveEditorSession } from "./useObjectiveEditorSession";
import { ObjectiveOutreach } from "./ObjectiveOutreach";
import { ObjectiveWorkDestinations } from "./ObjectiveWorkDestinations";
import { ObjectiveGeneration } from "./ObjectiveGeneration";

export function ObjectiveEditor({
  clientId,
  objective,
  open,
  onOpenChange,
}: {
  clientId: string;
  objective?: Objective;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const session = useObjectiveEditorSession({
    clientId,
    objective,
    open,
    onSaved: () => onOpenChange(false),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!session.mutation.isPending) onOpenChange(value);
      }}
      title="Edit objective"
      description="Define the outcome and the government action that would make a meaningful win."
      drawer
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          session.submit("save");
        }}
      >
        <div className="row">
          <span className="chip">
            {session.record ? statusLabels[session.record.status] : "Draft"}
          </span>
          <small>Four required fields before review or ready.</small>
        </div>
        <ObjectiveFields
          fields={session.fields}
          onChange={session.setFields}
          disabled={session.mutation.isPending}
          presentation="dialog"
        />
        <ObjectiveReadiness fields={session.fields} />
        <ObjectiveEditorFeedback session={session} />
        <ObjectiveEditorActions session={session} />
      </form>
      {open && session.record && (
        <ObjectiveOutreach
          key={`outreach:${session.record.id}:${session.record.version}`}
          objective={session.record}
          disabled={
            session.mutation.isPending ||
            session.draftStatus === "Unsaved changes"
          }
        />
      )}
      {open && session.record && (
        <ObjectiveGeneration
          key={`generation:${session.record.id}:${session.record.version}`}
          objective={session.record}
          disabled={
            !session.mutation.canWrite ||
            session.mutation.isPending ||
            session.draftStatus === "Unsaved changes"
          }
        />
      )}
      {open && session.record && (
        <ObjectiveWorkDestinations
          key={`work:${session.record.id}:${session.record.version}`}
          objective={session.record}
          disabled={
            session.mutation.isPending ||
            session.draftStatus === "Unsaved changes"
          }
        />
      )}
      <ObjectiveReadyConfirmation session={session} />
    </Dialog>
  );
}
