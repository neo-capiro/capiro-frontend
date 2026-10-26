"use client";
import { useState } from "react";
import Image from "next/image";
import {
  parseWorkspaceBlueprintCompare,
  type WorkspaceBlueprintDetail,
  type WorkspaceBlueprintStatus,
} from "@capiro/shared/workspace-template-studio";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  StatusPanel,
} from "../../../../shared/module-ui";
import styles from "./document-templates.module.css";

export function BlueprintStatus({
  status,
}: {
  status: WorkspaceBlueprintStatus;
}) {
  return (
    <span className={styles.statusBadge} data-status={status}>
      <Badge
        tone={
          status === "published"
            ? "success"
            : status === "draft"
              ? "warning"
              : "neutral"
        }
      >
        {status !== "retired" && (
          <Image
            src={`/figma/document-blueprints/${status}-dot.svg`}
            width={5}
            height={5}
            alt=""
          />
        )}
        {status[0]!.toUpperCase() + status.slice(1)}
      </Badge>
    </span>
  );
}
export function blueprintDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function BlueprintHistory({
  blueprint,
  onSelect,
  onClose,
}: {
  blueprint: WorkspaceBlueprintDetail;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const query = useCapiroQuery(
    "workspace.blueprints.compare",
    { params: { blueprintId: blueprint.id } },
    { enabled: blueprint.versions.length > 1 },
  );
  const received =
    query.data === undefined
      ? undefined
      : parseWorkspaceBlueprintCompare(query.data, {
          blueprintId: blueprint.id,
        });
  const comparison = received?.ok ? received.value : undefined;
  const [toId, selectComparison] = useState<string>();
  const edge = comparison?.diffs.find((row) => row.toVersionId === toId);
  const from = comparison?.versions.find(
    (row) => row.versionId === edge?.fromVersionId,
  );
  const to = comparison?.versions.find(
    (row) => row.versionId === edge?.toVersionId,
  );
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Version history"
      description={blueprint.name}
      className={styles.dialog}
      footer={<ActionButton onClick={onClose}>Close</ActionButton>}
    >
      <div className={styles.history} data-design-node="1064:257665">
        {blueprint.versions.map((version) => {
          const adjacent = comparison?.diffs.find(
            (diff) => diff.toVersionId === version.id,
          );
          const previous = comparison?.versions.find(
            (row) => row.versionId === adjacent?.fromVersionId,
          );
          return (
            <div className={styles.versionRow} key={version.id}>
              <div>
                <strong>v{version.version}</strong> ·{" "}
                <BlueprintStatus status={version.status} />
                <p>Created {blueprintDate(version.createdAt)}</p>
              </div>
              <div className={styles.actions}>
                <ActionButton onClick={() => onSelect(version.id)}>
                  View v{version.version}
                </ActionButton>
                {adjacent && previous && (
                  <ActionButton
                    onClick={() => selectComparison(version.id)}
                    aria-pressed={toId === version.id}
                  >
                    Compare v{previous.version} to v{version.version}
                  </ActionButton>
                )}
              </div>
            </div>
          );
        })}
        {blueprint.versions.length < 2 ? (
          <p>No earlier version to compare.</p>
        ) : (
          <>
            {query.loading && <p role="status">Loading version comparison…</p>}
            <StatusPanel
              error={
                query.error || (received && !received.ok)
                  ? "Could not load this version comparison."
                  : undefined
              }
              onRetry={query.reload}
            />
          </>
        )}
        {edge && from && to && (
          <section
            className={styles.comparison}
            aria-label={`Comparison v${from.version} to v${to.version}`}
            data-design-node="1064:257681"
          >
            <h3>
              v{from.version} → v{to.version}
            </h3>
            <p>This summary lists changed top-level fields.</p>
            {edge.changedKeys.length ? (
              <>
                <h4>Changed fields</h4>
                <ul>
                  {edge.changedKeys.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No top-level definition changes.</p>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
