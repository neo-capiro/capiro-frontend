"use client";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import { MarkdownContent } from "../../../shared/markdown/MarkdownContent";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { createLegacyReportClient } from "../../../shared/meri-reports/client";
import { LegacyReportController } from "../../../shared/meri-reports/state";
import styles from "./files.module.css";

/** The host keys this by current account/client and unmounts it during revocation. */
export function LegacyReportLibrary({ clientId }: { clientId?: string }) {
  const api = useCapiro();
  const [controller] = useState(
    () => new LegacyReportController(createLegacyReportClient(api, clientId)),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  useLayoutEffect(() => controller.mount(), [controller]);
  async function download(id: string) {
    const current = await controller.open(id);
    if (!current) return;
    const url = URL.createObjectURL(
      new Blob([current.markdown], { type: "text/markdown;charset=utf-8" }),
    );
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = `saved-report-${current.id}.md`;
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <section className={styles.files} aria-label="Completed legacy reports">
      <div className={styles.panel}>
        <h2>Completed legacy reports</h2>
        <p className={styles.muted}>
          Read saved reports you can currently access. Opening a report does not
          resume its job or regenerate its content.
        </p>
        <div className={styles.controls}>
          <Button
            disabled={state.busy}
            onClick={() => void controller.load(true)}
          >
            {state.loaded ? "Refresh reports" : "Load reports"}
          </Button>
          {state.loaded && state.cursor !== null && (
            <Button
              disabled={state.busy}
              onClick={() => void controller.load()}
            >
              Load more reports
            </Button>
          )}
        </div>
        {state.busy && <p role="status">Checking current report access…</p>}
        {state.problem && <p role="alert">{state.problem}</p>}
        {state.loaded && state.reports.length === 0 && (
          <p>
            {state.cursor === null
              ? "No currently available completed reports were returned."
              : "No available reports on this page. More saved reports can be checked."}
          </p>
        )}
        {state.reports.length > 0 && (
          <ul className={styles.stack}>
            {state.reports.map((report) => (
              <li key={report.id}>
                <Button
                  disabled={state.busy}
                  onClick={() => void controller.open(report.id)}
                >
                  {report.title || "Untitled report"}
                </Button>
                <p className={styles.muted}>
                  Saved {new Date(report.createdAt).toLocaleDateString()} ·{" "}
                  {report.kind}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {state.selected && (
        <article className={styles.panel} aria-label="Saved report">
          <h2>{state.selected.title || "Untitled report"}</h2>
          <div className={styles.controls}>
            <Button
              disabled={state.busy}
              onClick={() => void download(state.selected!.id)}
            >
              Download saved Markdown
            </Button>
            <Button disabled={state.busy} onClick={() => controller.clear()}>
              Close report
            </Button>
          </div>
          <MarkdownContent source={state.selected.markdown} />
        </article>
      )}
    </section>
  );
}
