"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { downloadText, LegiWatchTabs } from "../components";
import styles from "../legiwatch.module.css";
import { ReportCompose } from "./ReportCompose";

export function ReportRunView({
  runId,
  onBack,
}: {
  runId: string;
  onBack: () => void;
}) {
  const query = useCapiroQuery("legiwatch.report.run", {
      params: { id: runId },
    }),
    [tab, setTab] = useState("report");
  const deliveries = useCapiroQuery(
    "legiwatch.report.deliveries",
    { params: { id: runId } },
    { enabled: tab === "delivery" },
  );
  const row = query.data;
  return (
    <>
      <div className={styles.actions}>
        <ActionButton onClick={onBack}>Reports</ActionButton>
        {row && (
          <>
            <Badge tone={row.complete ? "success" : "warning"}>
              {row.complete
                ? "Frozen run complete"
                : "Source checks incomplete"}
            </Badge>
            <ActionButton
              onClick={() =>
                downloadText(
                  row.rendered.text,
                  `report-${row.id}.txt`,
                  "text/plain;charset=utf-8",
                )
              }
            >
              Export text
            </ActionButton>
            <ActionButton
              onClick={() =>
                downloadText(
                  row.rendered.html,
                  `report-${row.id}.html`,
                  "text/html;charset=utf-8",
                )
              }
            >
              Export HTML
            </ActionButton>
          </>
        )}
      </div>
      <LegiWatchTabs
        value={tab}
        items={[
          { id: "report", label: "Frozen report" },
          { id: "compose", label: "Delivery review" },
          { id: "delivery", label: "Delivery history" },
        ]}
        onChange={setTab}
        label="Frozen report run"
      />
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {row && (
          <>
            {tab === "report" && (
              <section className={styles.card}>
                <h2>Run {row.id.slice(0, 8)}</h2>
                <p className={styles.description}>
                  Definition {row.definitionVersion} · Cutoff {row.cutoff} ·
                  Audience {row.audience}
                  <br />
                  Content hash {row.contentHash}
                </p>
                <pre className={styles.briefText}>{row.rendered.text}</pre>
              </section>
            )}
            {tab === "compose" && (
              <ReportCompose
                run={row}
                onQueued={() => {
                  setTab("delivery");
                  deliveries.reload();
                }}
              />
            )}
            {tab === "delivery" && (
              <StatusPanel
                loading={deliveries.loading}
                error={deliveries.error}
                onRetry={deliveries.reload}
                empty={
                  deliveries.data?.length === 0
                    ? "No approved deliveries for this run."
                    : undefined
                }
              >
                <div className={styles.actions}>
                  <ActionButton onClick={deliveries.reload}>
                    Refresh delivery status
                  </ActionButton>
                </div>
                <div className={styles.list}>
                  {deliveries.data?.map((delivery) => (
                    <section className={styles.card} key={delivery.id}>
                      <h2>
                        Approved{" "}
                        {new Date(delivery.approvedAt).toLocaleString()}
                      </h2>
                      {delivery.recipients.map((recipient) => (
                        <article className={styles.listItem} key={recipient.id}>
                          <div className={styles.row}>
                            <strong>{recipient.recipient.email}</strong>
                            <Badge>
                              {recipient.state === "provider_accepted"
                                ? "Accepted by provider"
                                : recipient.state === "uncertain"
                                  ? "Outcome unconfirmed"
                                  : recipient.state.replaceAll("_", " ")}
                            </Badge>
                          </div>
                          <p className={styles.description}>
                            {recipient.recipient.role.toUpperCase()} ·{" "}
                            {recipient.channel} · {recipient.attempts} attempts
                            {recipient.acceptedAt &&
                              ` · Accepted ${new Date(recipient.acceptedAt).toLocaleString()}`}
                          </p>
                          {recipient.error && (
                            <p className={styles.error}>{recipient.error}</p>
                          )}
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              </StatusPanel>
            )}
          </>
        )}
      </StatusPanel>
    </>
  );
}
