"use client";
import type { PlannerProject } from "../../../shared/capiro/operations/planner-schemas";
import { Field, SelectInput } from "../../../shared/module-ui";
import styles from "./planner.module.css";
export type TaskProjectModel = {
  projects: PlannerProject[];
  projectIds: string[];
  setProjects: (ids: string[]) => void;
  sectionIds: Record<string, string | null>;
  setSections: (sections: Record<string, string | null>) => void;
  disabled?: boolean;
  showSections?: boolean;
};
export function TaskProjectFields({
  projects,
  projectIds,
  setProjects,
  sectionIds,
  setSections,
  disabled,
  showSections = false,
}: TaskProjectModel) {
  return (
    <fieldset>
      <legend>Projects</legend>
      {projects
        .filter(
          (project) =>
            !project.archived ||
            (showSections && projectIds.includes(project.id)),
        )
        .map((project) => {
          const selected = projectIds.includes(project.id);
          const sectionId = sectionIds[project.id] ?? "";
          const unavailable =
            !!sectionId &&
            !project.sections.some((section) => section.id === sectionId);
          return (
            <div key={project.id} className={styles.stack}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={
                    disabled ||
                    (!selected && !["admin", "editor"].includes(project.access))
                  }
                  onChange={(event) =>
                    setProjects(
                      event.target.checked
                        ? [...projectIds, project.id]
                        : projectIds.filter((id) => id !== project.id),
                    )
                  }
                />
                {project.name}
                {project.archived ? " (archived)" : ""}
              </label>
              {selected && showSections && (
                <Field
                  label={`${project.name} section`}
                  htmlFor={`task-section-${project.id}`}
                >
                  <SelectInput
                    id={`task-section-${project.id}`}
                    disabled={
                      disabled ||
                      project.archived ||
                      !["admin", "editor"].includes(project.access)
                    }
                    value={sectionId}
                    onValueChange={(value) =>
                      setSections({
                        ...sectionIds,
                        [project.id]: value || null,
                      })
                    }
                    options={[
                      { value: "", label: "Unsectioned" },
                      ...(unavailable
                        ? [
                            {
                              value: sectionId,
                              label: "Saved section unavailable",
                              disabled: true,
                            },
                          ]
                        : []),
                      ...project.sections.map((section) => ({
                        value: section.id,
                        label: section.name,
                      })),
                    ]}
                  />
                </Field>
              )}
            </div>
          );
        })}
      {showSections &&
        projectIds
          .filter((id) => !projects.some((project) => project.id === id))
          .map((id) => (
            <p className={styles.note} key={id}>
              A saved project membership is unavailable and will be preserved.
            </p>
          ))}
    </fieldset>
  );
}
