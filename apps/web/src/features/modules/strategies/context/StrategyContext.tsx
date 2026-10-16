"use client";

import { useState } from "react";
import type { StrategyContextDocument } from "../../../../shared/capiro/operations/strategies-context";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../strategies.module.css";
import { ContextDocument } from "./ContextDocument";
import { ContextEvidence } from "./ContextEvidence";
import { ContextUpload } from "./ContextUpload";

export function StrategyContext({
  clientId,
  clientName,
  evidence,
  onEvidenceClose,
  upload,
  onUploadClose,
}: {
  clientId?: string;
  clientName?: string;
  evidence: boolean;
  onEvidenceClose: () => void;
  upload: boolean;
  onUploadClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState(clientId ? "client" : "all");
  const [state, setState] = useState<
    "draft" | "active" | "superseded" | "archived" | "all"
  >("active");
  const [document, setDocument] = useState<StrategyContextDocument>();
  const query = useCapiroQuery("strategies.context.documents", {
    query: {
      clientId: scope === "client" ? clientId : undefined,
      includeFirm: scope === "client" ? "true" : undefined,
      firmOnly: scope === "firm" ? "true" : undefined,
      includeStale: "true",
      state: state === "all" ? undefined : state,
    },
  });
  const health = useCapiroQuery("strategies.context.health", {
    query: { clientId },
  });
  const rows = (query.data ?? []).filter((row) =>
    `${row.title} ${row.content}`.toLowerCase().includes(search.toLowerCase()),
  );
  if (evidence)
    return <ContextEvidence clientId={clientId} onClose={onEvidenceClose} />;
  return (
    <div className={styles.panels} data-design-node="411:120223">
      <div className={styles.stats}>
        <article className={styles.stat}>
          <h2>Active documents</h2>
          <strong>
            {query.loading
              ? "—"
              : (query.data?.filter((row) => row.state === "active").length ??
                "—")}
          </strong>
        </article>
        <article className={styles.stat}>
          <h2>Facts in use</h2>
          <strong>{health.data?.factCounts.active ?? "—"}</strong>
        </article>
        <article className={styles.stat}>
          <h2>Conflicting information</h2>
          <strong>{health.data?.openConflicts ?? "—"}</strong>
        </article>
      </div>
      <div className={styles.contextScope}>
        <Panel
          title="Context scope and document status"
          description="Filter without mixing another client's context."
        >
          <div className={styles.form}>
            <div className={styles.pills}>
              {[
                ["all", "All clients"],
                ["firm", "Firm"],
                ["client", clientName ?? "Selected client"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={scope === value ? styles.active : ""}
                  aria-pressed={scope === value}
                  onClick={() => setScope(value!)}
                  disabled={value === "client" && !clientId}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles.pills}>
              {[
                ["active", "Active"],
                ["all", "All statuses"],
                ["draft", "Draft"],
                ["superseded", "Previous versions"],
                ["archived", "Archived"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={state === value ? styles.active : ""}
                  aria-pressed={state === value}
                  onClick={() => setState(value as typeof state)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>
      <div className={styles.contextSearch}>
        <label htmlFor="context-document-search">Search documents</label>
        <div className={styles.contextSearchControls}>
          <TextInput
            id="context-document-search"
            aria-label="Search context documents"
            placeholder="Search by title or content"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <SelectInput
            aria-label="Document state"
            value={state}
            onValueChange={(value) => setState(value as typeof state)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "superseded", label: "Previous versions" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
        empty={
          !query.loading && !query.error && !rows.length
            ? "No context documents match this view"
            : undefined
        }
      >
        {rows.map((row) => (
          <Panel
            key={row.id}
            title={row.title}
            description={row.templateKey.replaceAll("_", " ")}
          >
            <div className={styles.form}>
              <p className={styles.muted}>
                {row.scope} · Updated{" "}
                {new Date(row.updatedAt).toLocaleDateString()}
              </p>
              <Badge tone={row.stale ? "warning" : "neutral"}>
                {row.state}
                {row.stale ? " · Stale" : ""}
              </Badge>
              <div>
                <ActionButton onClick={() => setDocument(row)}>
                  Open document
                </ActionButton>
              </div>
            </div>
          </Panel>
        ))}
      </StatusPanel>
      {health.error && (
        <p role="alert" className={styles.notice}>
          Source health unavailable · {health.error.message}
        </p>
      )}
      {document && (
        <ContextDocument
          document={document}
          onClose={() => setDocument(undefined)}
          onSaved={() => {
            query.reload();
            health.reload();
          }}
        />
      )}
      {upload && (
        <ContextUpload
          clientId={clientId}
          onClose={onUploadClose}
          onSaved={() => {
            query.reload();
            health.reload();
          }}
        />
      )}
    </div>
  );
}
