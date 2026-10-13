"use client";
import { useRef, useState } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { initials } from "@/features/portfolio/index/public";
import { useContacts } from "./queries";
import type { ProspectContact } from "./contracts";
import { ContactEditor } from "./ContactEditor";
import styles from "./contacts.module.css";
export function ProspectContacts({ prospectId }: { prospectId: string }) {
  const query = useContacts(prospectId);
  const identity = useIdentity();
  const [editor, setEditor] = useState<{
    prospectId: string;
    contact?: ProspectContact;
  } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const section = useRef<HTMLElement>(null);
  const current = query.isSuccess && !query.error ? query.data : undefined;
  const available = current !== undefined && current !== null;
  const roleAllowed =
    identity.isSuccess &&
    !identity.error &&
    ["standard_user", "user_admin", "capiro_admin"].includes(
      identity.data?.role ?? "",
    );
  const editable = roleAllowed && available && !current.readOnly;
  const editorAvailable =
    available &&
    (!editor?.contact ||
      current.contacts.some((contact) => contact.id === editor.contact?.id));
  function open(button: HTMLButtonElement, contact?: ProspectContact) {
    if (!available) return;
    trigger.current = button;
    setEditor({ prospectId, contact });
  }
  return (
    <section
      ref={section}
      className={styles.card}
      aria-label="Prospect contacts"
      tabIndex={-1}
    >
      <header className={styles.header}>
        <h2>Contacts</h2>
        <button
          className={`button ${styles.add}`}
          disabled={!editable}
          onClick={(event) => open(event.currentTarget)}
        >
          + Add
        </button>
      </header>
      <div className={styles.states}>
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {current === null && (
          <p role="status" className="muted">
            Prospect contacts are unavailable for this account or service. No
            contact changes can be saved.
          </p>
        )}
        {current && !current.contacts.length && (
          <p className="muted">No contacts yet.</p>
        )}
        {current?.readOnly && (
          <p className="muted">
            Archived or converted prospect · contacts are read-only.
          </p>
        )}
        <QueryState error={identity.error} />
      </div>
      {current?.contacts.map((contact) => (
        <button
          key={contact.id}
          className={styles.contact}
          onClick={(event) => open(event.currentTarget, contact)}
        >
          <span className={styles.avatar}>{initials(contact.name)}</span>
          <span className={styles.summary}>
            <strong>{contact.name}</strong>
            <small>{contact.title ?? "No title"}</small>
          </span>
        </button>
      ))}
      {editor?.prospectId === prospectId && (
        <ContactEditor
          key={`${prospectId}:${editor.contact?.id ?? "new"}`}
          prospectId={prospectId}
          contact={editor.contact}
          available={editorAvailable}
          readOnly={!editable}
          onClose={() =>
            setEditor((active) => (active === editor ? null : active))
          }
          returnFocus={() => {
            const button = trigger.current;
            if (button?.isConnected) button.focus();
            else section.current?.focus();
          }}
        />
      )}
    </section>
  );
}
