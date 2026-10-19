"use client";
import { useState } from "react";
import type { z } from "zod";
import type { keywordConfig } from "../../../../../shared/capiro/operations/legiwatch-keyword-schemas";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
} from "../../../../../shared/module-ui";
import { SourceLink } from "../components";
import styles from "../legiwatch.module.css";
type Config = z.infer<typeof keywordConfig>;
export function KeywordDefinitions({
  scope,
  definitions,
  readOnly,
  onChange,
}: {
  scope: Config["scope"];
  definitions: Config["definitions"];
  readOnly: boolean;
  onChange: (value: Config["definitions"]) => void;
}) {
  const [selected, setSelected] = useState<string>();
  return (
    <div className={styles.form}>
      {readOnly && (
        <p className={styles.banner}>
          Captured definitions remain immutable. Create a new rule for a
          replacement interpretation.
        </p>
      )}
      {definitions.map((definition, index) => (
        <div key={definition.id} className={styles.form}>
          <Field
            label={`Definition ${index + 1}`}
            htmlFor={`keyword-definition-${index}`}
          >
            <TextArea
              id={`keyword-definition-${index}`}
              value={definition.raw}
              readOnly={readOnly}
              maxLength={4096}
              onChange={(event) =>
                onChange(
                  definitions.map((item) =>
                    item.id === definition.id
                      ? { ...item, raw: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <div className={styles.actions}>
            <ActionButton
              disabled={!scope.sessionKey || !scope.fields.length}
              onClick={() => setSelected(definition.raw)}
            >
              Preview interpretation and matches
            </ActionButton>
            {!readOnly && (
              <ActionButton
                onClick={() =>
                  onChange(
                    definitions.filter((item) => item.id !== definition.id),
                  )
                }
              >
                Remove definition
              </ActionButton>
            )}
          </div>
        </div>
      ))}
      {!readOnly && (
        <ActionButton
          disabled={definitions.length >= 190}
          onClick={() =>
            onChange([...definitions, { id: crypto.randomUUID(), raw: "" }])
          }
        >
          Add definition
        </ActionButton>
      )}
      {selected !== undefined && (
        <KeywordPreview
          key={JSON.stringify([scope, selected])}
          scope={scope}
          raw={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </div>
  );
}
function KeywordPreview({
  scope,
  raw,
  onClose,
}: {
  scope: Config["scope"];
  raw: string;
  onClose: () => void;
}) {
  const mutation = useCapiroMutation("legiwatch.keyword.preview");
  const load = async (next = false) => {
    try {
      await mutation.run({
        body: {
          scope,
          raw,
          ...(next && mutation.data?.next
            ? { cursor: mutation.data.next, boundary: mutation.data.boundary }
            : {}),
        },
      });
    } catch {
      /* A changed source requires a fresh preview. */
    }
  };
  return (
    <Modal
      open
      title="Keyword interpretation preview"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className={styles.form}>
        <p>{raw}</p>
        <ActionButton disabled={mutation.pending} onClick={() => void load()}>
          Inspect retained source page
        </ActionButton>
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
        {mutation.data && (
          <>
            <strong>{mutation.data.compiled.status}</strong>
            <p>{mutation.data.compiled.interpretation}</p>
            {mutation.data.compiled.reasons.map((reason) => (
              <p key={reason} className={styles.gap}>
                {reason}
              </p>
            ))}
            <p>{mutation.data.scanned} bills inspected on this page.</p>
            {mutation.data.rows.map((row) => (
              <section className={styles.card} key={row.bill.id}>
                <h3>
                  {row.bill.number} · {row.bill.title}
                </h3>
                {row.documents.map((document) => (
                  <div key={document.id}>
                    <p>
                      {document.kind} ·{" "}
                      {document.evaluation.outcome.replaceAll("_", " ")}
                    </p>
                    {document.evaluation.results
                      .flatMap((result) => result.evidence)
                      .map((evidence, index) => (
                        <blockquote key={index}>{evidence.quote}</blockquote>
                      ))}
                    <SourceLink href={document.sourceUrl}>
                      Exact source
                    </SourceLink>
                  </div>
                ))}
                {row.coverage.missing.map((gap) => (
                  <p className={styles.gap} key={gap}>
                    {gap}
                  </p>
                ))}
              </section>
            ))}
            <ActionButton
              disabled={!mutation.data.next || mutation.pending}
              onClick={() => void load(true)}
            >
              Next inspected page
            </ActionButton>
          </>
        )}
      </div>
    </Modal>
  );
}
