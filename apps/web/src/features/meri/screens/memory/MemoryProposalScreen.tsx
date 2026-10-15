"use client";
import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { TextField } from "../../ui/TextField";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./memory.module.css";

export type MemoryProposalView = {
  title: string;
  reference: string;
  currentFact: string;
  proposedFact: string;
  owner: string;
  visibility: string;
  reason: string;
};

/**
 * 05.06 Memory update proposal. A proposal never changes canonical memory by
 * itself: it is submitted for an authorized reviewer, so submission stays with
 * the trusted backend and is unavailable in the browser fixture.
 */
export function MemoryProposalScreen({
  view,
  closeHref,
  unavailable,
}: {
  view: MemoryProposalView;
  closeHref?: string | undefined;
  unavailable: string;
}) {
  const [owner, setOwner] = useState(view.owner);
  const [visibility, setVisibility] = useState(view.visibility);
  const [reason, setReason] = useState(view.reason);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Propose a memory update"
        description="Changes are sourced and reviewed before becoming canonical."
      />
      <section
        className={`${surfaces.card} ${styles.proposal}`}
        aria-labelledby="proposal-title"
      >
        <div className={styles.proposalHeading}>
          <h2 id="proposal-title" className={surfaces.statTitle}>
            {view.title}
          </h2>
          {closeHref ? (
            <Link
              className={ui.ghost}
              href={closeHref}
              aria-label="Close proposal"
            >
              <X aria-hidden />
            </Link>
          ) : null}
        </div>
        <p className={`${surfaces.body} ${ui.muted}`}>{view.reference}</p>
        <div className={styles.pair}>
          <FactCard label="Current approved fact" fact={view.currentFact} />
          <FactCard label="Proposed replacement" fact={view.proposedFact} />
        </div>
        <div className={styles.pair}>
          <TextField label="Owner" value={owner} onChange={setOwner} />
          <TextField
            label="Visibility"
            value={visibility}
            onChange={setVisibility}
          />
        </div>
        <div className={surfaces.stretch}>
          <TextField
            label="Reason and evidence"
            value={reason}
            onChange={setReason}
          />
        </div>
        <p className={`${surfaces.small} ${ui.muted}`}>
          This proposal replaces the current fact only after an authorized
          reviewer approves it.
        </p>
        <div className={ui.row}>
          <LinkAction
            variant="outline"
            href={closeHref}
            unavailable={unavailable}
          >
            Cancel
          </LinkAction>
          <button
            type="button"
            className={ui.primary}
            disabled
            title={unavailable}
          >
            Submit for review
          </button>
        </div>
      </section>
    </div>
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
