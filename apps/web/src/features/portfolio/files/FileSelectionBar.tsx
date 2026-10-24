"use client";
import styles from "./files.module.css";

export function FileSelectionBar({
  visibleCount,
  selectedCount,
  hiddenSelectedCount,
  onClear,
  onMove,
}: {
  visibleCount: number;
  selectedCount: number;
  hiddenSelectedCount: number;
  onClear: () => void;
  onMove: () => void;
}) {
  return (
    <>
      <div className={styles.selectionBar}>
        <span aria-live="polite" aria-atomic="true">
          {visibleCount} files · {selectedCount} selected
          {hiddenSelectedCount > 0 &&
            ` · ${hiddenSelectedCount} outside this view`}
        </span>
        <div className="row">
          <button
            className="button ghost"
            disabled={selectedCount === 0}
            onClick={onClear}
          >
            Clear selection
          </button>
          <button
            className="button"
            disabled={selectedCount === 0 || selectedCount > 100}
            onClick={onMove}
          >
            Move to folder
          </button>
        </div>
      </div>
      {selectedCount > 100 && (
        <p role="status">Select at most 100 files to move together.</p>
      )}
    </>
  );
}
