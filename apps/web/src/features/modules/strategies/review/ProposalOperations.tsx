import { DataTable, Panel } from "../../../../shared/module-ui";
import type { ProposalOperation } from "./proposal-operations";
import { proposalOperationTitle } from "./proposal-operations";
import styles from "../strategies.module.css";

export function ProposalOperationSummary({
  operation,
}: {
  operation: ProposalOperation;
}) {
  return (
    <span>
      <strong>{proposalOperationTitle(operation)}</strong>
      <small className={styles.secondary}>
        {operation.state === "supported"
          ? operation.edit.op +
            " · " +
            (operation.edit.startsOn ?? "Date unchanged")
          : "This stored operation cannot be selected or applied."}
      </small>
    </span>
  );
}

export function ProposalOperationSelection({
  title,
  operations,
  selected,
  enabled,
  pending,
  onSelection,
}: {
  title: string;
  operations: ProposalOperation[];
  selected: number[];
  enabled: boolean;
  pending: boolean;
  onSelection: (indexes: number[]) => void;
}) {
  return (
    <Panel title={title} description="Only supported changes can be selected.">
      {!operations.length && (
        <p>No operations are available in this selection.</p>
      )}
      {operations.map((operation) => (
        <label key={operation.index} className={styles.check}>
          <input
            type="checkbox"
            checked={selected.includes(operation.index)}
            disabled={!enabled || pending || operation.state !== "supported"}
            onChange={(event) => {
              if (!enabled || pending || operation.state !== "supported")
                return;
              onSelection(
                event.target.checked
                  ? [...selected, operation.index]
                  : selected.filter((index) => index !== operation.index),
              );
            }}
          />
          <ProposalOperationSummary operation={operation} />
        </label>
      ))}
    </Panel>
  );
}

export function ProposalOperationAudit({
  operations,
  title = "Original change details",
}: {
  operations: ProposalOperation[];
  title?: string;
}) {
  return (
    <Panel
      title={title}
      description="All stored operations remain auditable in their original order."
    >
      <DataTable
        rows={operations}
        rowKey={(operation) => String(operation.index)}
        caption={title}
        columns={[
          {
            key: "index",
            label: "OPERATION",
            render: (operation) => operation.index + 1,
          },
          {
            key: "action",
            label: "ACTION",
            render: (operation) =>
              operation.state === "supported"
                ? operation.edit.op
                : "Unsupported",
          },
          {
            key: "step",
            label: "STEP",
            render: (operation) => proposalOperationTitle(operation),
          },
          {
            key: "fields",
            label: "AFTER",
            render: (operation) =>
              operation.state === "supported" ? (
                <span>
                  {operation.edit.note ?? ""}
                  <span className={styles.secondary}>
                    {[
                      operation.edit.startsOn,
                      operation.edit.status,
                      operation.edit.ownerUserId,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              ) : (
                "Original details retained"
              ),
          },
        ]}
      />
      {operations.map((operation) => (
        <details key={operation.index}>
          <summary>
            {"Original stored details · Operation " + (operation.index + 1)}
          </summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {JSON.stringify(operation.raw, null, 2)}
          </pre>
        </details>
      ))}
    </Panel>
  );
}
