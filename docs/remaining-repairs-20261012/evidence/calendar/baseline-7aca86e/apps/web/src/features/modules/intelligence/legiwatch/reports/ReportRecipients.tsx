"use client";
import { useState } from "react";
import type { z } from "zod";
import {
  contactSchema,
  listSchema,
} from "../../../../../shared/capiro/operations/legiwatch-report-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";

type Contact = z.infer<typeof contactSchema>;
type ContactList = z.infer<typeof listSchema>;
export function ReportRecipients() {
  const query = useCapiroQuery("legiwatch.report.recipients", {}),
    [contact, setContact] = useState<Contact | "new">(),
    [list, setList] = useState<ContactList | "new">();
  return (
    <>
      <div className={styles.actions}>
        <ActionButton primary onClick={() => setContact("new")}>
          Create contact
        </ActionButton>
        <ActionButton onClick={() => setList("new")}>Create list</ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.grid}>
          <section className={styles.card}>
            <h2>Contacts</h2>
            {query.data?.contacts.map((row) => (
              <article className={styles.listItem} key={row.id}>
                <strong>{row.name}</strong>
                <p>{row.email ?? "No email supplied"}</p>
                <div className={styles.actions}>
                  <Badge>{row.verified ? "Verified" : "Unverified"}</Badge>
                  {!row.active && <Badge>Inactive</Badge>}
                  {row.optedOut && <Badge>Opted out</Badge>}
                  <ActionButton onClick={() => setContact(row)}>
                    Edit contact
                  </ActionButton>
                </div>
              </article>
            ))}
          </section>
          <section className={styles.card}>
            <h2>Lists</h2>
            {query.data?.lists.map((row) => (
              <article className={styles.listItem} key={row.id}>
                <strong>{row.name}</strong>
                <p className={styles.description}>
                  {row.contactIds.length} contacts ·{" "}
                  {row.private ? "Private" : "Shared"} ·{" "}
                  {row.active ? "Active" : "Inactive"}
                </p>
                <ActionButton onClick={() => setList(row)}>
                  Edit list
                </ActionButton>
              </article>
            ))}
          </section>
        </div>
      </StatusPanel>
      {contact && (
        <ContactEditor
          row={contact === "new" ? undefined : contact}
          onClose={() => setContact(undefined)}
          onSaved={() => {
            query.reload();
            setContact(undefined);
          }}
        />
      )}
      {list && (
        <ListEditor
          row={list === "new" ? undefined : list}
          contacts={query.data?.contacts ?? []}
          onClose={() => setList(undefined)}
          onSaved={() => {
            query.reload();
            setList(undefined);
          }}
        />
      )}
    </>
  );
}
function ContactEditor({
  row,
  onClose,
  onSaved,
}: {
  row?: Contact;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? ""),
    [email, setEmail] = useState(row?.email ?? ""),
    [verified, setVerified] = useState(row?.verified ?? false),
    [active, setActive] = useState(row?.active ?? true),
    [optedOut, setOptedOut] = useState(row?.optedOut ?? false);
  const create = useCapiroMutation("legiwatch.report.contact.create"),
    update = useCapiroMutation("legiwatch.report.contact.update"),
    pending = create.pending || update.pending;
  async function save() {
    const body = { name, email: email || null, verified, active, optedOut };
    try {
      if (row)
        await update.run({
          params: { id: row.id },
          body: { ...body, expectedVersion: row.version },
        });
      else await create.run({ body });
      onSaved();
    } catch {
      /* Error rendered below. */
    }
  }
  return (
    <Modal
      open
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
      title={row ? "Edit contact" : "Create contact"}
      footer={
        <>
          <ActionButton disabled={pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={pending || !name.trim()}
            onClick={() => void save()}
          >
            Save contact
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        <Field label="Name" htmlFor="report-contact-name">
          <TextInput
            id="report-contact-name"
            value={name}
            maxLength={200}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor="report-contact-email">
          <TextInput
            id="report-contact-email"
            type="email"
            value={email}
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={verified}
            onChange={(event) => setVerified(event.target.checked)}
          />
          I have verified this email destination.
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={optedOut}
            onChange={(event) => setOptedOut(event.target.checked)}
          />
          Opted out of delivery
        </label>
        {(create.error || update.error) && (
          <p role="alert" className={styles.error}>
            {create.error?.message ?? update.error?.message}
          </p>
        )}
      </div>
    </Modal>
  );
}
function ListEditor({
  row,
  contacts,
  onClose,
  onSaved,
}: {
  row?: ContactList;
  contacts: Contact[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? ""),
    [contactIds, setContactIds] = useState(row?.contactIds ?? []),
    [isPrivate, setIsPrivate] = useState(row?.private ?? true),
    [active, setActive] = useState(row?.active ?? true);
  const create = useCapiroMutation("legiwatch.report.list.create"),
    update = useCapiroMutation("legiwatch.report.list.update"),
    pending = create.pending || update.pending;
  async function save() {
    const body = { name, contactIds, private: isPrivate, active };
    try {
      if (row)
        await update.run({
          params: { id: row.id },
          body: { ...body, expectedVersion: row.version },
        });
      else await create.run({ body });
      onSaved();
    } catch {
      /* Error rendered below. */
    }
  }
  return (
    <Modal
      open
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
      title={row ? "Edit list" : "Create list"}
      footer={
        <>
          <ActionButton disabled={pending} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            primary
            disabled={pending || !name.trim()}
            onClick={() => void save()}
          >
            Save list
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        <Field label="List name" htmlFor="report-list-name">
          <TextInput
            id="report-list-name"
            value={name}
            maxLength={200}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
          />
          Private list
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Active
        </label>
        <strong>Contacts</strong>
        {contacts.map((contact) => (
          <label className={styles.check} key={contact.id}>
            <input
              type="checkbox"
              checked={contactIds.includes(contact.id)}
              onChange={(event) =>
                setContactIds((previous) =>
                  event.target.checked
                    ? [...previous, contact.id]
                    : previous.filter((id) => id !== contact.id),
                )
              }
            />
            {contact.name} · {contact.email ?? "No email"}
          </label>
        ))}
        {(create.error || update.error) && (
          <p role="alert" className={styles.error}>
            {create.error?.message ?? update.error?.message}
          </p>
        )}
      </div>
    </Modal>
  );
}
