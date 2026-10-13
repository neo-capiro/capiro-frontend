"use client";
import { useState } from "react";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useProspectHistory } from "./queries";
import { useProspectNote } from "./mutations";
import { prospectHistoryRows } from "./overview";
import styles from "./prospects.module.css";

export function ProspectNotes({ id }: { id: string }) {
  const history = useProspectHistory(id);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const save = useProspectNote(id, () => {
    setAdding(false);
    setNote("");
  });
  const notes =
    history.isSuccess && !history.error
      ? prospectHistoryRows(history.data, "note")
      : undefined;
  return (
    <section
      className={`card stack ${styles.notesCard}`}
      aria-label="Prospect notes"
    >
      <header className="row between">
        <h2>Notes</h2>
        <button
          className={`button ${styles.compactButton}`}
          onClick={() => setAdding(true)}
        >
          + Add note
        </button>
      </header>
      <small>Shared with your firm.</small>
      <QueryState
        pending={history.isPending}
        error={history.error}
        retry={() => void history.refetch()}
      />
      {notes &&
        (notes.length ? (
          <ul className={styles.notes}>
            {notes.map((item) => (
              <li key={item.id}>{item.body}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No notes yet.</p>
        ))}
      <Dialog
        open={adding}
        title="Add prospect note"
        description="Saved to this firm's prospect history."
        onOpenChange={(open) => {
          if (!save.isPending) setAdding(open);
        }}
      >
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (note.trim() && !save.isPending) save.mutate(note.trim());
          }}
        >
          <TextareaField
            label="Note"
            required
            autoFocus
            maxLength={4000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <QueryState error={save.error} />
          <button
            className="button primary"
            disabled={save.isPending || !note.trim()}
          >
            {save.isPending ? "Saving…" : "Save note"}
          </button>
        </form>
      </Dialog>
    </section>
  );
}
