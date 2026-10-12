"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { FundingRecord } from "../../../shared/capiro/operations/intelligence-funding";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  PageHeader,
  Panel,
  StatusPanel,
  Tabs,
} from "../../../shared/module-ui";
import styles from "./intelligence.module.css";
export function FundingDetail({
  record,
  clientId,
  onBack,
}: {
  record: FundingRecord;
  clientId?: string;
  onBack: () => void;
}) {
  const api = useCapiro();
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("intelligence.funding.detail", {
    params: { source: record.source, sourceRecordId: record.sourceRecordId },
    query: { mode: clientId ? "matched" : "all", clientId },
  });
  const d = query.data?.opportunity;
  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      const r = await api.request(
        saved ? "intelligence.funding.unsave" : "intelligence.funding.save",
        saved
          ? {
              params: {
                source: record.source,
                sourceRecordId: record.sourceRecordId,
              },
            }
          : {
              params: {
                source: record.source,
                sourceRecordId: record.sourceRecordId,
              },
              body: { status: "saved" },
            },
      );
      setSaved(r.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update bookmark");
    } finally {
      setBusy(false);
    }
  }
  const money =
    d?.value != null
      ? d.value.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : "Not stated by source";
  return (
    <>
      <ActionButton onClick={onBack}>Back to opportunities</ActionButton>
      <PageHeader
        title={record.title}
        eyebrow="Funding Opportunities"
        description={[record.agency, record.source, record.type]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <ActionButton
              primary
              disabled={busy || !d?.capabilities.save.allowed}
              title={d?.capabilities.save.reason}
              onClick={save}
            >
              {saved ? "Remove bookmark" : "Save opportunity"}
            </ActionButton>
            {query.data?.authoritativeSourceUrl &&
              /^https?:\/\//.test(query.data.authoritativeSourceUrl) && (
                <a
                  href={query.data.authoritativeSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open official source ↗
                </a>
              )}
          </>
        }
      />
      {error && <p role="alert">{error}</p>}
      <Tabs
        items={[
          { id: "overview", label: "Overview" },
          { id: "eligibility", label: "Eligibility" },
          { id: "documents", label: "Documents & sources" },
          { id: "response", label: "Response instructions" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {d && (
          <div className={styles.split}>
            <div className={styles.stack}>
              {tab === "overview" && (
                <Panel title="Opportunity overview">
                  <p className={styles.content}>
                    {d.summary || "Summary not provided"}
                  </p>
                  <dl className={styles.details}>
                    {[
                      ["Funding", money],
                      ["Agency", d.agency],
                      ["Geography", d.scope.geography.join(", ")],
                      ["NAICS", d.scope.naicsCodes.join(", ")],
                      ["Set aside", d.scope.setAside],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v || "Not provided"}</dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
              )}
              {tab === "eligibility" && (
                <Panel title="Eligibility">
                  <p className={styles.content}>
                    {d.eligibilityDetail.sourceText ||
                      "Source eligibility text unavailable"}
                  </p>
                  {d.eligibilityDetail.applicantTypes.map((t) => (
                    <div className={styles.row} key={t}>
                      {t}
                    </div>
                  ))}
                  {d.eligibilityDetail.restrictions.map((t) => (
                    <div className={styles.row} key={t}>
                      {t}
                    </div>
                  ))}
                  <p className={styles.content}>
                    {d.eligibilityDetail.clientReason}
                  </p>
                </Panel>
              )}
              {tab === "documents" && (
                <Panel title="Documents and sources">
                  {d.documents.map((doc) => (
                    <div key={doc.key} className={styles.row}>
                      {/^https?:\/\//.test(doc.url) ? (
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          {doc.label}
                        </a>
                      ) : (
                        doc.label
                      )}
                      <span>{doc.documentType}</span>
                    </div>
                  ))}
                  <p className={styles.content}>{d.sourceFacts.provenance}</p>
                </Panel>
              )}
              {tab === "response" && (
                <Panel title="Response instructions">
                  <ol className={styles.content}>
                    {d.responseInstructions.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  <p className={styles.content}>
                    {d.responseInstructions.unavailableReason}
                  </p>
                </Panel>
              )}
            </div>
            <Panel title="Dates and status">
              <dl className={styles.details}>
                <div>
                  <dt>Status</dt>
                  <dd>{d.lifecycle}</dd>
                </div>
                {[
                  ["Posted", d.dates.posted],
                  ["Response deadline", d.dates.responseDeadline],
                  ["Close / archive", d.dates.closeOrArchive],
                ].map(([label, fact]) => {
                  const f = typeof fact === "string" ? null : fact;
                  return (
                    <div key={String(label)}>
                      <dt>{String(label)}</dt>
                      <dd>
                        {f?.value ||
                          f?.sourceRaw ||
                          f?.unavailableReason ||
                          "Not provided"}
                        {f?.timezone && ` · ${f.timezone}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Panel>
          </div>
        )}
      </StatusPanel>
    </>
  );
}
