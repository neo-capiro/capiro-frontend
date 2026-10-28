"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  receiveSkillSelection,
  type ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import styles from "../model-selection/model-selection.module.css";

/**
 * The canonical frozen work member, reached through the shell's selected-input type so this control
 * never restates the contract. `receiveSkillSelection` stays the authority: it admits the definition
 * through the public conversation receiver, which refuses anything outside the canonical schema.
 */
type Work = NonNullable<ConversationSkillSelection["work"]>;
export const WORK_ENTRIES = ["start-work", "delegate"] as const;
export const WORK_JOB_KINDS = [
  "research",
  "deliverable",
  "audit",
  "scheduled",
] as const;
/** The canonical schema's own bounds for both ordered lists. */
export const MAX_WORK_ITEMS = 20;
const MAX_ITEM_LENGTH = 200;
/** The existing Routines surface owns prepare and approval; this control only records the kind. */
const ROUTINES_ROUTE = "/meri/routines";
const entryLabels: Record<Work["entry"], string> = {
  "start-work": "Start work",
  delegate: "Delegate",
};
const jobKindLabels: Record<Work["jobKind"], string> = {
  research: "Research",
  deliverable: "Deliverable",
  audit: "Audit",
  scheduled: "Scheduled routine",
};
const named = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
const text = (values: readonly string[]) => values.join("\n");
const refusalCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";

export const workSelectionLabel = (selection: ConversationSkillSelection) =>
  selection.work
    ? `${entryLabels[selection.work.entry]} · ${jobKindLabels[selection.work.jobKind]}`
    : "None";

/**
 * Start Work / Delegate chooses the work definition for the next message. Work is additive: applying
 * or removing it keeps every other selected input. Apply only retains the choice on the draft; Send
 * stays with the composer's own Send and access is checked when the work starts.
 */
export function WorkSelectionPicker({
  selection,
  disabled,
  onChange,
}: {
  selection: ConversationSkillSelection;
  disabled: boolean;
  onChange: (value: ConversationSkillSelection) => void;
}) {
  const applied = selection.work;
  const [entry, setEntry] = useState<string>(applied?.entry ?? "");
  const [jobKind, setJobKind] = useState<string>(applied?.jobKind ?? "");
  const [deliverables, setDeliverables] = useState(
    text(applied?.deliverables ?? []),
  );
  const [dependencies, setDependencies] = useState(
    text(applied?.dependencies ?? []),
  );
  const [error, setError] = useState<string>();
  const apply = () => {
    if (disabled) return;
    if (!entry) {
      setError("Choose whether to start the work or delegate it.");
      return;
    }
    if (!jobKind) {
      setError("Choose the kind of work.");
      return;
    }
    const deliverables_named = named(deliverables);
    const dependencies_named = named(dependencies);
    if (deliverables_named.length === 0) {
      setError("Name at least one deliverable, one per line.");
      return;
    }
    if (
      [...deliverables_named, ...dependencies_named].some(
        (item) => item.length > MAX_ITEM_LENGTH,
      )
    ) {
      setError(
        `Keep each deliverable and dependency to ${MAX_ITEM_LENGTH} characters or fewer.`,
      );
      return;
    }
    if (
      deliverables_named.length > MAX_WORK_ITEMS ||
      dependencies_named.length > MAX_WORK_ITEMS
    ) {
      setError(`Use at most ${MAX_WORK_ITEMS} deliverables and dependencies.`);
      return;
    }
    if (
      new Set(deliverables_named).size !== deliverables_named.length ||
      new Set(dependencies_named).size !== dependencies_named.length
    ) {
      setError("Remove duplicate deliverables and dependencies.");
      return;
    }
    try {
      onChange(
        receiveSkillSelection({
          ...selection,
          work: {
            entry,
            jobKind,
            deliverables: deliverables_named,
            dependencies: dependencies_named,
          },
        }),
      );
      setError(undefined);
    } catch (failure) {
      setError(
        refusalCode(failure) === "WORK_SELECTION"
          ? `Check the work definition: ${MAX_WORK_ITEMS} items of ${MAX_ITEM_LENGTH} characters at most, no duplicates.`
          : "This build's installed conversation contract does not accept a work selection.",
      );
    }
  };
  const remove = () =>
    onChange(receiveSkillSelection({ ...selection, work: undefined }));
  return (
    <details className={styles.picker}>
      {/* Same composer trigger convention as Skill: the full values stay for assistive technology. */}
      <summary className={styles.trigger}>
        <span className="sr-only">Work for next message: </span>
        <span className={styles.value}>
          Work · {selection.work ? workSelectionLabel(selection) : "None"}
        </span>
        <ChevronDown aria-hidden />
      </summary>
      <p className={styles.help}>
        Start work or delegate it, define the deliverables and dependencies, then
        review your message before Send. Selection is not authority: Meri checks
        access when the work starts.
      </p>
      <label className={styles.field}>
        Entry
        <select
          className={styles.trigger}
          disabled={disabled}
          value={entry}
          onChange={(event) => {
            setEntry(event.target.value);
            setError(undefined);
          }}
        >
          <option value="">No work selected</option>
          {WORK_ENTRIES.map((value) => (
            <option key={value} value={value}>
              {entryLabels[value]}
            </option>
          ))}
        </select>
      </label>
      {entry !== "" && (
        <label className={styles.field}>
          Job kind
          <select
            className={styles.trigger}
            disabled={disabled}
            value={jobKind}
            onChange={(event) => {
              setJobKind(event.target.value);
              setError(undefined);
            }}
          >
            <option value="">Choose the kind</option>
            {WORK_JOB_KINDS.map((value) => (
              <option key={value} value={value}>
                {jobKindLabels[value]}
              </option>
            ))}
          </select>
        </label>
      )}
      {entry !== "" && (
        <>
          <label className={styles.field}>
            Deliverables, one per line
            <textarea
              disabled={disabled}
              rows={3}
              value={deliverables}
              onChange={(event) => {
                setDeliverables(event.target.value);
                setError(undefined);
              }}
              placeholder={"Current bill text\nSponsor summary"}
            />
          </label>
          <label className={styles.field}>
            Dependencies, one per line
            <textarea
              disabled={disabled}
              rows={2}
              value={dependencies}
              onChange={(event) => {
                setDependencies(event.target.value);
                setError(undefined);
              }}
              placeholder="Prior client briefing"
            />
          </label>
        </>
      )}
      {jobKind === "scheduled" && (
        <p className={styles.help}>
          A scheduled routine records this kind only. It creates no schedule, no
          occurrence and no unattended authority; prepare and approve it through{" "}
          <Link href={ROUTINES_ROUTE}>Routines</Link>.
        </p>
      )}
      {applied && (
        <p className={styles.help}>
          Applied work: {entryLabels[applied.entry]} ·{" "}
          {jobKindLabels[applied.jobKind]} ·{" "}
          {applied.deliverables.length === 1
            ? "1 deliverable"
            : `${applied.deliverables.length} deliverables`}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={disabled} onClick={apply}>
        Apply to draft
      </button>
      {applied && (
        <button type="button" disabled={disabled} onClick={remove}>
          Remove work selection
        </button>
      )}
    </details>
  );
}
