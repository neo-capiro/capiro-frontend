"use client";
import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import type { FieldRow } from "../../ui/FieldTable";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import phone from "../../ui/phone-fields.module.css";
import { DownloadDialog } from "./DownloadDialog";
import { ReceiptToasts, type ReceiptToast } from "./ReceiptToasts";
import type { DownloadView, Heading } from "./types";
import styles from "./files.module.css";

export type FilingReceiptView = {
  heading: Heading;
  saved: { title: string; detail: string };
  receipt: readonly FieldRow[];
  download: DownloadView;
  toasts: readonly ReceiptToast[];
};
type ReceiptRow = FieldRow & { id: string };

const columns: readonly DataColumn<ReceiptRow>[] = [
  { key: "field", label: "Receipt field", width: 300, render: (r) => r.label },
  {
    key: "value",
    label: "Recorded value",
    width: 804,
    render: (row) => row.value,
  },
];

/** 04.07 Filing and download receipts: the recorded filing, its exact version and the recorded download. */
export function FilingReceiptScreen({
  view,
  links,
  unavailable,
}: {
  view: FilingReceiptView;
  links: { artifact?: string; approval?: string };
  unavailable: string;
}) {
  const [downloading, setDownloading] = useState(false);
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <Notice tone="success" title={view.saved.title}>
        {view.saved.detail}
      </Notice>
      <section className={styles.panel} aria-label="Filing receipt">
        <div className={`${styles.full} ${phone.stackOnPhone}`}>
          <DataTable
            caption="Filing receipt"
            columns={columns}
            rows={view.receipt.map((row) => ({ ...row, id: row.label }))}
          />
        </div>
        <div className={ui.row} role="group" aria-label="Receipt actions">
          <LinkAction
            variant="primary"
            href={links.artifact}
            unavailable={unavailable}
          >
            <FileText aria-hidden /> Open artifact
          </LinkAction>
          <LinkAction
            variant="outline"
            href={links.approval}
            unavailable={unavailable}
          >
            View approval
          </LinkAction>
          <button
            type="button"
            className={ui.outline}
            aria-haspopup="dialog"
            onClick={() => setDownloading(true)}
          >
            <ChevronDown aria-hidden /> Download saved version
          </button>
        </div>
      </section>
      <DownloadDialog
        open={downloading}
        onOpenChange={setDownloading}
        view={view.download}
        unavailable={unavailable}
        footer={
          <button
            type="button"
            className={ui.ghost}
            onClick={() => setDownloading(false)}
          >
            Back to receipt
          </button>
        }
      />
      <ReceiptToasts
        toasts={view.toasts}
        artifactHref={links.artifact}
        unavailable={unavailable}
      />
    </div>
  );
}
