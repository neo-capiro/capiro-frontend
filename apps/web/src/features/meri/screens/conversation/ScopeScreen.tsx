"use client";
import { useRef, useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { MeriDialog } from "../../ui/MeriDialog";
import { Notice } from "../../ui/Notice";
import { StatusPill } from "../../ui/StatusPill";
import { DetailRow } from "../../ui/DetailRow";
import { FormField } from "../../ui/FormField";
import ui from "../../ui/meri-ui.module.css";
import styles from "./conversation.module.css";

type ScopeOption = {
  id: string;
  name: string;
  detail: string;
  dataScope: readonly string[];
};
export type ScopeView = {
  options: readonly ScopeOption[];
  /** Scope currently applied to the conversation; choosing another stays local. */
  appliedId: string;
};

/** 01.03 Choose client and data scope: permitted scopes only; applying needs the trusted service. */
export function ScopeScreen({
  view,
  unavailable,
}: {
  view: ScopeView;
  unavailable: string;
}) {
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const applied = view.options.find((option) => option.id === view.appliedId);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="A workspace for your work"
        description="Choose the scope for this conversation."
      />
      {open ? null : (
        <div className={ui.row}>
          <button
            type="button"
            className={ui.outline}
            ref={trigger}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            <ChevronDown aria-hidden /> {applied?.name ?? "Choose a scope"}
          </button>
          <StatusPill>Your authorized data</StatusPill>
        </div>
      )}
      <MeriDialog
        open={open}
        onOpenChange={setOpen}
        returnFocus={trigger}
        title="Choose a scope"
        description="Only clients and sources available to your account appear here."
        width="default"
      >
        <ScopeChoice
          view={view}
          unavailable={unavailable}
          onCancel={() => setOpen(false)}
        />
      </MeriDialog>
    </div>
  );
}

function ScopeChoice({
  view,
  unavailable,
  onCancel,
}: {
  view: ScopeView;
  unavailable: string;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [choiceId, setChoiceId] = useState(view.appliedId);
  const choice = view.options.find((option) => option.id === choiceId);
  const matches = view.options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <FormField
        label="Search clients"
        placeholder="Search by name…"
        autoFocus
        value={query}
        onChange={setQuery}
      />
      <ul className={styles.rowList} aria-label="Permitted scopes">
        {matches.map((option) => {
          const chosen = option.id === choiceId;
          return (
            <DetailRow
              key={option.id}
              as="li"
              icon={<Users />}
              title={option.name}
              detail={chosen ? `Selected · ${option.detail}` : option.detail}
            >
              <button
                type="button"
                className={chosen ? ui.primary : ui.outline}
                aria-pressed={chosen}
                aria-label={`${chosen ? "Selected" : "Choose"} ${option.name}`}
                onClick={() => setChoiceId(option.id)}
              >
                {chosen ? "Selected" : "Choose"}
              </button>
            </DetailRow>
          );
        })}
        {matches.length ? null : (
          <li className={ui.muted}>No permitted client matches “{query}”.</li>
        )}
      </ul>
      <hr className={styles.divider} />
      <h3 className={styles.sectionTitle}>Data scope</h3>
      <ul className={styles.rowList} aria-label="Included data">
        {choice?.dataScope.map((item) => (
          <DetailRow key={item} as="li" icon={<Check />} title={item} />
        ))}
      </ul>
      <Notice tone="success" title="Your draft is preserved">
        Changing clients starts a clean context. The unsent prompt stays
        available.
      </Notice>
      <div className={ui.row}>
        <button type="button" className={ui.outline} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Use {choice?.name ?? "scope"}
        </button>
      </div>
    </>
  );
}
