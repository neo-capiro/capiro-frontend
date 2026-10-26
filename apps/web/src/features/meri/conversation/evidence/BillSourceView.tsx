"use client";
import { useCallback, useId } from "react";
import type {
  NativeBillTextSourceEvent,
  BillTextSourceReadResponse,
} from "@capiro/meri-contracts/conversation-sources";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { SourceReadState, savedTime } from "./SourceReadState";
import { StatusPill } from "../../ui/StatusPill";
import { LinkAction } from "../../ui/LinkAction";
import { DesignIcon } from "../../../../shared/shell/DesignIcon";
import { useCurrentRead } from "./useCurrentRead";
import surfaces from "../../ui/surfaces.module.css";
import panel from "../../ui/panel.module.css";
import phone from "../../ui/phone-fields.module.css";
import styles from "./evidence.module.css";

function sourceFields({
  event,
  current,
}: BillTextSourceReadResponse): FieldRow[] {
  const { source, page } = event.data;
  return [
    { label: "Bill", value: source.billId },
    { label: "Version", value: source.versionCode },
    { label: "Revision", value: source.revisionId },
    { label: "Saved reference", value: savedTime(event.createdAt) },
    { label: "Fetched", value: savedTime(current.fetchedAt) },
    ...(current.publishedAt
      ? [{ label: "Published", value: savedTime(current.publishedAt) }]
      : []),
    ...(current.sourceModifiedAt
      ? [
          {
            label: "Source modified",
            value: savedTime(current.sourceModifiedAt),
          },
        ]
      : []),
    {
      label: "Saved page",
      value: `UTF-16 text offsets ${page.offset}–${page.endOffset} of ${page.totalCharacters} (end exclusive)`,
    },
    {
      label: "Coverage",
      value: page.contentComplete ? "Complete bill text" : "Partial bill text",
    },
  ];
}

function BillSourceDetail({ value }: { value: BillTextSourceReadResponse }) {
  const titleId = useId();
  return (
    <section className={surfaces.panel} aria-labelledby={titleId}>
      <h2 className={panel.title} id={titleId}>
        Bill text · {value.event.data.source.billId}
      </h2>
      <StatusPill tone="success">Access checked</StatusPill>
      <div className={`${styles.fields} ${phone.stackOnPhone}`}>
        <FieldTable
          caption="Saved bill-text page details"
          fieldLabel="Source field"
          rows={sourceFields(value)}
          shares={[220, 414]}
        />
      </div>
      <h3 className={surfaces.sectionTitle}>Bill text — saved page</h3>
      <p className={styles.text}>{value.current.text}</p>
      {value.current.linkStatus === "available" &&
      value.current.sourceLocator ? (
        <LinkAction
          href={value.current.sourceLocator}
          variant="outline"
          unavailable="Source link unavailable"
        >
          <DesignIcon name="external" assetSet="cited-answer" />
          Open source
        </LinkAction>
      ) : (
        <p className={surfaces.caption}>Source link unavailable</p>
      )}
      <p className={surfaces.caption}>
        This shows the saved bill-text page after a current access check. It
        does not show how the source was used in the answer.
      </p>
    </section>
  );
}

export function BillSourceView({
  event,
  reads,
}: {
  event: NativeBillTextSourceEvent;
  reads: ConversationReads;
}) {
  const read = useCallback(
    (signal: AbortSignal) =>
      reads.source(event.binding.runId, event.eventId, signal),
    [reads, event.binding.runId, event.eventId],
  );
  const result = useCurrentRead(event.eventId, read);
  if (result.value) return <BillSourceDetail value={result.value} />;
  return <SourceReadState {...result} title="Bill text" page="bill-text" />;
}
