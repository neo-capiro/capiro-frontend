"use client";
import { ActionButton } from "../../../../../shared/module-ui";
import { prebuiltSection, SECTION_CATEGORIES } from "./presets";
import type { StructureAction } from "./structure";
import styles from "../library/sections.module.css";
import workspace from "../workspace.module.css";

export function PrebuiltSections({
  change,
  disabled,
  expanded = false,
}: {
  change: (action: StructureAction) => void;
  disabled: boolean;
  expanded?: boolean;
}) {
  if (expanded)
    return (
      <div className={workspace.prebuilt}>
        {SECTION_CATEGORIES.map((category) => (
          <section key={category}>
            <h3>{category}</h3>
            {[0, 1, 2].map((variant) => (
              <button
                key={variant}
                disabled={disabled}
                onClick={() =>
                  change({
                    type: "insertSection",
                    section: prebuiltSection(category, (variant % 2) as 0 | 1),
                  })
                }
              >
                <span className={workspace.sectionMini} aria-hidden="true">
                  <i />
                  <b />
                  <i />
                </span>
                {category}{" "}
                {variant === 0
                  ? "banner"
                  : variant === 1
                    ? "columns"
                    : "center"}
              </button>
            ))}
          </section>
        ))}
      </div>
    );
  return (
    <details open={expanded || undefined}>
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
