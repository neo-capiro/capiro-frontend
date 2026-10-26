"use client";
import { useId } from "react";
import type { HearingSourceReadResponse } from "@capiro/meri-contracts/conversation-sources";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { StatusPill } from "../../ui/StatusPill";
import { LinkAction } from "../../ui/LinkAction";
import { DesignIcon } from "../../../../shared/shell/DesignIcon";
import { HearingRecordContent } from "./HearingRecordContent";
import { savedTime } from "./SourceReadState";
import surfaces from "../../ui/surfaces.module.css";
import panel from "../../ui/panel.module.css";
import phone from "../../ui/phone-fields.module.css";
import styles from "./evidence.module.css";

const viewNames = {
  published: "Published record",
  briefs: "Published brief",
  reconciliation: "Reconciliation",
};

function hearingFields({
  event,
  current,
}: HearingSourceReadResponse): FieldRow[] {
  const { selection, source, page } = event.data;
  const record = current.result.records[0];
  return [
    { label: "Hearing", value: selection.hearingId },
    { label: "Record", value: selection.recordId },
    { label: "Record type", value: viewNames[selection.recordsView] },
    { label: "Source version", value: source.provenance.contentHash },
    { label: "Saved reference", value: savedTime(event.createdAt) },
    ...(selection.asOf
      ? [{ label: "Historical cutoff", value: savedTime(selection.asOf) }]
      : []),
    ...(record?.occurredAt
      ? [{ label: "Occurred", value: savedTime(record.occurredAt) }]
      : []),
    ...(record?.updatedAt
      ? [{ label: "Source updated", value: savedTime(record.updatedAt) }]
      : []),
    {
      label: "Saved page",
      value: `UTF-16 record JSON offsets ${page.characterStart}–${page.characterEnd} of ${page.totalCharacters} (end exclusive)`,
    },
    {
      label: "Record coverage",
      value: page.contentComplete
        ? "Complete saved record"
        : "Partial saved record",
    },
    { label: "Hearing coverage", value: "Not established by this record" },
  ];
}

export function HearingSourceDetail({
  value,
}: {
  value: HearingSourceReadResponse;
}) {
  const titleId = useId();
  const record = value.current.result.records[0];
  return (
    <section className={surfaces.panel} aria-labelledby={titleId}>
      <h2 className={panel.title} id={titleId}>
        Hearing record · {value.event.data.selection.hearingId}
      </h2>
      <StatusPill tone="success">Access checked</StatusPill>
      <div className={`${styles.fields} ${phone.stackOnPhone}`}>
        <FieldTable
          caption="Saved hearing record details"
          fieldLabel="Source field"
          rows={hearingFields(value)}
          shares={[220, 414]}
        />
      </div>
      {record && <HearingRecordContent payload={record.payload} />}
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
        Media playback is not available for this saved record.
      </p>
      <p className={surfaces.caption}>
        This shows the saved hearing record after a current access check. It
        does not establish complete hearing coverage or how the source was used
        in the answer.
      </p>
    </section>
  );
}
