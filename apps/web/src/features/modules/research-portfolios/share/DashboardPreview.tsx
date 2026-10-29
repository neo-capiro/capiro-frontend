"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { SelectInput } from "../../../../shared/module-ui";
import styles from "./share.module.css";

/** Width changes only the viewport; the recipient renderer and frozen payload stay identical. */
export function DashboardPreview({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState("1120");
  return (
    <div className={styles.stack}>
      <SelectInput
        aria-label="Preview as recipient"
        value={width}
        onValueChange={setWidth}
        options={[
          { value: "1120", label: "Desktop · 1120 px" },
          { value: "768", label: "Tablet · 768 px" },
          { value: "390", label: "Phone · 390 px" },
        ]}
      />
      <div className={styles.previewScroll}>
        <div className={styles.previewWidth} style={{ width: Number(width) }}>
          <div className={styles.page} style={{ minHeight: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
