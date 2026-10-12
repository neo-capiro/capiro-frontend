"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Modal,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField, SourceLink } from "../components";
import type { EvidenceScope } from "../evidence/EvidenceActions";
import styles from "../legiwatch.module.css";

export function ResearchVersions({
  scope,
  billId,
  onClose,
}: {
  scope: EvidenceScope;
  billId: string;
  onClose: () => void;
}) {
  const versions = useCapiroQuery("legiwatch.research.versions", {
    query: { ...scope, billId, sessionKey: scope.sessionKey ?? "" },
  });
  const [leftId, setLeft] = useState(""),
    [rightId, setRight] = useState("");
  const compare = useCapiroMutation("legiwatch.research.compare");
  const options = versions.data?.versions ?? [];
  const run = async () => {
    const left = options.find((item) => item.id === leftId),
      right = options.find((item) => item.id === rightId);
    if (!left || !right) return;
    try {
      await compare.run({
        body: {
          ...scope,
          leftId,
          rightId,
          leftRevision: left.revision,
          rightRevision: right.revision,
          allowCrossBill: false,
        },
      });
    } catch {
      /* Keep exact selected versions for review. */
    }
  };
  return (
    <Modal
      open
      title="Compare retained versions"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className={styles.form}>
        <StatusPanel
          loading={versions.loading}
          error={versions.error}
          onRetry={versions.reload}
        >
          <p className={styles.banner}>
            Versions are ordered by source identity. This order does not
            establish the legislative sequence.{" "}
            {versions.data &&
              !versions.data.complete &&
              "The version list is partial."}
          </p>
          <fieldset disabled={compare.pending} className={styles.form}>
            <SelectField
              id="research-left"
              label="Earlier selection"
              value={leftId}
              onChange={(value) => {
                setLeft(value);
                compare.reset();
              }}
            >
              <option value="">Choose retained version</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title ?? item.kind} · {item.publishedDate ?? "Undated"}{" "}
                  · {item.revision.slice(0, 12)}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="research-right"
              label="Later selection"
              value={rightId}
              onChange={(value) => {
                setRight(value);
                compare.reset();
              }}
            >
              <option value="">Choose retained version</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title ?? item.kind} · {item.publishedDate ?? "Undated"}{" "}
                  · {item.revision.slice(0, 12)}
                </option>
              ))}
            </SelectField>
            <ActionButton
              primary
              disabled={!leftId || !rightId || leftId === rightId}
              onClick={() => void run()}
            >
              Compare exact revisions
            </ActionButton>
          </fieldset>
        </StatusPanel>
        {compare.error && <p role="alert">{compare.error.message}</p>}
        {compare.data && (
          <section
            className={styles.form}
            aria-label="Retained text comparison"
          >
            <p className={styles.banner}>{compare.data.warning}</p>
            <strong>{compare.data.classification.replaceAll("_", " ")}</strong>
            <div className={styles.actions}>
              <SourceLink href={compare.data.left.sourceUrl}>
                Left source
              </SourceLink>
              <SourceLink href={compare.data.right.sourceUrl}>
                Right source
              </SourceLink>
            </div>
            {compare.data.changes.map((change, index) => (
              <div key={index} className={styles.briefText}>
                <strong>{change.kind}</strong> ·{" "}
                {change.left?.locator ?? change.right?.locator}
                <p>{change.text}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </Modal>
  );
}
