"use client";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Layers } from "lucide-react";
import type { NewsletterDesign } from "@capiro/shared/newsletter";
import type { StructureAction } from "./content/structure";
import { PrebuiltSections } from "./content/PrebuiltSections";
import styles from "./workspace.module.css";

export function WorkspaceSections({
  design,
  change,
  edit,
  save,
  savedIds,
  browse,
  saved,
  tree,
}: {
  design: NewsletterDesign;
  change: (action: StructureAction) => void;
  edit: (id: string) => void;
  save: (id: string) => void;
  savedIds: readonly string[];
  browse: (opener: HTMLButtonElement) => void;
  saved: ReactNode;
  tree: ReactNode;
}) {
  const [tab, setTab] = useState("Manage");
  return (
    <>
      <h2>Sections</h2>
      <div className={styles.tabs} aria-label="Section views">
        {["Manage", "Pre-built", "Saved"].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={(event) => {
              setTab(name);
              if (name === "Saved") browse(event.currentTarget);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "Pre-built" ? (
        <PrebuiltSections
          expanded
          change={change}
          disabled={design.sections.length >= 50}
        />
      ) : tab === "Saved" ? (
        saved
      ) : (
        <>
          {design.sections.map((section, index) => (
            <div className={styles.sectionRow} key={section.id}>
              <button onClick={() => edit(section.id)}>
                <Layers size={16} />
                {section.name}
              </button>
              <button
                aria-label={`Move ${section.name} up`}
                disabled={index === 0}
                onClick={() =>
                  change({ type: "section", id: section.id, action: "up" })
                }
              >
                <ArrowUp size={14} />
              </button>
              <button
                aria-label={`Move ${section.name} down`}
                disabled={index === design.sections.length - 1}
                onClick={() =>
                  change({ type: "section", id: section.id, action: "down" })
                }
              >
                <ArrowDown size={14} />
              </button>
              <details className={styles.menu}>
                <summary aria-label={`${section.name} more options`}>⋯</summary>
                <div>
                  <button onClick={() => edit(section.id)}>Rename</button>
                  <button
                    onClick={() =>
                      change({
                        type: "section",
                        id: section.id,
                        action: "duplicate",
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
                    disabled={!savedIds.includes(section.id)}
                    onClick={() => save(section.id)}
                  >
                    Save section
                  </button>
                  <button
                    onClick={() =>
                      change({
                        type: "section",
                        id: section.id,
                        action: "delete",
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </details>
            </div>
          ))}
          <button
            disabled={design.sections.length >= 50}
            onClick={() => change({ type: "addSection" })}
          >
            Add blank section
          </button>
          <details>
            <summary>Content outline and keyboard placement</summary>
            {tree}
          </details>
        </>
      )}
    </>
  );
}
