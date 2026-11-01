import { Button } from "@capiro/ui/button";
import type {
  AuthoredInput,
  AuthoredOperation,
} from "../../../shared/meri-documents/federal-authoring";
import styles from "./files.module.css";

/** The exact ordered amendments the author has added to the current review,
 * including the intermediate hashes and dependencies the compiler will check. */
export function FederalAmendmentList({
  drafts,
  operations,
  disabled,
  onEdit,
  onRemove,
}: {
  drafts: readonly AuthoredInput[];
  operations: readonly AuthoredOperation[];
  disabled: boolean;
  onEdit: (operation: AuthoredInput) => void;
  onRemove: (operation: AuthoredInput) => void;
}) {
  if (!drafts.length) return null;
  return (
    <ol>
      {drafts.map((operation) => {
        const derived = operations.find((entry) => entry.id === operation.id);
        return (
          <li key={operation.id}>
            <span>
              {operation.id}:{" "}
              {operation.kind === "remove_source_text"
                ? "proposed removal of all selected source text"
                : `${operation.kind} in ${operation.scopeId}${operation.textMode === "decoded-xml" ? " · decoded text" : ""}`}
            </span>{" "}
            {operation.kind !== "remove_source_text" && (
              <Button
                disabled={disabled}
                onClick={() => onEdit(operation)}
                type="button"
              >
                Edit
              </Button>
            )}{" "}
            <Button
              disabled={disabled}
              onClick={() => onRemove(operation)}
              type="button"
            >
              Remove
            </Button>
            {derived ? (
              <>
                <p className={styles.identifier}>
                  {derived.kind === "remove_source_text"
                    ? `Original source hash: ${derived.expectedSourceSha256}`
                    : `Section hash: ${derived.expectedScopeSha256}`}
                </p>
                <p className={styles.identifier}>
                  {derived.kind === "remove_source_text"
                    ? "Current full-source text hash"
                    : "Text hash"}
                  : {derived.expectedTextSha256}
                </p>
                <p className={styles.identifier}>
                  Depends on:{" "}
                  {derived.dependsOn.length
                    ? derived.dependsOn.join(", ")
                    : "no earlier amendment"}
                </p>
              </>
            ) : (
              <p>
                Exact hashes and dependencies are unavailable until this
                amendment can be derived.
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
