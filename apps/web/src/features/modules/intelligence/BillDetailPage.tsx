"use client";

import { useCapiroQuery } from "@/shared/capiro/queries";
import { PageHeader, Panel, StatusPanel } from "@/shared/module-ui/layout";

/**
 * A bill link from a generated report is an identifier, not a portfolio client. This
 * renders the existing global factual dossier for that identifier: number, title,
 * canonical status, latest official action and provenance. Nothing client-scoped is
 * requested, and nothing here mutates, tracks or activates a feature.
 */

/** Only an absolute http(s) source may become a link; anything else is plain text. */
function officialSource(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  return parsed.toString();
}

function shown(value: string | null | undefined, fallback: string): string {
  const text = (value ?? "").trim();
  return text ? text : fallback;
}

export function BillDetailPage({ billId }: { billId: string }) {
  const { data, error, loading, reload } = useCapiroQuery(
    "intelligence.bills.dossier",
    { params: { billId } },
    { enabled: Boolean(billId) },
  );
  const source = officialSource(data?.bill.url);

  return (
    <>
      <PageHeader
        eyebrow="Bill 360"
        title={data ? data.bill.num : "Bill detail"}
        description={
          data
            ? undefined
            : "Official bill facts for this identifier, when they are available to your account."
        }
      />
      <StatusPanel
        loading={loading}
        error={error}
        onRetry={reload}
        empty={!loading && !error && !data ? "This bill is unavailable" : undefined}
      >
        {data && (
          <>
            <Panel title={data.bill.title}>
              <dl>
                <dt>Canonical status</dt>
                <dd>{data.bill.statusLabel}</dd>
                <dt>Status as of</dt>
                <dd>{shown(data.bill.statusAt, "Not reported")}</dd>
                <dt>Jurisdiction</dt>
                <dd>
                  {shown(
                    data.bill.jurisdiction,
                    data.bill.isState ? "State" : "Federal",
                  )}
                </dd>
                <dt>Latest official action</dt>
                <dd>{shown(data.latest.text, "No official action recorded")}</dd>
                <dt>Action date</dt>
                <dd>{shown(data.latest.date, "Not reported")}</dd>
                <dt>Official source</dt>
                <dd>
                  {source ? (
                    <a href={source} rel="noreferrer noopener" target="_blank">
                      Open the official record
                    </a>
                  ) : (
                    "No verified source link"
                  )}
                </dd>
              </dl>
            </Panel>
            <Panel title="Provenance">
              <dl>
                <dt>Facts last synced</dt>
                <dd>{shown(data.provenance.lastSyncedAt, "Not reported")}</dd>
                <dt>Source last checked</dt>
                <dd>{shown(data.provenance.sourceCheckedAt, "Not reported")}</dd>
              </dl>
            </Panel>
          </>
        )}
      </StatusPanel>
    </>
  );
}
