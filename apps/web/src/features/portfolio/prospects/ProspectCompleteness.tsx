"use client";
import type { Prospect } from "./contracts";
import { useContacts } from "./contacts/queries";
import styles from "./prospects.module.css";

export function ProspectCompleteness({
  record,
  onDetails,
  onNext,
}: {
  record: Prospect;
  onDetails: () => void;
  onNext: () => void;
}) {
  const contacts = useContacts(record.id);
  const missingContacts =
    contacts.isSuccess &&
    !contacts.error &&
    contacts.data !== null &&
    !contacts.data.contacts.length;
  if (
    record.description?.trim() &&
    record.nextAction?.trim() &&
    !missingContacts
  )
    return null;
  return (
    <section className="card stack" aria-label="Prospect profile completeness">
      <h2>Complete this profile</h2>
      <p className="muted">These saved details have not been provided.</p>
      {!record.description?.trim() && (
        <button
          className={`button ${styles.compactButton}`}
          onClick={onDetails}
        >
          Add company description
        </button>
      )}
      {!record.nextAction?.trim() && (
        <button className={`button ${styles.compactButton}`} onClick={onNext}>
          Add next step
        </button>
      )}
      {missingContacts && (
        <a href="#prospect-contacts">Add a prospect contact</a>
      )}
    </section>
  );
}
