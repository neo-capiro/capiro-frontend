import { useState } from "react";
import type {
  ResearchDashboardWidget,
  ResearchShareDashboard,
} from "../../../../shared/capiro/operations/research-share-schemas";
import { ActionButton, Badge, DataTable } from "../../../../shared/module-ui";
import { SourceEvidence, contributionSources } from "./SourceEvidence";
import styles from "./share.module.css";

/**
 * Widget renderers shared by the designer preview and the recipient page, so
 * what the author arranges is exactly what the recipient opens.
 */
type Total = ResearchShareDashboard["data"]["totals"][number];

export function unitLabel(unit: string): string {
  switch (unit) {
    case "usd_millions":
      return "USD M";
    case "usd_millions_per_unit":
      return "USD M / unit";
    case "units":
      return "units";
    default:
      return unit;
  }
}
export function formatTotal(total: Total): string {
  return `${total.value} ${unitLabel(total.basis.unit)}`;
}
export function basisLabel(basis: Total["basis"]): string {
  return [
    `FY${basis.fundingFiscalYear}`,
    basis.stage,
    basis.metric.replaceAll("_", " "),
    `${basis.currency} · ${unitLabel(basis.unit)}`,
    `price basis ${basis.priceBasis ?? "unspecified"}`,
    `request ${basis.requestEdition ?? "unspecified"}`,
    `known at ${basis.knownAt ?? "unspecified"}`,
  ].join(" · ");
}
function basisKey(basis: Total["basis"]): string {
  return JSON.stringify([
    basis.fundingFiscalYear,
    basis.stage,
    basis.metric,
    basis.unit,
    basis.currency,
    basis.priceBasis,
    basis.requestEdition,
    basis.knownAt,
  ]);
}
function text(
  settings: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}
function limit(settings: Record<string, unknown>, fallback: number): number {
  const value = Number(settings.limit);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 200) : fallback;
}
function date(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Header({
  widget,
  dashboard,
  logoUrl,
}: {
  widget: ResearchDashboardWidget;
  dashboard: ResearchShareDashboard;
  logoUrl?: string | null;
}) {
  return (
    <div className={styles.header}>
      <div>
        {logoUrl && dashboard.branding && (
          <img
            className={styles.logo}
            src={logoUrl}
            alt={`${dashboard.branding.firmName} logo`}
          />
        )}
        <p className={styles.eyebrow}>
          {dashboard.branding
            ? `${dashboard.branding.firmName} · Research Portfolio`
            : "Research Portfolio"}
        </p>
        <h1 className={styles.title}>
          {text(widget.settings, "title") ?? dashboard.portfolioName}
        </h1>
        <p className={styles.description}>
          {text(widget.settings, "subtitle") ??
            `Prepared for ${dashboard.preparedFor.clientName}`}
        </p>
      </div>
      <p className={styles.muted}>As of {date(dashboard.asOf)}</p>
    </div>
  );
}

function KeyTotals({ dashboard }: { dashboard: ResearchShareDashboard }) {
  const totals = dashboard.data.totals;
  if (!totals.length)
    return <Empty>No compatible totals are available for this snapshot.</Empty>;
  return (
    <div className={styles.metrics}>
      {totals.map((total) => (
        <div key={basisKey(total.basis)} className={styles.metric}>
          <span>{basisLabel(total.basis)}</span>
          <details>
            <summary>
              <strong>{formatTotal(total)}</strong>
            </summary>
            <SourceEvidence
              sources={contributionSources(
                dashboard,
                dashboard.data.contributions
                  .filter(
                    (row) =>
                      row.disposition === "included" &&
                      row.basis &&
                      basisKey(row.basis) === basisKey(total.basis),
                  )
                  .flatMap((row) => row.sourceRevisionIds),
              )}
            />
          </details>
          <small className={styles.muted}>
            {total.contributionCount} contribution
            {total.contributionCount === 1 ? "" : "s"}
          </small>
        </div>
      ))}
    </div>
  );
}

function FundingTable({
  widget,
  dashboard,
}: {
  widget: ResearchDashboardWidget;
  dashboard: ResearchShareDashboard;
}) {
  const [expanded, setExpanded] = useState(false);
  const all = dashboard.data.contributions.filter(
    (c) => c.disposition === "included",
  );
  const initialCount = limit(widget.settings, 25);
  const rows = expanded ? all : all.slice(0, initialCount);
  if (!rows.length)
    return (
      <Empty>
        Line items appear once the snapshot has included contributions.
      </Empty>
    );
  return (
    <>
      <DataTable
        rows={rows}
        rowKey={(r) => r.contributionId}
        caption="Funding by subject"
        columns={[
          {
            key: "subject",
            label: "Subject",
            render: (r) => r.label ?? r.targetId,
          },
          {
            key: "kind",
            label: "Kind",
            render: (r) => r.targetKind.replaceAll("_", " "),
          },
          {
            key: "basis",
            label: "Basis",
            render: (r) => (r.basis ? basisLabel(r.basis) : "—"),
          },
          {
            key: "value",
            label: "Value",
            align: "right",
            render: (r) =>
              r.value && r.basis ? (
                <details>
                  <summary>
                    {r.value} {unitLabel(r.basis.unit)}
                  </summary>
                  <SourceEvidence
                    sources={contributionSources(
                      dashboard,
                      r.sourceRevisionIds,
                    )}
                  />
                </details>
              ) : (
                "—"
              ),
          },
        ]}
      />
      {all.length > initialCount && (
        <ActionButton onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer rows" : `Show all ${all.length} rows`}
        </ActionButton>
      )}
    </>
  );
}

function ClientFit({ dashboard }: { dashboard: ResearchShareDashboard }) {
  const fit = dashboard.data.clientFit;
  if (!fit || fit.fitScore == null)
    return <Empty>Fit is not available for this portfolio yet.</Empty>;
  return (
    <div className={styles.fit}>
      <span className={styles.widgetLabel}>
        Fit for {dashboard.preparedFor.clientName}
      </span>
      <div className={styles.fitBar}>
        <progress max={100} value={fit.fitScore} aria-label="Client fit" />
        <strong>{fit.fitScore}%</strong>
      </div>
      {fit.refreshedAt && (
        <small className={styles.muted}>
          Refreshed {date(fit.refreshedAt)}
        </small>
      )}
    </div>
  );
}

function Changes({
  widget,
  dashboard,
}: {
  widget: ResearchDashboardWidget;
  dashboard: ResearchShareDashboard;
}) {
  const rows = dashboard.data.changes.slice(0, limit(widget.settings, 10));
  if (!rows.length)
    return <Empty>No changes to report up to this snapshot.</Empty>;
  return (
    <ul className={styles.list}>
      {rows.map((change) => (
        <li key={change.id} className={styles.listRow}>
          <span>{change.summary}</span>
          <span className={styles.muted}>{date(change.occurredAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function Subjects({ dashboard }: { dashboard: ResearchShareDashboard }) {
  const rows = dashboard.data.subjects;
  if (!rows.length) return <Empty>This portfolio has no subjects yet.</Empty>;
  return (
    <ul className={styles.list}>
      {rows.map((subject) => (
        <li key={subject.id} className={styles.listRow}>
          <span>
            {subject.label ?? subject.targetId}
            <span className={styles.muted}>
              {" "}
              · {subject.targetKind.replaceAll("_", " ")}
            </span>
          </span>
          <Badge
            tone={subject.disposition === "included" ? "success" : "neutral"}
          >
            {subject.disposition.replaceAll("_", " ")}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function Sources({ dashboard }: { dashboard: ResearchShareDashboard }) {
  const count = dashboard.data.sources.length;
  const coverage = dashboard.data.coverage;
  return (
    <div className={styles.metrics}>
      <div className={styles.metric}>
        <span>Source documents</span>
        <strong>{count}</strong>
      </div>
      <div className={styles.metric}>
        <span>Subjects covered</span>
        <strong>
          {coverage.supportedMembers} of {coverage.eligibleMembers}
        </strong>
      </div>
      {dashboard.data.limitations.length > 0 && (
        <p className={`${styles.muted} ${styles.span}`}>
          {dashboard.data.limitations.join(" ")}
        </p>
      )}
      <div className={styles.span}>
        <SourceEvidence sources={dashboard.data.sources} />
      </div>
    </div>
  );
}

function SnapshotComparison({
  dashboard,
}: {
  dashboard: ResearchShareDashboard;
}) {
  const previous = dashboard.data.comparison;
  if (!previous) return <Empty>No earlier snapshot to compare against.</Empty>;
  const before = new Map(previous.totals.map((t) => [basisKey(t.basis), t]));
  return (
    <>
      <p className={styles.muted}>
        Against {previous.snapshotName} ({date(previous.capturedAt)})
      </p>
      <DataTable
        rows={dashboard.data.totals}
        rowKey={(r) => basisKey(r.basis)}
        caption="Totals compared with the previous snapshot"
        columns={[
          { key: "basis", label: "Basis", render: (r) => basisLabel(r.basis) },
          {
            key: "before",
            label: "Previous",
            align: "right",
            render: (r) => {
              const earlier = before.get(basisKey(r.basis));
              return earlier ? formatTotal(earlier) : "—";
            },
          },
          {
            key: "now",
            label: "Now",
            align: "right",
            render: (r) => formatTotal(r),
          },
        ]}
      />
    </>
  );
}

function Commentary({ widget }: { widget: ResearchDashboardWidget }) {
  const body = text(widget.settings, "text");
  return (
    <div className={styles.commentary}>
      {text(widget.settings, "title") && (
        <h2>{text(widget.settings, "title")}</h2>
      )}
      {body ? (
        <p>{body}</p>
      ) : (
        <Empty>Add your commentary in the widget settings.</Empty>
      )}
    </div>
  );
}

function FirmMark({
  widget,
  dashboard,
  logoUrl,
}: {
  widget: ResearchDashboardWidget;
  dashboard: ResearchShareDashboard;
  logoUrl?: string | null;
}) {
  if (!dashboard.branding)
    return <Empty>Shown when branding is on for the link.</Empty>;
  return (
    <div className={styles.firmMark}>
      {logoUrl ? (
        <img
          className={styles.logoLarge}
          src={logoUrl}
          alt={`${dashboard.branding.firmName} logo`}
        />
      ) : (
        <strong>{dashboard.branding.firmName}</strong>
      )}
      {text(widget.settings, "caption") && (
        <span className={styles.muted}>{text(widget.settings, "caption")}</span>
      )}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className={styles.empty}>{children}</p>;
}

export function WidgetContent({
  widget,
  dashboard,
  logoUrl,
}: {
  widget: ResearchDashboardWidget;
  dashboard: ResearchShareDashboard;
  logoUrl?: string | null;
}) {
  switch (widget.kind) {
    case "header":
      return <Header widget={widget} dashboard={dashboard} logoUrl={logoUrl} />;
    case "key_totals":
      return <KeyTotals dashboard={dashboard} />;
    case "funding_table":
      return <FundingTable widget={widget} dashboard={dashboard} />;
    case "client_fit":
      return <ClientFit dashboard={dashboard} />;
    case "changes":
      return <Changes widget={widget} dashboard={dashboard} />;
    case "subjects":
      return <Subjects dashboard={dashboard} />;
    case "sources":
      return <Sources dashboard={dashboard} />;
    case "snapshot_comparison":
      return <SnapshotComparison dashboard={dashboard} />;
    case "commentary":
      return <Commentary widget={widget} />;
    case "image":
      return (
        <FirmMark widget={widget} dashboard={dashboard} logoUrl={logoUrl} />
      );
  }
}
