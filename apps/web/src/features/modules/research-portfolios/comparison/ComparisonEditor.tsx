"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import {
  comparisonSubjectTypes,
  type SavedComparison,
  type SaveComparison,
} from "../../../../shared/capiro/operations/research-comparisons";
import type { ResearchDetail } from "../../../../shared/capiro/operations/research-schemas";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import { ComparisonCapture } from "./ComparisonCapture";
import styles from "../research.module.css";

export function ComparisonEditor({
  portfolio,
  existing,
  onSaved,
}: {
  portfolio: ResearchDetail;
  existing?: SavedComparison;
  onSaved: (saved: SavedComparison) => void;
}) {
  const eligible = portfolio.members.filter((member) =>
    comparisonSubjectTypes.includes(
      member.targetKind as SaveComparison["subjects"][number]["type"],
    ),
  );
  const initial =
    existing?.currentVersion.subjects ??
    eligible.slice(0, 2).map((member) => ({
      type: member.targetKind as SaveComparison["subjects"][number]["type"],
      id: member.targetId,
    }));
  const [subjects, setSubjects] = useState<SaveComparison["subjects"]>([
    ...initial,
    ...Array.from({ length: Math.max(0, 2 - initial.length) }, () => ({
      type: "program_element" as const,
      id: "",
    })),
  ]);
  const [tokens, setTokens] = useState("");
  const [error, setError] = useState<string>();
  const preview = useCapiroQuery(
    "research.comparisons.preview",
    { query: { subjects: tokens } },
    { enabled: !!tokens },
  );
  const previewMatches =
    tokens ===
    subjects.map((subject) => `${subject.type}:${subject.id.trim()}`).join(",");
  function loadPreview() {
    const keys = subjects.map(
      (subject) => `${subject.type}:${subject.id.trim()}`,
    );
    if (
      subjects.some(
        (subject) => !subject.id.trim() || subject.id.includes(","),
      ) ||
      new Set(keys).size !== keys.length
    ) {
      setError(
        "Choose 2–5 distinct exact subject identifiers. Identifiers cannot contain commas.",
      );
      return;
    }
    setError(undefined);
    const next = keys.join(",");
    if (next === tokens) preview.reload();
    else setTokens(next);
  }
  return (
    <div className={styles.stack}>
      <Panel
        title="Choose comparison subjects"
        description="Compare 2–5 canonical public subjects. This preview reads current sources; saved versions retain their own captured evidence."
      >
        <div className={styles.content}>
          {subjects.map((subject, index) => (
            <div className={styles.toolbar} key={index}>
              <Field
                label={`Subject ${index + 1} type`}
                htmlFor={`comparison-type-${index}`}
              >
                <select
                  className={styles.select}
                  id={`comparison-type-${index}`}
                  value={subject.type}
                  onChange={(event) =>
                    setSubjects(
                      subjects.map((item, at) =>
                        at === index
                          ? {
                              ...item,
                              type: event.target.value as typeof subject.type,
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {comparisonSubjectTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={`Subject ${index + 1} identifier`}
                htmlFor={`comparison-id-${index}`}
              >
                <TextInput
                  id={`comparison-id-${index}`}
                  value={subject.id}
                  maxLength={256}
                  list="comparison-members"
                  onChange={(event) =>
                    setSubjects(
                      subjects.map((item, at) =>
                        at === index
                          ? { ...item, id: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              {subjects.length > 2 && (
                <ActionButton
                  onClick={() =>
                    setSubjects(subjects.filter((_, at) => at !== index))
                  }
                >
                  Remove subject {index + 1}
                </ActionButton>
              )}
            </div>
          ))}
          <datalist id="comparison-members">
            {eligible.map((member) => (
              <option key={member.id} value={member.targetId}>
                {member.label} ({member.targetKind})
              </option>
            ))}
          </datalist>
          <StatusPanel error={error} />
          <div className={styles.toolbar}>
            <ActionButton
              disabled={subjects.length >= 5}
              onClick={() =>
                setSubjects([...subjects, { type: "program_element", id: "" }])
              }
            >
              Add subject
            </ActionButton>
            <ActionButton
              primary
              disabled={preview.loading}
              onClick={loadPreview}
            >
              Load source preview
            </ActionButton>
          </div>
        </div>
      </Panel>
      <StatusPanel
        loading={preview.loading}
        error={preview.error}
        onRetry={preview.reload}
      >
        {preview.data && previewMatches && (
          <ComparisonCapture
            key={`${tokens}:${JSON.stringify(preview.data)}`}
            projection={preview.data}
            portfolioId={portfolio.id}
            existing={existing}
            canAttach={
              portfolio.myRole !== "viewer" && portfolio.lifecycle === "active"
            }
            onSaved={onSaved}
          />
        )}
        {preview.data && !previewMatches && (
          <p>Subjects changed. Load a new source preview before saving.</p>
        )}
      </StatusPanel>
    </div>
  );
}
