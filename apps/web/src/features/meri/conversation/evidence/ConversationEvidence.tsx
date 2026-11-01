"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import type { MeriUploadAccess } from "../../../../shared/meri-uploads/access";
import { isTerminal, type TurnView } from "../conversation-view";
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

/** A tool result is only ever a recorded reference; its outcome is never inferred. */
function toolActivity(tool: TurnView["tools"][number], turn: TurnView) {
  return tool.resultReference
    ? "Result recorded · outcome unavailable"
    : turn.omittedPrefix || turn.incompleteHistory
      ? "Result not in loaded updates"
      : isTerminal(turn.runState)
        ? "No result recorded"
        : "Awaiting result";
}

/** What the browser itself reported. A receipt is an observation; it never states that an effect succeeded
 * beyond the receipt's own outcome field, and it links to nothing it cannot prove. */
function browserReceiptText(event: TurnView["browserReceipts"][number]) {
  const data = event.data;
  if (data.kind === "browser.action")
    return `${data.action} on ${data.urlHost} · ${
      data.outcome === "ok"
        ? "browser reported ok"
        : "browser reported an error"
    }`;
  return `Browser download from ${data.urlHost} · ${data.mimeType}${
    data.bytes === null ? "" : ` · ${data.bytes} bytes`
  }`;
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
  named,
}: {
  turn: TurnView;
  reads: ConversationReads;
  uploads: MeriUploadAccess;
  label: string;
  /** More than one run has something to show, so each keeps its own heading. */
  named: boolean;
}) {
  const [selection, setSelection] = useState<string>();
  const trigger = useRef<HTMLButtonElement | null>(null);
  return (
    <section className={styles.run} aria-label={`${label} sources and usage`}>
      {named && <h2>{label}</h2>}
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
      {turn.tools.length > 0 && (
        <ul className={styles.tools} aria-label="Tool activity">
          {turn.tools.map((tool) => (
            <li key={tool.requestId}>
              {tool.name ?? "Tool"}
              {" · "}
              {toolActivity(tool, turn)}
            </li>
          ))}
        </ul>
      )}
      {turn.browserReceipts.length > 0 && (
        <ul className={styles.tools} aria-label="Browser activity">
          {turn.browserReceipts.map((event) => (
            <li key={event.eventId}>{browserReceiptText(event)}</li>
          ))}
        </ul>
      )}
      {turn.usageIds.length > 0 && (
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
      )}
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

/** A run earns a place in the details only when it saved a source, ran a tool or recorded usage. */
const hasEvidence = (turn: TurnView) =>
  turn.nativeSources.length > 0 ||
  turn.tools.length > 0 ||
  turn.browserReceipts.length > 0 ||
  turn.usageIds.length > 0;

/**
 * Native sources, tool and browser activity and accounting reads for every turn shown, behind one
 * closed disclosure. They are audit material, not chat content: the transcript never grows a
 * heading for a run that has nothing to show, and legacy references stay with their answer.
 */
export function ConversationEvidence({
  reads,
  uploads,
  turn,
  earlier,
  children,
}: {
  reads: ConversationReads;
  uploads: MeriUploadAccess;
  turn: TurnView | null;
  earlier: readonly TurnView[];
  /** Further per-conversation details that belong behind the same disclosure. */
  children?: ReactNode;
}) {
  const runs = [
    ...earlier.map((saved, index) => ({
      turn: saved,
      label: `Earlier run ${index + 1}`,
    })),
    ...(turn ? [{ turn, label: "Current run" }] : []),
  ].filter((run) => hasEvidence(run.turn));
  if (runs.length === 0 && !children) return null;
  return (
    <details className={styles.evidence}>
      <summary>Sources &amp; usage</summary>
      {runs.map((run) => (
        <RunEvidence
          key={run.turn.runId}
          turn={run.turn}
          reads={reads}
          uploads={uploads}
          label={run.label}
          named={runs.length > 1}
        />
      ))}
      {children}
    </details>
  );
}
