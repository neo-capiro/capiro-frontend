"use client";
import { useState } from "react";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  saveComparisonBody,
  type ComparisonProjection as Projection,
  type SavedComparison,
  type SaveComparison,
} from "../../../../shared/capiro/operations/research-comparisons";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../shared/module-ui";
import {
  comparisonBasisFromKey,
  comparisonPins,
  comparisonRequestRefused,
  selectedComparisonProjection,
} from "./comparison-state";
import { ComparisonProjection } from "./ComparisonProjection";
import styles from "../research.module.css";

export function ComparisonCapture({
  projection,
  portfolioId,
  existing,
  canAttach,
  onSaved,
}: {
  projection: Projection;
  portfolioId: string;
  existing?: SavedComparison;
  canAttach: boolean;
  onSaved: (saved: SavedComparison) => void;
}) {
  const funding = projection.metrics.filter(
    (metric) =>
      metric.metric !== "passage" && metric.key.split("|").length === 7,
  );
  const passages = [
    ...new Map(
      projection.metrics
        .filter((metric) => metric.metric === "passage")
        .flatMap((metric) =>
          metric.cells.flatMap((cell) =>
            cell.evidence
              .filter((evidence) =>
                evidence.evidenceRefId.startsWith("context-compare:"),
              )
              .map(
                (evidence) =>
                  [
                    evidence.evidenceRefId.slice("context-compare:".length),
                    {
                      label: `${projection.subjects.find((subject) => subject.key === cell.subjectKey)?.label ?? cell.subjectKey} — ${metric.label}`,
                      evidence,
                    },
                  ] as const,
              ),
          ),
        ),
    ).entries(),
  ];
  const [name, setName] = useState(existing?.name ?? "");
  const [left, setLeft] = useState(funding[0]?.key ?? "");
  const [right, setRight] = useState(funding[1]?.key ?? funding[0]?.key ?? "");
  const [subjectKeys, setSubjectKeys] = useState(
    projection.subjects.map((subject) => subject.key),
  );
  const [passageIds, setPassageIds] = useState<string[]>([]);
  const [attempt, setAttempt] = useState<{
    body: SaveComparison;
    id?: string;
  }>();
  const [error, setError] = useState<Error>();
  const create = useCapiroMutation("research.comparisons.create"),
    revise = useCapiroMutation("research.comparisons.revise");
  const pending = create.pending || revise.pending;
  const selection = { mode: "explicit" as const, subjectKeys, passageIds };
  const preview = selectedComparisonProjection(projection, selection, [
    left,
    right,
  ]);
  async function save(asNew: boolean) {
    try {
      const request = attempt ?? {
        id: asNew ? undefined : existing?.id,
        body: saveComparisonBody.parse({
          schemaVersion: "defense_saved_comparison_v1",
          displayVersion: "defense-compare-display-v1",
          name,
          subjects: projection.subjects.map(({ type, id }) => ({ type, id })),
          selection,
          basisPair: {
            left: comparisonBasisFromKey(left),
            right: comparisonBasisFromKey(right),
          },
          passageMode: passageIds.length ? "native_sections" : "none",
          contextualRevisionPins: comparisonPins(projection),
          portfolioId: !asNew && existing ? existing.portfolioId : portfolioId,
          idempotencyKey: crypto.randomUUID(),
          ...(!asNew && existing
            ? { expectedRevision: existing.revision }
            : {}),
        }),
      };
      setAttempt(request);
      setError(undefined);
      const result = request.id
        ? await revise.run({ params: { id: request.id }, body: request.body })
        : await create.run({ body: request.body });
      setAttempt(undefined);
      onSaved(result.comparison);
    } catch (caught) {
      if (comparisonRequestRefused(caught)) setAttempt(undefined);
      setError(
        caught instanceof Error
          ? caught
          : new Error("Comparison could not be saved."),
      );
    }
  }
  const toggle = (items: string[], key: string, checked: boolean) =>
    checked ? [...items, key] : items.filter((item) => item !== key);
  return (
    <>
      <Panel
        title={existing ? "Capture a new version" : "Save this comparison"}
        description="Choose the subjects, funding bases and native passages to retain. Core captures the source revisions; it does not reconstruct an arbitrary historical date."
      >
        <div className={styles.content}>
          <fieldset disabled={pending || !!attempt} className={styles.form}>
            <legend>Capture selection</legend>
            <Field label="Comparison name" htmlFor="comparison-name">
              <TextInput
                id="comparison-name"
                value={name}
                maxLength={200}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <fieldset>
              <legend>Subjects to retain</legend>
              {projection.subjects.map((subject) => (
                <label key={subject.key}>
                  <input
                    type="checkbox"
                    checked={subjectKeys.includes(subject.key)}
                    onChange={(event) =>
                      setSubjectKeys(
                        toggle(subjectKeys, subject.key, event.target.checked),
                      )
                    }
                  />{" "}
                  {subject.label}{" "}
                </label>
              ))}
            </fieldset>
            {(
              [
                ["Left funding basis", left, setLeft],
                ["Right funding basis", right, setRight],
              ] as const
            ).map(([label, value, setValue], index) => (
              <Field
                key={label}
                label={label}
                htmlFor={`comparison-basis-${index}`}
              >
                <select
                  className={styles.select}
                  id={`comparison-basis-${index}`}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                >
                  <option value="">No funding basis selected</option>
                  {funding.map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label} · {metric.period} · {metric.unit} ·{" "}
                      {metric.key}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <fieldset>
              <legend>Native passages to retain</legend>
              {passages.length ? (
                passages.map(([id, passage]) => (
                  <label key={id} style={{ display: "block" }}>
                    <input
                      type="checkbox"
                      checked={passageIds.includes(id)}
                      onChange={(event) =>
                        setPassageIds(
                          toggle(passageIds, id, event.target.checked),
                        )
                      }
                    />{" "}
                    {passage.label}
                  </label>
                ))
              ) : (
                <p>
                  No qualified native passage identifiers are available in this
                  preview.
                </p>
              )}
            </fieldset>
          </fieldset>
          <StatusPanel error={error} />
          {attempt && error && (
            <p>
              The request is retained. Retry sends the same idempotency key and
              captured input; no second save is started automatically.
            </p>
          )}
          <div className={styles.toolbar}>
            <ActionButton
              primary
              disabled={
                pending || (!attempt && (!name.trim() || !subjectKeys.length))
              }
              onClick={() => void save(false)}
            >
              {pending
                ? "Saving…"
                : attempt
                  ? "Retry exact save"
                  : existing
                    ? "Save new version"
                    : "Save comparison"}
            </ActionButton>
            {existing && !attempt && (
              <ActionButton
                disabled={
                  pending || !canAttach || !name.trim() || !subjectKeys.length
                }
                onClick={() => void save(true)}
              >
                Save as a new comparison
              </ActionButton>
            )}
          </div>
        </div>
      </Panel>
      <ComparisonProjection projection={preview} />
    </>
  );
}
