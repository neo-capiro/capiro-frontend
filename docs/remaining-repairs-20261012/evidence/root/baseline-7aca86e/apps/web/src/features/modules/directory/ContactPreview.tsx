"use client";
import { useState } from "react";
import type { DirectoryContact } from "../../../shared/capiro/operations/directory-schemas";
import { ActionButton, Panel } from "../../../shared/module-ui";
import styles from "./directory.module.css";
export function ContactPreview({
  contact,
  onOpen,
}: {
  contact: DirectoryContact;
  onOpen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Panel
      title={contact.fullName}
      description={[
        contact.party,
        contact.state,
        contact.district,
        contact.chamber,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      <dl className={styles.details}>
        {[
          ["Committees", contact.committees?.join(", ")],
          ["Focus", contact.focusAreas?.join(", ")],
          ["Phone", contact.phone],
          ["Email", contact.email],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "Not provided"}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>
        <ActionButton primary onClick={onOpen}>
          Open profile
        </ActionButton>
        <ActionButton
          disabled={!contact.email}
          onClick={() => {
            navigator.clipboard
              .writeText(contact.email || "")
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? "Copied" : "Copy email"}
        </ActionButton>
        <ActionButton
          disabled
          title="Client association requires a reviewed relationship contract."
        >
          Add to client
        </ActionButton>
      </div>
    </Panel>
  );
}
