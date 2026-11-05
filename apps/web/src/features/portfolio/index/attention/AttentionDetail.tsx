import Link from "next/link";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { PortfolioAlert } from "./contracts";
import {
  alertCategory,
  alertClientHref,
  alertSourceHref,
  alertSourceReference,
} from "./model";

const fieldLabels: Readonly<Record<string, string>> = {
  issueId: "Issue association",
  whoActs: "Action owner",
  whatChanged: "What changed",
  whyItMatters: "Why it matters",
};

export function AttentionDetail({
  alert,
  onClose,
}: {
  alert?: PortfolioAlert;
  onClose: () => void;
}) {
  const sourceHref = alert ? alertSourceHref(alert) : undefined;
  return (
    <Dialog
      open
      title={alert?.title || "Alert unavailable"}
      description="Recorded source evidence, not a verified action assignment."
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {alert ? (
        <div className="stack">
          <p>{alert.subtitle || "Source description not supplied."}</p>
          <dl className="stack">
            <div>
              <dt>Client</dt>
              <dd>{alert.clientName}</dd>
            </div>
            <div>
              <dt>Source type</dt>
              <dd>{alertCategory(alert.type)}</dd>
            </div>
            <div>
              <dt>Source record</dt>
              <dd style={{ overflowWrap: "anywhere" }}>
                {alertSourceReference(alert)}
              </dd>
            </div>
            <div>
              <dt>Source timestamp</dt>
              <dd>
                <time dateTime={alert.when}>{alert.when}</time>
              </dd>
            </div>
          </dl>
          {alert.canonicalMissingFields?.length ? (
            <p className="status">
              Not supplied:{" "}
              {alert.canonicalMissingFields
                .map((field) => fieldLabels[field] ?? field)
                .join(", ")}
              . These details have not been inferred.
            </p>
          ) : alert.canonicalComplete !== true ? (
            <p className="status">
              Source completeness has not been confirmed.
            </p>
          ) : null}
          <div className="row">
            {sourceHref ? (
              <Link className="button" href={sourceHref}>
                Open source bill
              </Link>
            ) : (
              <p className="muted">
                A verified source-record destination is not available for this
                alert.
              </p>
            )}
            <Link className="button" href={alertClientHref(alert.clientId)}>
              Open client profile
            </Link>
          </div>
        </div>
      ) : (
        <p className="status">
          This alert is not in the current authorized feed. Refresh the feed or
          choose another alert; no cached or inaccessible record is shown.
        </p>
      )}
    </Dialog>
  );
}
