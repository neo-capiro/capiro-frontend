"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import type { EvidenceScope } from "./EvidenceActions";
import type { useEvidenceSelection } from "./use-evidence-selection";

export function PersonnelEvidence({
  kind,
  scope,
  selection,
  canSave,
}: {
  kind: "change" | "registration";
  scope: EvidenceScope;
  selection: ReturnType<typeof useEvidenceSelection>;
  canSave: boolean;
}) {
  const [q, setQuery] = useState(""),
    [year, setYear] = useState(new Date().getFullYear()),
    [branch, setBranch] = useState<"" | "legislative" | "executive">(""),
    [offset, setOffset] = useState(0);
  const data = useCapiroQuery("legiwatch.evidence.personnel", {
    query: { ...scope, kind, q, year, branch, offset },
  });
  return (
    <div className={styles.form}>
      <div className={styles.filters}>
        <Field label="Search retained observations" htmlFor="personnel-query">
          <TextInput
            id="personnel-query"
            value={q}
            maxLength={200}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
          />
        </Field>
        <Field label="Year" htmlFor="personnel-year">
          <TextInput
            id="personnel-year"
            type="number"
            min={1900}
            max={2200}
            value={year}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isInteger(next) && next >= 1900 && next <= 2200) {
                setYear(next);
                setOffset(0);
              }
            }}
          />
        </Field>
        <SelectField
          id="personnel-branch"
          label="Branch"
          value={branch}
          onChange={(value) => {
            if (
              value === "" ||
              value === "legislative" ||
              value === "executive"
            ) {
              setBranch(value);
              setOffset(0);
            }
          }}
        >
          <option value="">All branches</option>
          <option value="legislative">Legislative</option>
          <option value="executive">Executive</option>
        </SelectField>
      </div>
      <StatusPanel
        loading={data.loading}
        error={data.error}
        onRetry={data.reload}
      >
        {data.data && (
          <>
            <p className={styles.banner}>{data.data.notice}</p>
            <div className={styles.list}>
              {data.data.items.map((item) => (
                <article className={styles.listItem} key={item.id}>
                  <strong>{item.name}</strong>
                  <p className={styles.description}>
                    {[item.branch, item.firm, item.principal, item.confirmation]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · Observed {item.observed_at}
                  </p>
                  <div className={styles.actions}>
                    <ActionButton
                      onClick={() =>
                        selection.setExact({ kind: "personnel", id: item.id })
                      }
                    >
                      Exact source
                    </ActionButton>
                    <ActionButton
                      disabled={!canSave}
                      onClick={() =>
                        selection.setTracking({
                          kind: "personnel",
                          id: item.id,
                          version: item.tracking_version ?? 0,
                          saved: item.saved,
                        })
                      }
                    >
                      {item.saved ? "Remove from folder" : "Save to folder"}
                    </ActionButton>
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.pagination}>
              <span>
                Retained observations {offset + 1}–
                {offset + data.data.items.length}
              </span>
              <div className={styles.actions}>
                <ActionButton
                  disabled={!offset}
                  onClick={() => setOffset(Math.max(0, offset - 100))}
                >
                  Previous
                </ActionButton>
                <ActionButton
                  disabled={data.data.nextOffset === null}
                  onClick={() => setOffset(data.data!.nextOffset!)}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          </>
        )}
      </StatusPanel>
    </div>
  );
}
