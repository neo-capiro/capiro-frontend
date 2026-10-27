"use client";
import { useState } from "react";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextArea,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchReviewTools({
  portfolio,
  review,
  onReload,
}: {
  portfolio: ResearchDetail;
  review: { id: string; revision: number };
  onReload: () => void;
}) {
  const team = useCapiroQuery("settings.tenantMembers", {});
  const assign = useCapiroMutation("research.reviews.assign");
  const note = useCapiroMutation("research.reviews.note");
  const notes = useCapiroQuery("research.reviews.notes", {
    params: { id: portfolio.id, reviewId: review.id },
  });
  const [assignee, setAssignee] = useState("");
  const [reason, setReason] = useState("");
  const [body, setBody] = useState("");
  const [noteKey, setNoteKey] = useState(() => crypto.randomUUID());
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const canComment = portfolio.lifecycle === "active";
  const busy = assign.pending || note.pending;
  async function saveNote() {
    if (!canComment) return;
    try {
      await note.run({
        params: { id: portfolio.id, reviewId: review.id },
        body: {
          idempotencyKey: noteKey,
          expectedRevision: review.revision,
          body,
        },
      });
      setBody("");
      setNoteKey(crypto.randomUUID());
      notes.reload();
      onReload();
    } catch {
      /* Retain the same note identity. */
    }
  }
  async function assignReview() {
    if (!editable) return;
    try {
      await assign.run({
        params: { id: portfolio.id, reviewId: review.id },
        body: {
          idempotencyKey: crypto.randomUUID(),
          expectedRevision: review.revision,
          expectedPortfolioRevision: portfolio.revision,
          assigneeUserId: assignee || null,
          reason,
        },
      });
      onReload();
    } catch {
      /* Refresh before applying a stale review. */
    }
  }
  const failed = assign.data?.outcomes.find((outcome) =>
    ["failed", "conflict"].includes(outcome.status),
  );
  return (
    <div className={styles.form}>
      <h3>Assignment and review notes</h3>
      <StatusPanel
        error={
          assign.error ||
          note.error ||
          notes.error ||
          team.error ||
          failed?.message
        }
      />
      <label>
        Assign to{" "}
        <select
          disabled={!editable || busy}
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
        >
          <option value="">Unassigned</option>
          {team.data?.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name || member.email}
            </option>
          ))}
        </select>
      </label>
      <Field label="Assignment reason" htmlFor="review-assignment-reason">
        <TextArea
          id="review-assignment-reason"
          disabled={!editable || busy}
          maxLength={4000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <ActionButton
        disabled={!editable || busy || !reason.trim()}
        onClick={() => void assignReview()}
      >
        Save assignment
      </ActionButton>
      <Field label="Review note" htmlFor="review-note">
        <TextArea
          id="review-note"
          disabled={!canComment || busy || Boolean(note.error)}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <ActionButton
        disabled={!canComment || busy || !body.trim()}
        onClick={() => void saveNote()}
      >
        {note.error ? "Check same review note" : "Add review note"}
      </ActionButton>
      {note.data && <p role="status">Note saved: {note.data.body}</p>}
      <h4>Recorded notes</h4>
      <StatusPanel
        loading={notes.loading}
        error={notes.error}
        onRetry={notes.reload}
      />
      {notes.data?.map((item) => (
        <article key={item.id}>
          <p style={{ whiteSpace: "pre-wrap" }}>{item.body}</p>
          <small>
            {new Date(item.createdAt).toLocaleString()} ·{" "}
            {team.data?.find((member) => member.id === item.authorUserId)
              ?.name ?? item.authorUserId}
          </small>
        </article>
      ))}
    </div>
  );
}
