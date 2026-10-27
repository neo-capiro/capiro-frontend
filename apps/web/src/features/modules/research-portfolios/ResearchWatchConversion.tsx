"use client";
import { useState } from "react";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import { useCapiroMutation } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchWatchConversion({
  portfolio,
}: {
  portfolio: ResearchDetail;
}) {
  const preview = useCapiroMutation("research.watch.preview");
  const apply = useCapiroMutation("research.watch.apply");
  const [selected, setSelected] = useState<string[]>([]);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  async function inspect() {
    try {
      const result = await preview.run({ params: { id: portfolio.id } });
      setSelected(
        result.previewItems
          .filter((item) => item.willConvert)
          .map((item) => item.watchId),
      );
      apply.reset();
      setKey(crypto.randomUUID());
    } catch {
      /* Read-only preview error. */
    }
  }
  async function convert() {
    if (!editable || !preview.data) return;
    try {
      await apply.run({
        params: { id: portfolio.id },
        body: {
          idempotencyKey: key,
          expectedRevision: preview.data.expectedRevision,
          previewHash: preview.data.previewHash,
          selectedWatchIds: selected,
        },
      });
    } catch {
      /* Keep the original preview and identity. */
    }
  }
  return (
    <Panel
      title="Legacy watch conversion"
      description="Preview your legacy watches before converting selected matches. Converted subscriptions start paused; enable them explicitly in Subscriptions."
    >
      <StatusPanel error={preview.error || apply.error} />
      <div className={styles.actions}>
        <ActionButton
          disabled={preview.pending || apply.pending}
          onClick={() => void inspect()}
        >
          Preview legacy watches
        </ActionButton>
      </div>
      {preview.data && (
        <>
          <DataTable
            rows={preview.data.previewItems}
            rowKey={(item) => item.watchId}
            caption="Legacy watch conversion preview"
            columns={[
              {
                key: "select",
                label: "Select",
                render: (item) => (
                  <input
                    aria-label={`Convert watch ${item.targetId}`}
                    type="checkbox"
                    checked={selected.includes(item.watchId)}
                    disabled={
                      !editable ||
                      !item.willConvert ||
                      apply.pending ||
                      Boolean(apply.error) ||
                      Boolean(apply.data)
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, item.watchId]
                          : selected.filter((id) => id !== item.watchId),
                      )
                    }
                  />
                ),
              },
              {
                key: "target",
                label: "Subject",
                render: (item) => item.targetId,
              },
              { key: "result", label: "Result", render: (item) => item.reason },
            ]}
          />
          {preview.data.limitations.map((item) => (
            <p key={item} className={styles.content}>
              {item}
            </p>
          ))}
          <div className={styles.actions}>
            <ActionButton
              disabled={
                !editable ||
                !selected.length ||
                apply.pending ||
                Boolean(apply.data)
              }
              onClick={() => void convert()}
            >
              Convert selected watches
            </ActionButton>
          </div>
        </>
      )}
      {apply.data && (
        <p role="status" className={styles.content}>
          {apply.data.convertedCount} converted · {apply.data.skippedCount}{" "}
          skipped. {apply.data.limitations.join(" ")}
        </p>
      )}
    </Panel>
  );
}
