"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@capiro/ui/dialog";
import { MotionSurface } from "@capiro/ui/motion";
import type { Objective } from "../contracts";
import { useObjectiveAssociation } from "./useObjectiveAssociation";
import { AssociationSourcePicker } from "./AssociationSourcePicker";
import { AssociationInventory } from "./AssociationInventory";
import { AssociationReview } from "./AssociationReview";
import styles from "./association.module.css";

function AssociationEditor({
  author,
  objective,
  refresh,
}: {
  author: ReturnType<typeof useObjectiveAssociation>;
  objective: Objective;
  refresh: number;
}) {
  const value = author.pending ?? author.review;
  const disabled = !author.ready || author.busy || Boolean(value);
  return (
    <>
      {author.error && (
        <p role="alert" className={styles.error}>
          {author.error.message}
        </p>
      )}
      {!author.ready && (
        <div role="status">
          <p>Saved review is not ready.</p>
          <button
            className="button"
            disabled={author.busy}
            onClick={author.recover}
          >
            Load saved review
          </button>
        </div>
      )}
      {value ? (
        <AssociationReview
          value={value}
          pending={Boolean(author.pending)}
          busy={author.busy}
          submit={author.submit}
          discard={author.discardReview}
          recover={author.recover}
          acknowledge={author.acknowledge}
        />
      ) : (
        <AssociationSourcePicker
          key={`source:${author.key}`}
          clientId={objective.clientId}
          disabled={disabled}
          onReview={author.reviewAction}
        />
      )}
      <AssociationInventory
        key={`inventory:${author.key}:${refresh}`}
        objective={objective}
        enabled={author.ready}
        disabled={disabled}
        onUnlink={(item) =>
          author.reviewAction({
            action: "unlink",
            provenance: {
              kind: "manual",
              associationId: item.associationId,
              linkedRevision: item.linkedRevision,
              linkedAt: item.linkedAt,
              via: item.resource.selection,
            },
          })
        }
      />
    </>
  );
}

export function ObjectiveAssociationDialog({
  objective,
  onClose,
  onRefresh,
  onReturnFocus,
}: {
  objective: Objective;
  onClose: () => void;
  onRefresh: () => void;
  onReturnFocus: () => void;
}) {
  const [refresh, setRefresh] = useState(0);
  const author = useObjectiveAssociation(objective, () => {
    setRefresh((value) => value + 1);
    onRefresh();
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !author.busy) onClose();
      }}
    >
      <DialogContent
        className={styles.dialog}
        showCloseButton={!author.busy}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onReturnFocus();
        }}
        onEscapeKeyDown={(event) => {
          if (author.busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (author.busy) event.preventDefault();
        }}
      >
        <MotionSurface className={styles.content}>
          <DialogHeader>
            <DialogTitle>Manage Objective links</DialogTitle>
            <DialogDescription>
              Choose existing work to link to this Objective, or review a link
              to remove.
            </DialogDescription>
          </DialogHeader>
          <AssociationEditor
            author={author}
            objective={objective}
            refresh={refresh}
          />
        </MotionSurface>
      </DialogContent>
    </Dialog>
  );
}
