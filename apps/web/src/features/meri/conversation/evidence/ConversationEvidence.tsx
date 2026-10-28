"use client";
import { useEffect, useRef, useState } from "react";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import type { MeriUploadAccess } from "../../../../shared/meri-uploads/access";
import type { TurnView } from "../conversation-view";
import { SourceCard } from "../../ui/SourceCard";
import { BillSourceView } from "./BillSourceView";
import { savedTime } from "./SourceReadState";
import { HearingSourceView } from "./HearingSourceView";
import { RecordedUsageView } from "./RecordedUsageView";
import { savedUploadSource } from "./upload-source";
import { UploadSourceView } from "./UploadSourceView";
import ui from "../../ui/meri-ui.module.css";
import styles from "./evidence.module.css";

/** Every public native source kind, and what this surface calls it. */
const sourceLabels = {
  "source.native-bill-text": { lower: "bill text", title: "Bill text" },
  "source.native-hearing-record": {
    lower: "hearing record",
    title: "Hearing record",
  },
  "source.native-upload": { lower: "uploaded file", title: "Uploaded file" },
} as const;

function savedSource(event: TurnView["nativeSources"][number]) {
  const saved = `Saved ${savedTime(event.createdAt)}`;
  if (event.type === "source.native-upload")
    // Metadata only: the saved upload states no extracted text, and none is shown.
    return savedUploadSource(event, saved);
  return event.type === "source.native-hearing-record"
    ? {
        id: event.eventId,
        title: `Hearing record · ${event.data.selection.hearingId}`,
        meta: `${event.data.selection.recordId} · ${saved}`,
        summary: event.data.page.contentComplete
          ? "Saved complete record · hearing coverage not established"
          : "Saved record fragment · not a complete claims collection",
      }
    : {
        id: event.eventId,
        title: `Bill text · ${event.data.source.billId}`,
        meta: `Version ${event.data.source.versionCode} · ${saved}`,
        summary: event.data.page.contentComplete
          ? "Saved complete bill text"
          : "Saved partial bill text",
      };
}

function SelectedRead({
  selection,
  turn,
  reads,
  uploads,
  onClose,
}: {
  selection: string;
  turn: TurnView;
  reads: ConversationReads;
  uploads: MeriUploadAccess;
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
  const label = source ? sourceLabels[source.type] : undefined;
  return (
    <section
      ref={focus}
      tabIndex={-1}
      className={styles.selected}
      aria-label={label ? `${label.title} viewer` : "Run usage viewer"}
    >
      <button type="button" className={ui.outline} onClick={onClose}>
        Close {label ? label.lower : "recorded usage"}
      </button>
      {source?.type === "source.native-hearing-record" ? (
        <HearingSourceView event={source} reads={reads} />
      ) : source?.type === "source.native-upload" ? (
        <UploadSourceView event={source} uploads={uploads} />
      ) : source ? (
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
  uploads,
  label,
}: {
  turn: TurnView;
  reads: ConversationReads;
  uploads: MeriUploadAccess;
  label: string;
}) {
  const [selection, setSelection] = useState<string>();
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <section className={styles.run} aria-label={`${label} sources and usage`}>
      <h2>{label}</h2>
      {turn.nativeSources.length > 0 && (
        <>
          <h3>
            {turn.nativeSources.every(
              (event) => event.type === "source.native-bill-text",
            )
              ? "Saved bill-text pages"
              : turn.nativeSources.every(
                    (event) => event.type === "source.native-upload",
                  )
                ? "Saved uploaded files"
                : "Saved source pages"}
          </h3>
          <p>
            Open a saved page to check current access. Saved references do not
            establish how a source was used in the answer.
          </p>
          <ul className={styles.sources}>
            {turn.nativeSources.map((event) => (
              <li key={event.eventId}>
                <SourceCard
                  source={savedSource(event)}
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
                      {event.type === "source.native-upload"
                        ? "Open saved file"
                        : "Open saved page"}
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
          uploads={uploads}
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
  uploads,
  turn,
  earlier,
}: {
  reads: ConversationReads;
  uploads: MeriUploadAccess;
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
          uploads={uploads}
          label={`Earlier run ${index + 1}`}
        />
      ))}
      {turn && (
        <RunEvidence
          key={turn.runId}
          turn={turn}
          reads={reads}
          uploads={uploads}
          label="Current run"
        />
      )}
    </section>
  );
}
