"use client";

import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { StrategyDetail } from "../../../shared/capiro/operations/strategies-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Field,
  Modal,
  Panel,
  SelectInput,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./strategies.module.css";

export function StrategyExport({
  strategy,
  onClose,
}: {
  strategy: StrategyDetail;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"docx" | "pptx" | "pdf">("docx");
  const [audience, setAudience] = useState<"client" | "internal">("client");
  const [narrative, setNarrative] = useState(false);
  const [notes, setNotes] = useState(false);
  const [evidence, setEvidence] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const api = useCapiro();
  const preflight = useCapiroQuery("strategies.report.preflight", {
    params: { id: strategy.id },
    query: {
      format,
      audience,
      includeNarrative: narrative,
      includeEvidenceAppendix: evidence,
      includeInternalNotes: audience === "internal" && notes,
    },
  });
  async function download() {
    if (!preflight.data?.report.ready) return;
    setPending(true);
    setError("");
    try {
      const body = {
        audience,
        includeNarrative: narrative,
        includeEvidenceAppendix: evidence,
        includeInternalNotes: audience === "internal" && notes,
        expectedSnapshotHash: preflight.data.report.snapshotHash,
      };
      const params = { id: strategy.id };
      const result =
        format === "pdf"
          ? await api.download("strategies.report.export.pdf", {
              params,
              body: { ...body, format: "pdf" },
            })
          : format === "pptx"
            ? await api.download("strategies.report.export.pptx", {
                params,
                body: { ...body, format: "pptx" },
              })
            : await api.download("strategies.report.export.docx", {
                params,
                body: { ...body, format: "docx" },
              });
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Export failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title="Export strategy"
      description="Prepare a report from the current working plan."
      footer={
        <>
          <ActionButton disabled={pending} onClick={onClose}>
            Close
          </ActionButton>
          <ActionButton
            primary
            disabled={
              pending ||
              !preflight.data?.report.ready ||
              !preflight.data.report.formats.includes(format)
            }
            onClick={download}
          >
            {pending
              ? "Generating…"
              : `Generate ${format === "docx" ? "Word report" : format === "pptx" ? "PowerPoint deck" : "PDF brief"}`}
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        <article className={styles.paper}>
          <p>CLIENT STRATEGY</p>
          <h2>{strategy.title}</h2>
          <p>{strategy.goal}</p>
          <p>
            {audience === "client" ? "Client-ready report" : "Internal report"}
          </p>
        </article>
        <Panel title="Format">
          {[
            ["pdf", "PDF brief"],
            ["docx", "Word report · .docx"],
            ["pptx", "PowerPoint deck · .pptx"],
          ].map(([value, label]) => (
            <label key={value} className={styles.check}>
              <input
                type="radio"
                name="strategy-export-format"
                checked={format === value}
                onChange={() => setFormat(value as typeof format)}
              />
              {label}
            </label>
          ))}
        </Panel>
        <Panel title="Audience and content">
          <div className={styles.form}>
            <Field label="Audience" htmlFor="strategy-report-audience">
              <SelectInput
                id="strategy-report-audience"
                value={audience}
                onValueChange={(value) => setAudience(value as typeof audience)}
                options={[
                  { value: "client", label: "Client-ready" },
                  { value: "internal", label: "Internal team" },
                ]}
              />
            </Field>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={evidence}
                onChange={(event) => setEvidence(event.target.checked)}
              />
              Include evidence appendix
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={narrative}
                onChange={(event) => setNarrative(event.target.checked)}
              />
              Generate grounded executive narrative
            </label>
            {audience === "internal" && (
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={notes}
                  onChange={(event) => setNotes(event.target.checked)}
                />
                Include internal notes
              </label>
            )}
          </div>
        </Panel>
        <StatusPanel
          loading={preflight.loading}
          error={preflight.error}
          onRetry={preflight.reload}
        >
          {preflight.data && (
            <Panel title="Export readiness">
              <Badge tone={preflight.data.report.ready ? "success" : "warning"}>
                {preflight.data.report.readiness}
              </Badge>
              {preflight.data.errors.map((issue) => (
                <p key={issue.code} className={styles.error}>
                  {issue.message}
                </p>
              ))}
              {preflight.data.warnings.map((issue) => (
                <p key={issue.code} className={styles.notice}>
                  {issue.message}
                </p>
              ))}
              <p className={styles.muted}>
                Snapshot {preflight.data.report.snapshotHash.slice(0, 12)} ·
                current version pinned
              </p>
            </Panel>
          )}
        </StatusPanel>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
