import { Button } from "@capiro/ui/button";
import type { AuthoredOperation } from "../../../shared/meri-documents/federal-authoring";
import styles from "./files.module.css";

/** The exact ordered amendments the author has added to the current review,
 * including the intermediate hashes and dependencies the compiler will check. */
export function FederalAmendmentList({
  operations,
  disabled,
  onEdit,
  onRemove,
}: {
  operations: readonly AuthoredOperation[];
  disabled: boolean;
  onEdit: (operation: AuthoredOperation) => void;
  onRemove: (operation: AuthoredOperation) => void;
}) {
  if (!operations.length) return null;
  return (
    <ol>
      {operations.map((operation) => (
        <li key={operation.id}>
          <span>
            {operation.id}: {operation.kind} in {operation.scopeId}
          </span>{" "}
          <Button
            disabled={disabled}
            onClick={() => onEdit(operation)}
            type="button"
          >
            Edit
          </Button>{" "}
          <Button
            disabled={disabled}
            onClick={() => onRemove(operation)}
            type="button"
          >
            Remove
          </Button>
          <p className={styles.identifier}>
            Section hash: {operation.expectedScopeSha256}
          </p>
          <p className={styles.identifier}>
            Text hash: {operation.expectedTextSha256}
          </p>
          <p className={styles.identifier}>
            Depends on:{" "}
            {operation.dependsOn.length
              ? operation.dependsOn.join(", ")
              : "no earlier amendment"}
          </p>
        </li>
      ))}
    </ol>
  );
}
