"use client";
import { useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  explorerDatasetOperations,
  type ExplorerDataset,
  type ExplorerRecord,
} from "../../../shared/capiro/operations/intelligence-explorer";
import type { OperationRequest } from "../../../shared/capiro/contracts";
import type { intelligenceExplorerOperations } from "../../../shared/capiro/operations/intelligence-explorer";
import { ActionButton } from "../../../shared/module-ui";
import { downloadText } from "./legiwatch/components";
import {
  collectExplorerExport,
  explorerCsv,
  explorerExportLimit,
} from "./explorer-export";
import styles from "./intelligence.module.css";

type Query = OperationRequest<
  (typeof intelligenceExplorerOperations)["intelligence.explorer.bills"]
>["query"];

/** Parent keys this panel by dataset/filters/page; leaving aborts an in-flight export. */
export function ExplorerExports({
  dataset,
  query,
  rows,
  selected,
  total,
}: {
  dataset: ExplorerDataset;
  query: Query;
  rows: ExplorerRecord[];
  selected: ExplorerRecord[];
  total: number;
}) {
  const api = useCapiro();
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [api],
  );
  async function save(scope: "selected" | "page" | "all") {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    try {
      const output =
        scope === "all"
          ? await collectExplorerExport(total, (page) =>
              api.request(
                explorerDatasetOperations[dataset],
                { query: { ...query, page, pageSize: 200 } },
                { signal: controller.signal },
              ),
            )
          : scope === "selected"
            ? selected
            : rows;
      if (!controller.signal.aborted)
        downloadText(
          explorerCsv(output),
          `${dataset}-${scope}-${output.length}.csv`,
          "text/csv;charset=utf-8",
        );
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(caught instanceof Error ? caught.message : "Export failed.");
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div>
      <div className={styles.actions}>
        <ActionButton
          disabled={busy || selected.length === 0}
          onClick={() => void save("selected")}
        >
          Export selected ({selected.length})
        </ActionButton>
        <ActionButton
          disabled={busy || rows.length === 0}
          onClick={() => void save("page")}
        >
          Export this page ({rows.length})
        </ActionButton>
        <ActionButton
          disabled={busy || total === 0 || total > explorerExportLimit}
          onClick={() => void save("all")}
        >
          Export all matches ({total.toLocaleString()})
        </ActionButton>
      </div>
      <p className={styles.muted}>
        Selection applies to this page. All matches exports up to 10,000 records
        using the current filters; narrow the filters for larger results. Data
        is read during export, rather than frozen to one instant.
      </p>
      {busy && <p role="status">Preparing export…</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
