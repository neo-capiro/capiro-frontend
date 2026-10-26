"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { WorkspaceDraftDocument } from "../../../../shared/capiro/operations/workspace-documents";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { ActionButton, Field, SelectInput } from "../../../../shared/module-ui";
import styles from "../ordinary-presentation.module.css";
import {
  ORDINARY_ALL_PART,
  ordinaryExportTabs,
  ordinaryPartOptions,
  runOrdinaryExport,
  type OrdinaryExportFormat,
} from "./ordinary-export";

/**
 * Server-saved PDF/DOCX export for an ordinary draft, with an explicit
 * all/main/tab choice. Reuses the existing authorized `workspace.draft` read
 * and the existing binary `workspace.draft.pdf|docx` client (filename/MIME and
 * 30,000,000-byte bounds). Exported content is the server-saved content and may
 * differ from unsaved editor changes; nothing is autosaved, snapshotted or
 * restored to make an export happen.
 */
export function OrdinaryDraftExport({
  draft,
  disabled,
}: {
  draft: WorkspaceDraftDocument;
  disabled: boolean;
}) {
  const api = useCapiro();
  const selectId = useId();
  const [part, setPart] = useState(ORDINARY_ALL_PART);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    // React replays setup -> cleanup -> setup (StrictMode), so the flag must be
    // restored on every attachment. Only a real unmount - or the existing
    // request-lifetime cancellation - may suppress a late download.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const options = ordinaryPartOptions(ordinaryExportTabs(draft));
  async function exportSaved(format: OrdinaryExportFormat) {
    if (working.current || disabled) return;
    working.current = true;
    setPending(true);
    setError("");
    const message = await runOrdinaryExport({
      request: { format, part },
      expected: { id: draft.id, clientId: draft.clientId ?? null },
      readCurrent: () =>
        api.request("workspace.draft", { params: { id: draft.id } }),
      download: ({ format: chosen, part: selected }) =>
        api.download(
          chosen === "pdf" ? "workspace.draft.pdf" : "workspace.draft.docx",
          { params: { draftId: draft.id }, query: { part: selected } },
        ),
      save: ({ blob, filename }) => {
        // A late result after a draft/client/session change must not download.
        if (!mounted.current) return;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    });
    working.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (message) setError(message);
  }
  return (
    <section className={styles.exportPanel} aria-label="Saved document export">
      <div className={styles.exportRow}>
        <div className={styles.exportSelection}>
          <Field label="Saved content to export" htmlFor={selectId}>
            <SelectInput
              id={selectId}
              aria-label="Saved content to export"
              value={part}
              onValueChange={setPart}
              options={options}
              disabled={disabled || pending}
            />
          </Field>
        </div>
        <div className={styles.actions}>
          <ActionButton
            disabled={disabled || pending}
            onClick={() => void exportSaved("pdf")}
          >
            Export saved PDF
          </ActionButton>
          <ActionButton
            disabled={disabled || pending}
            onClick={() => void exportSaved("docx")}
          >
            Export saved DOCX
          </ActionButton>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <p role="status" className={styles.qualifier}>
        {pending
          ? "Preparing the saved export…"
          : "Exports use the server-saved content and may differ from unsaved editor changes."}
      </p>
    </section>
  );
}
