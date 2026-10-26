"use client";
import { useEffect, useRef, useState } from "react";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import type { TurnView } from "../conversation-view";
import { SourceCard } from "../../ui/SourceCard";
import { BillSourceView, savedTime } from "./BillSourceView";
import { RecordedUsageView } from "./RecordedUsageView";
import ui from "../../ui/meri-ui.module.css";
import styles from "./evidence.module.css";

function SelectedRead({
  selection,
  turn,
  reads,
  onClose,
}: {
  selection: string;
  turn: TurnView;
  reads: ConversationReads;
  onClose: () => void;
}) {
  const focus = useRef<HTMLElement>(null);
  useEffect(() => {
    focus.current?.focus();
  }, []);
  const source = turn.nativeSources.find(
    (event) => event.eventId === selection,
  );
  if (selection !== "usage" && !source) return null;
  return (
    <section
      ref={focus}
      tabIndex={-1}
      className={styles.selected}
      aria-label={source ? "Bill text viewer" : "Run usage viewer"}
    >
      <button type="button" className={ui.outline} onClick={onClose}>
        Close {source ? "bill text" : "recorded usage"}
      </button>
      {source ? (
        <BillSourceView event={source} reads={reads} />
      ) : (
        <RecordedUsageView runId={turn.runId} reads={reads} />
      )}
    </section>
  );
}

function RunEvidence({
  turn,
  reads,
  label,
}: {
  turn: TurnView;
  reads: ConversationReads;
  label: string;
}) {
  const [selection, setSelection] = useState<string>();
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <section className={styles.run} aria-label={`${label} sources and usage`}>
      <h2>{label}</h2>
      {turn.nativeSources.length > 0 && (
        <>
          <h3>Saved bill-text pages</h3>
          <p>
            Open a saved page to check current access. Saved references do not
            establish how a source was used in the answer.
          </p>
          <ul className={styles.sources}>
            {turn.nativeSources.map((event) => (
              <li key={event.eventId}>
                <SourceCard
                  source={{
                    id: event.eventId,
                    title: `Bill text · ${event.data.source.billId}`,
                    meta: `Version ${event.data.source.versionCode} · Saved ${savedTime(event.createdAt)}`,
                    summary: event.data.page.contentComplete
                      ? "Saved complete bill text"
                      : "Saved partial bill text",
                  }}
                  selected={selection === event.eventId}
                  action={
                    <button
                      type="button"
                      className={ui.outline}
                      onClick={(e) => {
                        trigger.current = e.currentTarget;
                        setSelection(event.eventId);
                      }}
                    >
                      Open saved page
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        className={ui.outline}
        onClick={(event) => {
          trigger.current = event.currentTarget;
          setSelection("usage");
        }}
      >
        View recorded usage
      </button>
      {selection && (
        <SelectedRead
          key={selection}
          selection={selection}
          turn={turn}
          reads={reads}
          onClose={() => {
            setSelection(undefined);
            trigger.current?.focus();
          }}
        />
      )}
    </section>
  );
}

/** Native sources and accounting reads stay separate from legacy references and UI tool activity. */
export function ConversationEvidence({
  reads,
  turn,
  earlier,
}: {
  reads: ConversationReads;
  turn: TurnView | null;
  earlier: readonly TurnView[];
}) {
  return (
    <section
      className={styles.evidence}
      aria-label="Sources and recorded usage"
    >
      {earlier.map((saved, index) => (
        <RunEvidence
          key={saved.runId}
          turn={saved}
          reads={reads}
          label={`Earlier run ${index + 1}`}
        />
      ))}
      {turn && (
        <RunEvidence
          key={turn.runId}
          turn={turn}
          reads={reads}
          label="Current run"
        />
      )}
    </section>
  );
}
