"use client";
import { useState } from "react";
import { FormField } from "../../ui/FormField";
import surfaces from "../../ui/surfaces.module.css";
import type { ProposalContent } from "./proposal-phases";
import styles from "./memory.module.css";

/**
 * The canonical fact beside its proposed replacement, with the proposal's
 * governance. Owner, visibility and reason are local draft input only while the
 * revision is unsubmitted; every other phase shows the recorded values read-only.
 */
export function ProposalContentFields({
  content,
  editable,
}: {
  content: ProposalContent;
  editable: boolean;
}) {
  const [owner, setOwner] = useState(content.owner);
  const [visibility, setVisibility] = useState(content.visibility);
  const [reason, setReason] = useState(content.reason);
  const edit = (set: (value: string) => void) => (editable ? set : undefined);
  return (
    <>
      <div className={styles.pair}>
        <FactCard label="Current approved fact" fact={content.currentFact} />
        <FactCard label="Proposed replacement" fact={content.proposedFact} />
      </div>
      <div className={styles.pair}>
        <FormField label="Owner" value={owner} onChange={edit(setOwner)} />
        <FormField
          label="Visibility"
          value={visibility}
          onChange={edit(setVisibility)}
        />
      </div>
      <div className={surfaces.stretch}>
        <FormField
          label="Reason and evidence"
          value={reason}
          onChange={edit(setReason)}
        />
      </div>
    </>
  );
}

function FactCard({ label, fact }: { label: string; fact: string }) {
  return (
    <div className={`${surfaces.panel} ${styles.fact}`}>
      <h3>{label}</h3>
      <p>{fact}</p>
    </div>
  );
}
