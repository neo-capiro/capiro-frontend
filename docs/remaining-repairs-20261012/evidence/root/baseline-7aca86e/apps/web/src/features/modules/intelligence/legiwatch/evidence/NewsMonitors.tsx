"use client";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import type { EvidenceScope } from "./EvidenceActions";
import { NewsImport } from "./NewsImport";
import { NewsMonitorEditor } from "./NewsMonitorEditor";

export function NewsMonitors({ scope }: { scope: EvidenceScope }) {
  const monitors = useCapiroQuery("legiwatch.evidence.monitors", {});
  return (
    <div className={styles.form}>
      <StatusPanel
        loading={monitors.loading}
        error={monitors.error}
        onRetry={monitors.reload}
      >
        {monitors.data && (
          <>
            <Panel
              title="News monitors"
              description="Review the compiled query and selected publishers before activation. A failed scan does not mean no articles matched."
            >
              <div className={styles.list}>
                {monitors.data.monitors.map((monitor) => (
                  <NewsMonitorEditor
                    key={`${monitor.id}:${monitor.version}`}
                    monitor={monitor}
                    scope={scope}
                    onSaved={monitors.reload}
                  />
                ))}
                {!monitors.data.monitors.length && (
                  <p className={styles.description}>
                    No permitted monitors. Review a source capture below to
                    stage inactive definitions.
                  </p>
                )}
              </div>
            </Panel>
            <ActionButton onClick={monitors.reload}>
              Refresh saved monitor status
            </ActionButton>
          </>
        )}
      </StatusPanel>
      <NewsImport onStaged={monitors.reload} />
    </div>
  );
}
