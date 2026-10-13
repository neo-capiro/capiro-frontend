"use client";
import { useState } from "react";
import type { LegiWatchReport } from "../../../../../shared/capiro/operations/legiwatch-report-schemas";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../../shared/module-ui";
import { LegiWatchTabs } from "../components";
import styles from "../legiwatch.module.css";
import { ReportEditor } from "./ReportEditor";
import { ReportHistory } from "./ReportHistory";
import { ReportRecipients } from "./ReportRecipients";
import { ReportRunView } from "./ReportRunView";

export function ReportsScreen() {
  const query = useCapiroQuery("legiwatch.reports", {}),
    [tab, setTab] = useState("library"),
    [editor, setEditor] = useState<LegiWatchReport | "new">(),
    [runId, setRunId] = useState<string>();
  if (runId)
    return <ReportRunView runId={runId} onBack={() => setRunId(undefined)} />;
  return (
    <>
      <h2 className={styles.roomTitle}>Reports</h2>
      <LegiWatchTabs
        value={tab}
        items={[
          { id: "library", label: "Report library" },
          { id: "history", label: "Run history" },
          { id: "recipients", label: "Contacts & lists" },
        ]}
        onChange={setTab}
        label="Report views"
      />
      {tab === "library" && (
        <>
          <div className={styles.actions}>
            <ActionButton primary onClick={() => setEditor("new")}>
              Create report
            </ActionButton>
            <ActionButton onClick={query.reload}>Refresh library</ActionButton>
          </div>
          <StatusPanel
            loading={query.loading}
            error={query.error}
            onRetry={query.reload}
            empty={
              query.data?.length === 0
                ? "No report definitions yet. Create a report from canonical folders."
                : undefined
            }
          >
            <section className={styles.card}>
              <h2>Saved report definitions</h2>
              {query.data?.map((report) => (
                <div className={styles.row} key={report.id}>
                  <div>
                    <strong>{report.name}</strong>
                    <p className={styles.description}>
                      {report.jurisdiction} · {report.sessionKey} · Version{" "}
                      {report.version} ·{" "}
                      {report.canEdit ? "Editable" : "Read only"}
                      {report.archived ? " · Archived" : ""}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <ActionButton onClick={() => setEditor(report)}>
                      Open report
                    </ActionButton>
                    <ActionButton
                      onClick={() => {
                        setTab("history");
                      }}
                    >
                      Run history
                    </ActionButton>
                  </div>
                </div>
              ))}
            </section>
          </StatusPanel>
          <div className={styles.banner}>
            <strong>Workspace and delivery permissions</strong>Report visibility
            and external sending are separate capabilities. Frozen runs preserve
            reviewed definitions and exact source content.
          </div>
        </>
      )}
      {tab === "history" && <ReportHistory onOpen={setRunId} />}
      {tab === "recipients" && <ReportRecipients />}
      {editor && (
        <ReportEditor
          report={editor === "new" ? undefined : editor}
          open
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            query.reload();
            setEditor(undefined);
          }}
          onGenerated={(id) => {
            setEditor(undefined);
            setRunId(id);
          }}
        />
      )}
    </>
  );
}
