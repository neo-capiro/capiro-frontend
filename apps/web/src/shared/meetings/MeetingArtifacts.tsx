"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../capiro/CapiroBoundary";
import { useCapiroQuery } from "../capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Panel,
  StatusPanel,
  TextArea,
} from "../module-ui";
import styles from "./meetings.module.css";
type Props = {
  meetingId: string;
  kind: "notes" | "debrief";
  onSaved: () => void;
  onPendingChange: (pending: boolean) => void;
};
type Model = ReturnType<typeof useArtifacts>;
function useArtifacts({ meetingId, kind, onSaved, onPendingChange }: Props) {
  const api = useCapiro();
  const query = useCapiroQuery(
    kind === "notes" ? "engagement.notes" : "engagement.debriefs",
    { params: { id: meetingId } },
  );
  const [edit, setEdit] = useState<string | null>(null),
    [body, setBody] = useState(""),
    [composing, setComposing] = useState(false),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const start = () => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    onPendingChange(true);
    setError(undefined);
    return true;
  };
  const finish = () => {
    pending.current = false;
    setBusy(false);
    onPendingChange(false);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!start()) return;
    try {
      if (kind === "notes") {
        if (edit)
          await api.request("engagement.note.update", {
            params: { id: meetingId, noteId: edit },
            body: { body },
          });
        else
          await api.request("engagement.note.create", {
            params: { id: meetingId },
            body: { body },
          });
      } else {
        if (edit)
          await api.request("engagement.debrief.update", {
            params: { id: meetingId, debriefId: edit },
            body: { body },
          });
        else
          await api.request("engagement.debrief.create", {
            params: { id: meetingId },
            body: { body },
          });
      }
      setBody("");
      setEdit(null);
      setComposing(false);
      query.reload();
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save material.",
      );
    } finally {
      finish();
    }
  };
  const approve = async (id: string) => {
    if (!start()) return;
    try {
      if (kind === "notes")
        await api.request("engagement.note.approve", {
          params: { id: meetingId, noteId: id },
        });
      else
        await api.request("engagement.debrief.approve", {
          params: { id: meetingId, debriefId: id },
        });
      query.reload();
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to approve material.",
      );
    } finally {
      finish();
    }
  };
  return {
    query,
    edit,
    setEdit,
    body,
    setBody,
    composing,
    setComposing,
    error,
    busy,
    save,
    approve,
  };
}
export function MeetingArtifacts(props: Props) {
  const m = useArtifacts(props);
  return (
    <div className={styles.stack}>
      <ArtifactList kind={props.kind} model={m} />
      {m.composing ? (
        <ArtifactComposer kind={props.kind} model={m} />
      ) : (
        <ActionButton
          disabled={m.busy}
          onClick={() => {
            m.setEdit(null);
            m.setBody("");
            m.setComposing(true);
          }}
        >
          + Add {props.kind === "notes" ? "meeting notes" : "debrief"}
        </ActionButton>
      )}
      {m.error && (
        <p role="alert" className={styles.error}>
          {m.error}
        </p>
      )}
    </div>
  );
}
function ArtifactList({
  kind,
  model: m,
}: {
  kind: Props["kind"];
  model: Model;
}) {
  return (
    <StatusPanel
      loading={m.query.loading}
      error={m.query.error}
      onRetry={m.query.reload}
    >
      {m.query.data?.map((artifact) => (
        <Panel
          title={kind === "notes" ? "Meeting Notes" : "Debrief"}
          key={artifact.id}
        >
          <div className={styles.artifact}>
            <Badge>{artifact.status ?? "Draft"}</Badge>
            <p className={styles.body}>
              {artifact.body ?? "This material is restricted."}
            </p>
            <div className={styles.tools}>
              <ActionButton
                disabled={m.busy || artifact.body === null}
                onClick={() => {
                  m.setEdit(artifact.id);
                  m.setBody(artifact.body ?? "");
                  m.setComposing(true);
                }}
              >
                Edit {kind}
              </ActionButton>
              <ActionButton
                primary
                disabled={
                  m.busy ||
                  artifact.body === null ||
                  artifact.status === "approved"
                }
                onClick={() => void m.approve(artifact.id)}
              >
                Approve {kind}
              </ActionButton>
            </div>
          </div>
        </Panel>
      ))}
      {m.query.data?.length === 0 && (
        <p className={styles.muted}>
          No {kind === "notes" ? "meeting notes" : "debrief"} yet.
        </p>
      )}
    </StatusPanel>
  );
}
function ArtifactComposer({
  kind,
  model: m,
}: {
  kind: Props["kind"];
  model: Model;
}) {
  return (
    <form className={styles.stack} onSubmit={(event) => void m.save(event)}>
      <Field
        label={kind === "notes" ? "Meeting notes" : "Debrief"}
        htmlFor="meeting-material"
      >
        <TextArea
          id="meeting-material"
          required
          maxLength={100000}
          value={m.body}
          disabled={m.busy}
          onChange={(event) => m.setBody(event.target.value)}
        />
      </Field>
      <div className={styles.tools}>
        <ActionButton
          type="button"
          disabled={m.busy}
          onClick={() => m.setComposing(false)}
        >
          Cancel
        </ActionButton>
        <ActionButton primary type="submit" disabled={m.busy}>
          Save draft
        </ActionButton>
      </div>
    </form>
  );
}
