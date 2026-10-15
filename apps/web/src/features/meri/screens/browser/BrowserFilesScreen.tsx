import { ArrowUpRight, FileText, Sparkle } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { LinkAction } from "../../ui/LinkAction";
import { OutcomeToast } from "../../ui/OutcomeToast";
import { Panel } from "../../ui/Panel";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";

export type BrowserFilesView = {
  /** Public (07.03A) and authenticated (07.03) downloads keep separate receipts. */
  description: string;
  fileName: string;
  receipt: readonly FieldRow[];
  /** Overlay · Research account connected: the recorded grant behind an authenticated download. */
  connected?: { title: string; detail: string; status: string };
  browseHref?: string;
  permissionsHref?: string;
};

/** 07.03 and 07.03A Browser files and receipts: downloads become source-linked workspace inputs. */
export function BrowserFilesScreen({
  view,
  unavailable,
}: {
  view: BrowserFilesView;
  unavailable: string;
}) {
  const disabled = { disabled: true, title: unavailable } as const;
  return (
    <div className={ui.page}>
      <MeriPageHeading title="Browser files" description={view.description} />
      <Panel label="Download receipt">
        <StatusPill tone="success">Download complete</StatusPill>
        <h2 className={panel.title}>{view.fileName}</h2>
        <FieldTable
          caption={`${view.fileName} download receipt`}
          fieldLabel="Receipt field"
          rows={view.receipt}
        />
        <div className={ui.row}>
          <button type="button" className={ui.primary} {...disabled}>
            <Sparkle aria-hidden /> Analyze downloaded file
          </button>
          <button type="button" className={ui.outline} {...disabled}>
            <FileText aria-hidden /> Open workspace
          </button>
          <button type="button" className={ui.ghost} {...disabled}>
            <ArrowUpRight aria-hidden /> View original source
          </button>
        </div>
      </Panel>
      <Panel label="Site upload permission" tone="muted">
        <h2 className={panel.subtitle}>
          Uploading to this site is unavailable
        </h2>
        <p className={panel.body}>
          This connection permits reading and downloads. File uploads appear
          only for supported sites with an explicit upload grant and required
          review.
        </p>
        <LinkAction
          variant="outline"
          href={view.permissionsHref}
          unavailable={unavailable}
        >
          View site permissions
        </LinkAction>
      </Panel>
      {view.connected ? (
        <OutcomeToast
          title={view.connected.title}
          detail={view.connected.detail}
          status={view.connected.status}
          tone="success"
          success
          action={
            <LinkAction
              variant="primary"
              href={view.browseHref}
              unavailable={unavailable}
            >
              Continue browsing
            </LinkAction>
          }
        />
      ) : null}
    </div>
  );
}
