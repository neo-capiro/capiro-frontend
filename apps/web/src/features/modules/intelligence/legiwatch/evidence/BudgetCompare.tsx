"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  budgetComparison,
  retainedAmount,
} from "../../../../../shared/capiro/operations/legiwatch-budget-schemas";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { ActionButton, Modal } from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import type { EvidenceScope } from "./EvidenceActions";
import { formatMinorUnits, retainedAmountLabel } from "./budget-presentation";

type Amount = z.infer<typeof retainedAmount>;
export function BudgetCompare({
  amounts,
  scope,
  onClose,
  onSource,
}: {
  amounts: readonly Amount[];
  scope: EvidenceScope;
  onClose: () => void;
  onSource: (id: string) => void;
}) {
  const [leftId, setLeft] = useState(amounts[0]?.id ?? ""),
    [rightId, setRight] = useState(amounts[1]?.id ?? "");
  const comparison = useCapiroMutation("legiwatch.evidence.budget.compare");
  const left = amounts.find((amount) => amount.id === leftId),
    right = amounts.find((amount) => amount.id === rightId);
  const compare = async () => {
    if (!left || !right || left.id === right.id) return;
    try {
      await comparison.run({
        body: {
          ...scope,
          leftId: left.id,
          rightId: right.id,
          leftRevision: left.observation.sourceRevision,
          rightRevision: right.observation.sourceRevision,
        },
      });
    } catch {
      /* Keep exact operands and display the service error. */
    }
  };
  return (
    <Modal
      open
      title="Compare retained amounts"
      description="Choose different amount observations from exact retained source revisions."
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <>
          <ActionButton onClick={onClose}>Close</ActionButton>
          <ActionButton
            primary
            disabled={
              comparison.pending || !left || !right || leftId === rightId
            }
            onClick={() => void compare()}
          >
            Compare selected amounts
          </ActionButton>
        </>
      }
    >
      <fieldset disabled={comparison.pending} className={styles.form}>
        <BudgetOperand
          label="Operand A"
          value={leftId}
          amounts={amounts}
          onChange={(value) => {
            comparison.reset();
            setLeft(value);
          }}
        />
        <BudgetOperand
          label="Operand B"
          value={rightId}
          amounts={amounts}
          onChange={(value) => {
            comparison.reset();
            setRight(value);
          }}
        />
      </fieldset>
      {comparison.error && (
        <p className={styles.error} role="alert">
          {comparison.error.message}
        </p>
      )}
      {comparison.data && (
        <ComparisonResult data={comparison.data} onSource={onSource} />
      )}
      <p className={styles.description}>
        Requests and chamber alternatives are not awards. Comparability and the
        exact difference are determined by the service; a zero baseline has no
        percentage.
      </p>
    </Modal>
  );
}
function BudgetOperand({
  label,
  value,
  amounts,
  onChange,
}: {
  label: string;
  value: string;
  amounts: readonly Amount[];
  onChange: (value: string) => void;
}) {
  return (
    <SelectField
      id={label === "Operand A" ? "budget-left" : "budget-right"}
      label={label}
      value={value}
      onChange={onChange}
    >
      <option value="">Choose an observation</option>
      {amounts.map((amount) => (
        <option key={amount.id} value={amount.id}>
          {amount.observation.chamber} · {amount.observation.stage} ·{" "}
          {amount.observation.fund} · {retainedAmountLabel(amount.observation)}{" "}
          · {amount.observation.locator}
        </option>
      ))}
    </SelectField>
  );
}
function ComparisonResult({
  data,
  onSource,
}: {
  data: z.infer<typeof budgetComparison>;
  onSource: (id: string) => void;
}) {
  return (
    <div className={styles.banner}>
      <strong>
        {data.comparable
          ? "Comparable retained amounts"
          : "Comparison unavailable"}
      </strong>
      {data.comparable && data.deltaMinorUnits !== null && (
        <p>
          Difference: {formatMinorUnits(data.deltaMinorUnits)} ·{" "}
          {data.percentage ?? "Percentage undefined"}
        </p>
      )}
      {data.reasons.length > 0 && (
        <p>
          {data.reasons
            .map((reason) => reason.replaceAll("_", " "))
            .join(" · ")}
        </p>
      )}
      <div className={styles.actions}>
        <ActionButton onClick={() => onSource(data.left.documentId)}>
          Exact source A
        </ActionButton>
        <ActionButton onClick={() => onSource(data.right.documentId)}>
          Exact source B
        </ActionButton>
      </div>
    </div>
  );
}
