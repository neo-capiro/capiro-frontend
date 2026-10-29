"use client";
import { useRef, useState, type ReactNode } from "react";
import { Check, Users } from "lucide-react";
import { Notice } from "../../ui/Notice";
import { DetailRow } from "../../ui/DetailRow";
import { FormField } from "../../ui/FormField";
import ui from "../../ui/meri-ui.module.css";
import styles from "./conversation.module.css";

export type ScopeOption = {
  id: string;
  name: string;
  detail: string;
  dataScope: readonly string[];
};

/** 01.03 "Choose a scope" body (and 01.03A no matches): search, permitted scopes, data scope and the preserved-draft notice. */
export function ScopeChoice({
  options,
  appliedId,
  initialQuery = "",
  onCancel,
  apply,
}: {
  options: readonly ScopeOption[];
  /** Scope currently applied to the conversation; choosing another stays local until applied. */
  appliedId?: string | undefined;
  /** Search text the picker opens with (01.03A shows a search with no permitted match). */
  initialQuery?: string;
  onCancel: () => void;
  /** Renders the primary "Use …" control for the chosen scope; applying stays with the caller. */
  apply: (choice: ScopeOption | undefined) => ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [choiceId, setChoiceId] = useState(appliedId ?? options[0]?.id);
  const search = useRef<HTMLInputElement>(null);
  const choice = options.find((option) => option.id === choiceId);
  const matches = options.filter((option) =>
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
          <div className={`${ui.row} ${styles.scopeActions}`}>
            {cancel}
            {apply(choice)}
          </div>
          <p className={ui.muted}>
            Choose a scope, then use it to apply the change.
          </p>
          <ScopeOptions
            options={matches}
            choiceId={choiceId}
            appliedId={appliedId}
            onChoose={setChoiceId}
          />
          <DataScope items={choice?.dataScope ?? []} />
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
  appliedId,
  onChoose,
}: {
  options: readonly ScopeOption[];
  choiceId: string | undefined;
  appliedId: string | undefined;
  onChoose: (id: string) => void;
}) {
  return (
    <ul className={styles.rowList} aria-label="Permitted scopes">
      {options.map((option) => {
        const chosen = option.id === choiceId;
        const label =
          option.id === appliedId
            ? "Current scope"
            : chosen
              ? "Ready to apply"
              : "Choose";
        return (
          <DetailRow
            key={option.id}
            as="li"
            icon={<Users />}
            title={option.name}
            detail={
              option.id === appliedId
                ? `Current scope · ${option.detail}`
                : chosen
                  ? `Not applied · ${option.detail}`
                  : option.detail
            }
          >
            <button
              type="button"
              className={chosen ? ui.primary : ui.outline}
              aria-pressed={chosen}
              aria-label={`${label} ${option.name}`}
              onClick={() => onChoose(option.id)}
            >
              {label}
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
