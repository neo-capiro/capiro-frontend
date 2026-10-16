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
  /** Search text the picker opens with (01.03A shows a search with no permitted match). */
  initialQuery?: string;
};

/** 01.03 Choose client and data scope (and 01.03A no matches): permitted scopes only; applying needs the trusted service. */
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
  const [query, setQuery] = useState(view.initialQuery ?? "");
  const [choiceId, setChoiceId] = useState(view.appliedId);
  const search = useRef<HTMLInputElement>(null);
  const choice = view.options.find((option) => option.id === choiceId);
  const matches = view.options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const cancel = (
    <button type="button" className={ui.outline} onClick={onCancel}>
      Cancel
    </button>
  );
  return (
    <>
      <FormField
        label="Search clients"
        placeholder="Search by name…"
        autoFocus
        ref={search}
        value={query}
        onChange={setQuery}
      />
      {matches.length ? (
        <>
          <ScopeOptions
            options={matches}
            choiceId={choiceId}
            onChoose={setChoiceId}
          />
          <DataScope items={choice?.dataScope ?? []} />
          <div className={ui.row}>
            {cancel}
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
      ) : (
        <>
          <div role="status">
            <Notice tone="success" title="No matching authorized clients">
              Try a different search. No match does not prove a client is
              absent. Your unsent draft is kept; General workspace remains
              available after you clear the search.
            </Notice>
          </div>
          <div className={ui.row}>
            {cancel}
            <button
              type="button"
              className={ui.primary}
              onClick={() => {
                setQuery("");
                search.current?.focus();
              }}
            >
              Clear search
            </button>
          </div>
        </>
      )}
    </>
  );
}

function ScopeOptions({
  options,
  choiceId,
  onChoose,
}: {
  options: readonly ScopeOption[];
  choiceId: string;
  onChoose: (id: string) => void;
}) {
  return (
    <ul className={styles.rowList} aria-label="Permitted scopes">
      {options.map((option) => {
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
              onClick={() => onChoose(option.id)}
            >
              {chosen ? "Selected" : "Choose"}
            </button>
          </DetailRow>
        );
      })}
    </ul>
  );
}

function DataScope({ items }: { items: readonly string[] }) {
  return (
    <>
      <hr className={styles.divider} />
      <h3 className={styles.sectionTitle}>Data scope</h3>
      <ul className={styles.rowList} aria-label="Included data">
        {items.map((item) => (
          <DetailRow key={item} as="li" icon={<Check />} title={item} />
        ))}
      </ul>
      <Notice tone="success" title="Your draft is preserved">
        Changing clients starts a clean context. The unsent prompt stays
        available.
      </Notice>
    </>
  );
}
