"use client";
import { ActionButton } from "../../../../../shared/module-ui";
import { prebuiltSection, SECTION_CATEGORIES } from "./presets";
import type { StructureAction } from "./structure";
import styles from "../library/sections.module.css";

export function PrebuiltSections({
  change,
  disabled,
}: {
  change: (action: StructureAction) => void;
  disabled: boolean;
}) {
  return (
    <details>
      <summary>Prebuilt sections</summary>
      <p>Add a local layout, then replace its sample content before sending.</p>
      {SECTION_CATEGORIES.map((category) => (
        <div key={category} className={styles.actions}>
          {([0, 1] as const).map((variant) => (
            <ActionButton
              key={variant}
              className={styles.button}
              disabled={disabled}
              onClick={() =>
                change({
                  type: "insertSection",
                  section: prebuiltSection(category, variant),
                })
              }
            >{`${category} ${variant + 1}`}</ActionButton>
          ))}
        </div>
      ))}
    </details>
  );
}
