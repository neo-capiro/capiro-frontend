"use client";
import { useState } from "react";
import type { OutreachTemplateDetail } from "../../../../shared/capiro/operations/outreach-template-schemas";
import { ActionButton } from "../../../../shared/module-ui";
import { compareTemplates, templateSnapshot } from "./template-history";
import styles from "./template-history.module.css";

export function TemplateHistory({
  detail,
}: {
  detail: OutreachTemplateDetail;
}) {
  const versions = [...detail.versions].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );
  const [selectedId, setSelectedId] = useState<string>();
  const selected = versions.find((version) => version.id === selectedId);
  const before =
    selected &&
    versions.find((version) => version.versionNumber < selected.versionNumber);
  const changes =
    selected && before ? compareTemplates(before.spec, selected.spec) : [];
  return (
    <div className={styles.stack}>
      {versions.map((version) => (
        <div className={styles.version} key={version.id}>
          <span>
            v{version.versionNumber} · {version.lifecycle} ·{" "}
            {new Date(version.createdAt).toLocaleDateString()}
          </span>
          <ActionButton
            aria-pressed={version.id === selectedId}
            onClick={() => setSelectedId(version.id)}
          >
            {versions.some((item) => item.versionNumber < version.versionNumber)
              ? "Compare"
              : "View"}
          </ActionButton>
        </div>
      ))}
      {!versions.length && <p>No template versions are available.</p>}
      {selected && (
        <section
          className={styles.comparison}
          aria-label={`Template version ${selected.versionNumber}`}
        >
          <h3>
            {before
              ? `v${before.versionNumber} → v${selected.versionNumber}`
              : `v${selected.versionNumber}`}
          </h3>
          {before && (
            <p>
              Compared with the previous available version. These are saved
              template defaults, not current campaign settings.
            </p>
          )}
          {before &&
            (changes.length ? (
              changes.map((row) => (
                <div className={styles.change} key={row.key}>
                  <span className={styles.label}>{row.label}</span>
                  <span className={styles.before}>{row.before}</span>
                  <span aria-hidden>→</span>
                  <span className={styles.after}>{row.value}</span>
                </div>
              ))
            ) : (
              <p>No changed defaults in these saved versions.</p>
            ))}
          <details>
            <summary>Saved version details</summary>
            <dl className={styles.details}>
              <dt>Content pin</dt>
              <dd>{selected.contentHash}</dd>
              <dt>Created</dt>
              <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
              <dt>Published</dt>
              <dd>
                {selected.publishedAt
                  ? new Date(selected.publishedAt).toLocaleString()
                  : "Not published"}
              </dd>
              <dt>Source campaign</dt>
              <dd>
                {selected.sourceSessionId ?? "No source campaign recorded"}
              </dd>
              {templateSnapshot(selected.spec).map((row) => (
                <div className={styles.detailRow} key={row.key}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>
      )}
    </div>
  );
}
