"use client";

import type { Personnel } from "../../../shared/capiro/operations/directory-schemas";
import { ActionButton } from "../../../shared/module-ui";
import styles from "./directory.module.css";

export function PersonnelPreview({
  person,
  onOpen,
}: {
  person?: Personnel;
  onOpen: () => void;
}) {
  if (!person)
    return (
      <aside className={styles.personnelPreview} aria-label="Selected profile">
        <p className={styles.personnelPreviewEyebrow}>
          Department of War directory
        </p>
        <h2 className={styles.personnelPreviewName}>Select a person</h2>
        <p className={styles.muted}>
          Choose a current result to preview its recorded details.
        </p>
      </aside>
    );

  const programElements = [person.pePrimary, ...person.peSecondary]
    .filter(Boolean)
    .join(", ");
  const fields = [
    ["Role", person.role || person.title],
    ["Organization", person.organization],
    ["Alignment", programElements],
    ["Confidence", String(person.confidence)],
    [
      "Source",
      `${person.sourceCount} recorded source${person.sourceCount === 1 ? "" : "s"}`,
    ],
  ];

  return (
    <aside className={styles.personnelPreview} aria-label="Selected profile">
      <p className={styles.personnelPreviewEyebrow}>
        Department of War directory
      </p>
      <h2 className={styles.personnelPreviewName}>{person.fullName}</h2>
      <div className={styles.personnelPreviewCard}>
        <h3>Profile details</h3>
        <dl className={styles.personnelPreviewDetails}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ActionButton
        primary
        className={styles.personnelPreviewOpen}
        onClick={onOpen}
      >
        Open profile
      </ActionButton>
    </aside>
  );
}
