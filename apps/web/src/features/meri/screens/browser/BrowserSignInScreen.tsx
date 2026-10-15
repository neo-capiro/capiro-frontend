import { ArrowUpRight } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { InlineDialog } from "../../ui/InlineDialog";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { Panel } from "../../ui/Panel";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";

type ConnectionCopy = {
  title: string;
  description: string;
  dialogTitle: string;
  dialogContext: string;
  site: string;
  account: string;
  access: string;
  notice: { title: string; body: string };
  status: string;
  permissionsHref?: string;
  statesHref?: string;
};
/** Before provider sign-in (07.02) and after the provider confirmed the account (07.02A). */
export type BrowserSignInView = ConnectionCopy &
  (
    | { stage: "awaiting"; cancelHref?: string }
    | {
        stage: "connected";
        filesHref?: string;
        receiptHref?: string;
        conversationHref?: string;
      }
  );

function ConnectionActions({
  view,
  unavailable,
}: {
  view: BrowserSignInView;
  unavailable: string;
}) {
  if (view.stage === "connected")
    return (
      <div className={ui.row}>
        <LinkAction
          variant="primary"
          href={view.filesHref}
          unavailable={unavailable}
        >
          <ArrowUpRight aria-hidden /> View browser files
        </LinkAction>
        <LinkAction
          variant="outline"
          href={view.conversationHref}
          unavailable={unavailable}
        >
          Return to conversation
        </LinkAction>
      </div>
    );
  return (
    <div className={ui.row}>
      <button type="button" className={ui.primary} disabled title={unavailable}>
        <ArrowUpRight aria-hidden /> Open secure sign-in
      </button>
      <LinkAction
        variant="outline"
        href={view.cancelHref}
        unavailable={unavailable}
      >
        Cancel
      </LinkAction>
    </div>
  );
}

/**
 * 07.02 Site connection and sign-in, 07.02A Research account connected. Meri never
 * collects site credentials: sign-in happens in the provider's flow, outside this app,
 * and the connected status is read back afterwards.
 */
export function BrowserSignInScreen({
  view,
  unavailable,
}: {
  view: BrowserSignInView;
  unavailable: string;
}) {
  const connected = view.stage === "connected";
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <div className={ui.row}>
        <LinkAction
          variant="outline"
          href={view.permissionsHref}
          unavailable={unavailable}
        >
          Permissions &amp; qualification
        </LinkAction>
        {connected ? (
          <LinkAction
            variant="outline"
            href={view.receiptHref}
            unavailable={unavailable}
          >
            View connection receipt
          </LinkAction>
        ) : null}
      </div>
      <InlineDialog
        title={view.dialogTitle}
        context={view.dialogContext}
        closeHref={connected ? view.conversationHref : view.cancelHref}
        unavailable={unavailable}
      >
        <FormField label="Site" value={view.site} />
        <FormField label="Account" value={view.account} />
        <FormField label="Requested access" value={view.access} />
        <div className={panel.full}>
          <Notice tone="warning" title={view.notice.title}>
            {view.notice.body}
          </Notice>
        </div>
        <ConnectionActions view={view} unavailable={unavailable} />
      </InlineDialog>
      <Panel label="Authentication status" tone="muted" narrow>
        <StatusPill tone={connected ? "success" : "warning"}>
          {connected ? "Connected" : "Waiting for sign-in"}
        </StatusPill>
        <p className={panel.body}>{view.status}</p>
        <LinkAction
          variant="ghost"
          href={view.statesHref}
          unavailable={unavailable}
        >
          View connection states
        </LinkAction>
      </Panel>
    </div>
  );
}
