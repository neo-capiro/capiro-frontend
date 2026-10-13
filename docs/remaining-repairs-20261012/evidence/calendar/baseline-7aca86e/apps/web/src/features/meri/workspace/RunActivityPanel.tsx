import { Button } from "@capiro/ui/button";
import type { WorkspaceView } from "./workspace-view";
import { runStateLabels } from "./workspace-view";
import styles from "./workspace.module.css";

export function RunActivityPanel({ view }: { view: WorkspaceView }) {
  return (
    <section
      className={styles.activity}
      aria-labelledby="sample-activity-title"
    >
      <div className={styles.activityHeading}>
        <h2 id="sample-activity-title">Run activity</h2>
        <span className={styles.badge} role="status">
          {view.state ? runStateLabels[view.state] : "No status reported"}
        </span>
      </div>
      <p className={styles.muted}>
        Sample {view.selection.runId} · {view.selection.attemptId}
      </p>
      {view.errors.map((error, index) => (
        <p className={styles.error} role="alert" key={index}>
          {error.message}
        </p>
      ))}
      <div className={styles.tools} aria-label="Sample tool references">
        {view.tools.length ? (
          view.tools.map((tool) => (
            <article className={styles.tool} key={tool.requestId}>
              <h3>{tool.name ?? "Tool name unavailable"}</h3>
              <p>
                {tool.resultReference !== null
                  ? "Result reference recorded"
                  : "Started"}
              </p>
              <dl>
                <dt>Request</dt>
                <dd>{tool.requestId}</dd>
                {tool.resultReference !== null && (
                  <>
                    <dt>Result reference</dt>
                    <dd>{tool.resultReference}</dd>
                  </>
                )}
              </dl>
              <p className={styles.muted}>
                A reference does not establish coverage or business success.
              </p>
            </article>
          ))
        ) : (
          <p className={styles.muted}>
            No tool activity reported for this sample attempt.
          </p>
        )}
      </div>
      <details className={styles.references}>
        <summary>Recorded sample references</summary>
        <p className={styles.muted}>
          Reference contents and current access are unavailable in this
          disconnected fixture.
        </p>
        {view.sources.map((source, index) => (
          <article key={index}>
            <h3>Source {source.citationId}</h3>
            <dl>
              <dt>Source / record</dt>
              <dd>
                {source.sourceId} / {source.recordId}
              </dd>
              <dt>Source version</dt>
              <dd>{source.sourceVersionId}</dd>
              <dt>Observed</dt>
              <dd>{source.observedAt}</dd>
              <dt>Source updated</dt>
              <dd>{source.sourceUpdatedAt ?? "Unknown"}</dd>
              <dt>Content hash</dt>
              <dd>{source.contentSha256}</dd>
            </dl>
          </article>
        ))}
        {view.artifacts.map((artifact, index) => (
          <p key={`artifact-${index}`}>
            Artifact {artifact.artifactId} · Version {artifact.versionId}
          </p>
        ))}
        {view.approvals.map((approval, index) => (
          <article key={`approval-${index}`}>
            <h3>Approval reference {approval.proposalId}</h3>
            <dl>
              <dt>Command hash</dt>
              <dd>{approval.commandSha256}</dd>
              <dt>Expires</dt>
              <dd>{approval.expiresAt}</dd>
            </dl>
            <p className={styles.muted}>
              The exact action and its outcome are not supplied.
            </p>
          </article>
        ))}
        {view.checkpointIds.map((id, index) => (
          <p key={`checkpoint-${index}`}>
            Checkpoint event {id}. Replacement-worker recovery is not
            demonstrated here.
          </p>
        ))}
        {view.usageIds.map((id, index) => (
          <p key={`usage-${index}`}>
            Usage reference {id}. Amounts are not supplied.
          </p>
        ))}
        {!view.sources.length &&
          !view.artifacts.length &&
          !view.approvals.length &&
          !view.checkpointIds.length &&
          !view.usageIds.length && (
            <p>No references reported for this sample attempt.</p>
          )}
      </details>
      <div
        className={styles.controls}
        aria-label="Unavailable run and artifact actions"
      >
        {["Stop", "Steer", "Resume", "Fork", "Approve", "Download"].map(
          (label) => (
            <Button
              type="button"
              key={label}
              disabled
              className={styles.button}
              title={`${label} requires a connected and authorized service`}
            >
              {label}
            </Button>
          ),
        )}
      </div>
    </section>
  );
}
