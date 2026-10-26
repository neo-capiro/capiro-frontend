"use client";
import { useCallback, useId } from "react";
import type {
  NativeBillTextSourceEvent,
  BillTextSourceReadResponse,
} from "@capiro/meri-contracts/conversation-sources";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { StateMessage } from "../../ui/StateMessage";
import { StatusPill } from "../../ui/StatusPill";
import { LinkAction } from "../../ui/LinkAction";
import { DesignIcon } from "../../../../shared/shell/DesignIcon";
import { useCurrentRead } from "./useCurrentRead";
import surfaces from "../../ui/surfaces.module.css";
import panel from "../../ui/panel.module.css";
import phone from "../../ui/phone-fields.module.css";
import ui from "../../ui/meri-ui.module.css";
import styles from "./evidence.module.css";

export const savedTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    timeZone: "UTC",
    timeZoneName: "short",
  });

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

function sourceFailure(code: string) {
  if (code === "SOURCE_REFERENCE_STALE")
    return {
      title: "The saved page has changed",
      detail:
        "The current source no longer matches this saved page. Its text and link are not shown.",
      retry: false,
    };
  if (
    code === "SOURCE_REFERENCE_NOT_FOUND" ||
    code === "NOT_FOUND" ||
    code === "CONVERSATION_NOT_FOUND"
  )
    return {
      title: "Saved source is unavailable",
      detail: "This saved source reference cannot be opened.",
      retry: false,
    };
  if (
    [
      "ACCESS_DENIED",
      "MEMBERSHIP_REVOKED",
      "UNAUTHENTICATED",
      "MEMBERSHIP_CHANGED",
    ].includes(code)
  )
    return {
      title: "Source access is unavailable",
      detail: "You cannot open this source with your current access.",
      retry: false,
    };
  return {
    title: "Bill text is unavailable",
    detail:
      "This saved page could not be checked. This does not mean that the source is absent.",
    retry: true,
  };
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
  if (result.loading)
    return (
      <StateMessage title="Checking source access" status="Loading" announce>
        <p>
          Checking access to this saved bill-text page. Source text is not shown
          until the check completes.
        </p>
      </StateMessage>
    );
  if (result.value) return <BillSourceDetail value={result.value} />;
  const failure = sourceFailure(result.error ?? "UNAVAILABLE");
  return (
    <StateMessage
      title={failure.title}
      status="Unavailable"
      tone="danger"
      announce
      action={
        failure.retry ? (
          <button type="button" className={ui.outline} onClick={result.reload}>
            Try again
          </button>
        ) : undefined
      }
    >
      <p>{failure.detail}</p>
    </StateMessage>
  );
}
