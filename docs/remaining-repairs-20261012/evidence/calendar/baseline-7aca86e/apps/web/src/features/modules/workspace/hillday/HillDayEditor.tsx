"use client";

import { useState } from "react";
import type { HillDayDocument } from "../../../../shared/capiro/operations/workspace-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Modal,
  StatusPanel,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { HillDayExport } from "./HillDayExport";
import { FirstPageEditor, SectionEditor } from "./HillDaySectionEditors";

function DocumentCanvas({
  document,
  selected,
  onEditCover,
  onEditSection,
  onReset,
  readOnly = false,
}: {
  document: HillDayDocument;
  selected: string;
  onEditCover?: () => void;
  onEditSection?: (section: HillDayDocument["sections"][number]) => void;
  onReset?: () => void;
  readOnly?: boolean;
}) {
  const section = document.sections.find(
    (value) => value.sectionId === selected,
  );
  return (
    <article className={styles.paper}>
      {!section ? (
        <>
          <header className={styles.paperHeader}>
            <strong>First page</strong>
            {!readOnly && (
              <div className={styles.actions}>
                <ActionButton onClick={onReset}>Restore defaults</ActionButton>
                <ActionButton onClick={onEditCover}>
                  Edit first page
                </ActionButton>
              </div>
            )}
          </header>
          <h2>{document.cover.title}</h2>
          <p className={styles.muted}>{document.cover.dateline}</p>
          <dl className={styles.coverFacts}>
            {document.cover.facts.map((fact) => (
              <div key={fact.k}>
                <dt>{fact.k}</dt>
                <dd>{fact.v}</dd>
              </div>
            ))}
          </dl>
          <h4>The day at a glance</h4>
          <DataTable
            rows={document.summary}
            rowKey={(row) => row.meetingId}
            caption="Hill Day meeting schedule"
            columns={document.summaryColumns.map((key) => ({
              key,
              label: key === "staffLead" ? "STAFF LEAD" : key.toUpperCase(),
              render: (row: HillDayDocument["summary"][number]) => row[key],
            }))}
          />
        </>
      ) : (
        <>
          <header className={styles.paperHeader}>
            <strong>
              Meeting {String(section.number).padStart(2, "0")} · {section.time}{" "}
              · {section.duration}
            </strong>
            {!readOnly && (
              <ActionButton onClick={() => onEditSection?.(section)}>
                Edit
              </ActionButton>
            )}
          </header>
          <h3>{section.member}</h3>
          <p className={styles.muted}>{section.subline}</p>
          <dl className={styles.coverFacts}>
            {section.facts.map((fact) => (
              <div key={fact.k}>
                <dt>{fact.k}</dt>
                <dd>{fact.v}</dd>
              </div>
            ))}
          </dl>
          <h4>Focus</h4>
          <p>
            {section.focus ??
              (section.reason || "This section is not yet available.")}
          </p>
          <h4>Background</h4>
          <p>{section.background ?? "No background supplied."}</p>
          {section.flags.map((flag) => (
            <p key={`${flag.kind}:${flag.detail}`} className={styles.notice}>
              {flag.detail}
            </p>
          ))}
        </>
      )}
    </article>
  );
}

function DocumentEditor({
  document,
  reload,
  onClose,
}: {
  document: HillDayDocument;
  reload: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState("cover");
  const [editingCover, setEditingCover] = useState(false);
  const [editingSection, setEditingSection] =
    useState<HillDayDocument["sections"][number]>();
  const [context, setContext] = useState(false);
  const [preview, setPreview] = useState(false);
  const [deliver, setDeliver] = useState(false);
  const [exporting, setExporting] = useState(false);
  const update = useCapiroMutation("workspace.hillday.update");
  const quality = useCapiroQuery("workspace.hillday.quality", {
    params: { id: document.id },
  });
  async function markDelivered() {
    try {
      await update.run({
        params: { id: document.id },
        body: { status: "delivered" },
      });
      setDeliver(false);
      reload();
    } catch {
      /* Show the service error. */
    }
  }
  async function resetCover() {
    try {
      await update.run({
        params: { id: document.id },
        body: { firstPage: null, expectedUpdatedAt: document.updatedAt },
      });
      reload();
    } catch {
      /* Conflict stays visible until user refreshes. */
    }
  }
  return (
    <section className={styles.editor} data-design-node="411:118285">
      <header className={styles.heading}>
        <div className={styles.actions}>
          <ActionButton onClick={onClose}>←</ActionButton>
          <div>
            <h1>{document.name}</h1>
            <p>
              Hill Day Schedule ·{" "}
              <Badge tone="success">{document.status}</Badge>
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <ActionButton onClick={() => setPreview(true)}>
            Preview as client
          </ActionButton>
          <ActionButton onClick={() => setExporting(true)}>
            Export PDF
          </ActionButton>
          <ActionButton
            primary
            disabled={document.status === "delivered"}
            onClick={() => setDeliver(true)}
          >
            Deliver
          </ActionButton>
        </div>
      </header>
      {document.status === "delivered" && (
        <p className={styles.success}>
          This document is marked delivered. You can still export the displayed
          document.
        </p>
      )}
      <div className={styles.toolbar}>
        <span className={styles.footnote}>
          {document.meetingCount} meetings · {document.provenance.totalSources}{" "}
          sources · Quality {document.provenance.quality ?? "unavailable"} ·{" "}
          {document.provenance.failedUnits} unavailable sections
        </span>
        <ActionButton onClick={() => setContext(true)}>
          Context used ›
        </ActionButton>
      </div>
      {update.error && (
        <p role="alert" className={styles.error}>
          {update.error.message}
        </p>
      )}
      <div className={styles.editorGrid}>
        <nav className={styles.contents} aria-label="Document contents">
          <p className={styles.footnote}>CONTENTS</p>
          <button
            aria-current={selected === "cover"}
            onClick={() => setSelected("cover")}
          >
            Cover and schedule
          </button>
          {document.sections.map((section) => (
            <button
              key={section.sectionId}
              aria-current={selected === section.sectionId}
              onClick={() => setSelected(section.sectionId)}
            >
              {String(section.number).padStart(2, "0")} · {section.member}
              <span className={styles.secondary}>
                {section.time}
                {section.status === "unavailable" ? " · Unavailable" : ""}
              </span>
            </button>
          ))}
        </nav>
        <DocumentCanvas
          document={document}
          selected={selected}
          onEditCover={() => setEditingCover(true)}
          onEditSection={setEditingSection}
          onReset={resetCover}
        />
        <aside className={styles.info}>
          <h3>QUALITY</h3>
          <StatusPanel
            loading={quality.loading}
            error={quality.error}
            onRetry={quality.reload}
          >
            {quality.data?.checks.map((check) => (
              <p key={check.id}>
                {check.state === "pass" ? "✓" : "⚠"} {check.label}
                <span className={styles.secondary}>{check.detail}</span>
              </p>
            ))}
          </StatusPanel>
          <h3>SOURCES USED</h3>
          {document.provenance.sourceCounts.map((source) => (
            <p key={source.id}>
              {source.label} · {source.count}
            </p>
          ))}
        </aside>
      </div>
      {editingCover && (
        <FirstPageEditor
          document={document}
          onClose={() => setEditingCover(false)}
          onSaved={reload}
        />
      )}
      {editingSection && (
        <SectionEditor
          id={document.id}
          section={editingSection}
          onClose={() => setEditingSection(undefined)}
          onSaved={reload}
        />
      )}
      <Modal
        open={context}
        onOpenChange={setContext}
        title="Context used"
        description="The provenance recorded for this document."
      >
        <div className={styles.form}>
          <p>
            Generated{" "}
            {document.provenance.generatedAt
              ? new Date(document.provenance.generatedAt).toLocaleString()
              : "Not yet"}
          </p>
          {document.provenance.sourceCounts.map((source) => (
            <p key={source.id}>
              <strong>
                {source.label} · {source.count}
              </strong>
              <span className={styles.secondary}>{source.detail}</span>
            </p>
          ))}
          {document.provenance.corrections.map((value, index) => (
            <p key={index}>{value}</p>
          ))}
        </div>
      </Modal>
      <Modal open={preview} onOpenChange={setPreview} title="Client preview">
        <DocumentCanvas document={document} selected={selected} readOnly />
      </Modal>
      <Modal
        open={deliver}
        onOpenChange={setDeliver}
        title="Mark document delivered?"
        description="This records delivery status. Share links and external sending are separate workflows."
        footer={
          <>
            <ActionButton
              disabled={update.pending}
              onClick={() => setDeliver(false)}
            >
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={update.pending}
              onClick={markDelivered}
            >
              Mark delivered
            </ActionButton>
          </>
        }
      >
        <p>{document.name}</p>
        {update.error && (
          <p role="alert" className={styles.error}>
            {update.error.message}
          </p>
        )}
      </Modal>
      {exporting && (
        <HillDayExport
          document={document}
          onClose={() => setExporting(false)}
        />
      )}
    </section>
  );
}

export function HillDayEditor({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("workspace.hillday.document", {
    params: { id },
  });
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {query.data && (
        <DocumentEditor
          key={query.data.id}
          document={query.data}
          reload={query.reload}
          onClose={onClose}
        />
      )}
    </StatusPanel>
  );
}
