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

export type BrowserSignInView = {
  site: string;
  account: string;
  access: string;
  cancelHref?: string;
  statesHref?: string;
};

/**
 * 07.02 Site connection and sign-in. Meri never collects site credentials: the
 * user completes sign-in in the supported connection flow, outside this app.
 */
export function BrowserSignInScreen({
  view,
  unavailable,
}: {
  view: BrowserSignInView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Connect a supported site"
        description="Site access is specific to your authorized account and this workspace."
      />
      <div className={ui.row}>
        <LinkAction variant="outline" unavailable={unavailable}>
          Permissions &amp; qualification
        </LinkAction>
      </div>
      <InlineDialog
        title="Sign in to the research portal"
        context="Only qualified connections support authenticated browsing."
        closeHref={view.cancelHref}
        unavailable={unavailable}
      >
        <FormField label="Site" value={view.site} />
        <FormField label="Account" value={view.account} />
        <FormField label="Requested access" value={view.access} />
        <div className={panel.full}>
          <Notice tone="warning" title="Secure sign-in handoff">
            Complete sign-in through the supported connection flow. Meri does
            not inherit your desktop browser session.
          </Notice>
        </div>
        <div className={ui.row}>
          <button
            type="button"
            className={ui.primary}
            disabled
            title={unavailable}
          >
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
      </InlineDialog>
      <Panel label="Authentication status" tone="muted" narrow>
        <StatusPill tone="warning">Waiting for sign-in</StatusPill>
        <p className={panel.body}>
          Return here after the account is connected. You can cancel without
          losing the current task.
        </p>
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
