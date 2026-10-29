"use client";
import { useState } from "react";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";
import type {
  ComparisonSelection,
  SavedComparison,
} from "../../../../shared/capiro/operations/research-comparisons";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../shared/module-ui";
import { ComparisonProjection } from "./ComparisonProjection";
import { comparisonRequestRefused } from "./comparison-state";
import styles from "../research.module.css";

type Attempt = {
  kind: "add" | "archive" | "restore";
  idempotencyKey: string;
  expectedRevision: number;
  selection: ComparisonSelection;
  expectedPortfolioRevision: number;
};
export function SavedComparisonView({
  comparison,
  portfolio,
  selection,
  onSelection,
  onSaved,
  onReload,
  onRevise,
}: {
  comparison: SavedComparison;
  portfolio: ResearchDetail;
  selection: ComparisonSelection;
  onSelection: (selection: ComparisonSelection) => void;
  onSaved: (saved: SavedComparison) => void;
  onReload: () => void;
  onRevise: () => void;
}) {
  const add = useCapiroMutation("research.comparisons.add"),
    archive = useCapiroMutation("research.comparisons.archive"),
    restore = useCapiroMutation("research.comparisons.restore");
  const [attempt, setAttempt] = useState<Attempt>();
  const [error, setError] = useState<Error>();
  const [receipt, setReceipt] = useState<string>();
  const pending = add.pending || archive.pending || restore.pending;
  const version = comparison.currentVersion;
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const toggle = (
    kind: "subjectKeys" | "passageIds",
    key: string,
    checked: boolean,
  ) =>
    onSelection({
      ...selection,
      [kind]: checked
        ? [...selection[kind], key]
        : selection[kind].filter((value) => value !== key),
    });
  async function act(kind: Attempt["kind"]) {
    const request = attempt ?? {
      kind,
      idempotencyKey: crypto.randomUUID(),
      expectedRevision: comparison.revision,
      selection,
      expectedPortfolioRevision: portfolio.revision,
    };
    setAttempt(request);
    setError(undefined);
    setReceipt(undefined);
    try {
      const body = {
        expectedRevision: request.expectedRevision,
        idempotencyKey: request.idempotencyKey,
      };
      if (request.kind === "add") {
        const result = await add.run({
          params: { id: comparison.id, versionId: version.id },
          body: {
            ...body,
            portfolioId: portfolio.id,
            expectedPortfolioRevision: request.expectedPortfolioRevision,
            selection: request.selection,
          },
        });
        setReceipt(
          result.outcomes
            .map((outcome) => `${outcome.kind}: ${outcome.status}`)
            .join("; ") || "No items changed.",
        );
        onReload();
      } else {
        const result = await (
          request.kind === "archive" ? archive : restore
        ).run({ params: { id: comparison.id }, body });
        onSaved(result.comparison);
      }
      setAttempt(undefined);
    } catch (caught) {
      if (comparisonRequestRefused(caught)) setAttempt(undefined);
      setError(
        caught instanceof Error
          ? caught
          : new Error("The comparison action failed."),
      );
    }
  }
  return (
    <div className={styles.stack}>
      <Panel
        title={comparison.name}
        description={`Immutable version ${version.version} · captured ${version.capturedAt}`}
      >
        <div className={styles.content}>
          <Badge>{comparison.archivedAt ? "Archived" : "Active"}</Badge>
          <p>
            Version {version.id}. Current comparison revision{" "}
            {comparison.revision}.
          </p>
          <p>
            Known at capture: {version.captureKnownAt}. This saved view does not
            refresh its source values.
          </p>
          <details>
            <summary>Capture identity and limitations</summary>
            <p>{version.contentHash}</p>
            <ul>
              {version.limitations.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          </details>
          <fieldset
            disabled={
              pending || !!attempt || !editable || !!comparison.archivedAt
            }
          >
            <legend>Select saved items to add to {portfolio.name}</legend>
            {version.capturedProjection.subjects
              .filter((subject) =>
                version.selection.subjectKeys.includes(subject.key),
              )
              .map((subject) => (
                <label key={subject.key} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={selection.subjectKeys.includes(subject.key)}
                    onChange={(event) =>
                      toggle("subjectKeys", subject.key, event.target.checked)
                    }
                  />{" "}
                  {subject.label} —{" "}
                  {subject.type === "context_document"
                    ? "evidence bookmark"
                    : "portfolio member"}
                </label>
              ))}
            {version.selection.passageIds.map((id) => (
              <label key={id} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={selection.passageIds.includes(id)}
                  onChange={(event) =>
                    toggle("passageIds", id, event.target.checked)
                  }
                />{" "}
                Passage {id} — evidence bookmark
              </label>
            ))}
          </fieldset>
          <StatusPanel error={error} />
          {receipt && <p role="status">{receipt}</p>}
          {attempt && error && (
            <p>
              The exact request is retained for an explicit retry. Refresh to
              inspect any conflict; writes are never automatically repeated.
            </p>
          )}
          <div className={styles.toolbar}>
            {attempt ? (
              <ActionButton
                disabled={pending}
                onClick={() => void act(attempt.kind)}
              >
                {pending ? "Working…" : "Retry exact action"}
              </ActionButton>
            ) : (
              <>
                <ActionButton
                  primary
                  disabled={
                    !editable ||
                    !!comparison.archivedAt ||
                    (!selection.subjectKeys.length &&
                      !selection.passageIds.length)
                  }
                  onClick={() => void act("add")}
                >
                  Add selected items to portfolio
                </ActionButton>
                <ActionButton
                  disabled={
                    !!comparison.archivedAt ||
                    (comparison.portfolioId !== null && !editable)
                  }
                  onClick={onRevise}
                >
                  Create a new version
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    void act(comparison.archivedAt ? "restore" : "archive")
                  }
                >
                  {comparison.archivedAt
                    ? "Restore comparison"
                    : "Archive comparison"}
                </ActionButton>
              </>
            )}
          </div>
        </div>
      </Panel>
      <ComparisonProjection projection={version.capturedProjection} />
    </div>
  );
}
