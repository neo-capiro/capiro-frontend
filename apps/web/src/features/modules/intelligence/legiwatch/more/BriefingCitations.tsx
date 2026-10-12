"use client";
import { useState } from "react";
import type { z } from "zod";
import type { briefingCitation } from "../../../../../shared/capiro/operations/legiwatch-briefings";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextArea,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import type { EvidenceRef, EvidenceScope } from "../evidence/EvidenceActions";
import styles from "../legiwatch.module.css";

export type BriefingCitation = z.infer<typeof briefingCitation>;
export function BriefingCitations({
  refs,
  scope,
  citations,
  onAdd,
  disabled,
}: {
  refs: readonly EvidenceRef[];
  scope: EvidenceScope;
  citations: readonly BriefingCitation[];
  onAdd: (citation: BriefingCitation) => void;
  disabled: boolean;
}) {
  const [index, setIndex] = useState(0);
  const ref = refs[index];
  return (
    <Panel
      title="Exact source passages"
      description="Select a passage in each retained source. Every selected source needs a citation before saving."
    >
      <SelectField
        id="briefing-source"
        label="Selected evidence"
        value={String(index)}
        onChange={(value) => setIndex(Number(value))}
      >
        {refs.map((item, offset) => (
          <option key={`${item.kind}:${item.id}`} value={offset}>
            {item.kind} · {item.id} ·{" "}
            {citations.some(
              (citation) =>
                citation.kind === item.kind && citation.id === item.id,
            )
              ? "Cited"
              : "Citation needed"}
          </option>
        ))}
      </SelectField>
      {ref && (
        <CitationSource
          key={`${ref.kind}:${ref.id}`}
          refValue={ref}
          scope={scope}
          onAdd={onAdd}
          disabled={disabled}
        />
      )}
      <p className={styles.description}>
        {citations.length} exact passages selected.
      </p>
    </Panel>
  );
}
function CitationSource({
  refValue,
  scope,
  onAdd,
  disabled,
}: {
  refValue: EvidenceRef;
  scope: EvidenceScope;
  onAdd: (citation: BriefingCitation) => void;
  disabled: boolean;
}) {
  const query = useCapiroQuery("legiwatch.evidence.source", {
    params: { kind: refValue.kind, id: refValue.id },
    query: scope,
  });
  const [section, setSection] = useState(""),
    [selected, setSelected] = useState<{
      start: number;
      end: number;
      quote: string;
    } | null>(null);
  const source = query.data,
    sections = source?.sections ?? [],
    text = sections.length
      ? (sections.find((item) => item.locator === section)?.text ?? "")
      : (source?.text ?? "");
  const stale = source && source.revision !== refValue.revision;
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {source && (
        <div className={styles.form}>
          <h3>{source.title}</h3>
          <p className={styles.description}>
            {source.authority} · {source.rights} ·{" "}
            {source.complete
              ? "Complete retained text"
              : "Partial retained text"}
          </p>
          {stale && (
            <p role="alert" className={styles.error}>
              The retained revision changed. Close this briefing and review the
              source again.
            </p>
          )}
          {sections.length > 0 && (
            <SelectField
              id="briefing-source-section"
              label="Source section"
              value={section}
              onChange={(value) => {
                setSelected(null);
                setSection(value);
              }}
            >
              <option value="">Choose a section</option>
              {sections.map((item) => (
                <option key={item.locator} value={item.locator}>
                  {item.locator}
                </option>
              ))}
            </SelectField>
          )}
          <Field
            label="Select the exact passage to cite"
            htmlFor="briefing-source-text"
          >
            <TextArea
              id="briefing-source-text"
              readOnly
              value={text}
              style={{ minHeight: 220 }}
              onSelect={(event) => {
                const target = event.currentTarget;
                const start = target.selectionStart,
                  end = target.selectionEnd;
                setSelected(
                  end > start && end - start <= 5000
                    ? { start, end, quote: text.slice(start, end) }
                    : null,
                );
              }}
            />
          </Field>
          <ActionButton
            disabled={disabled || Boolean(stale) || !selected}
            onClick={() => {
              if (selected)
                onAdd({
                  ...refValue,
                  locator: sections.length ? section : refValue.locator,
                  ...selected,
                });
            }}
          >
            Add selected citation
          </ActionButton>
        </div>
      )}
    </StatusPanel>
  );
}
