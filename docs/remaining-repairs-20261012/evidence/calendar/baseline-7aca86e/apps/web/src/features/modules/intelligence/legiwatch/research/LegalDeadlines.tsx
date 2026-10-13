"use client";
import { useState } from "react";
import type { z } from "zod";
import type { legalDeadlineRow } from "../../../../../shared/capiro/operations/legiwatch-research-schemas";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SourceLink } from "../components";
import type { EvidenceScope } from "../evidence/EvidenceActions";
import styles from "../legiwatch.module.css";
import { DeadlineDraft } from "./DeadlineDraft";

export function LegalDeadlines({
  scope,
  canEdit,
}: {
  scope: EvidenceScope;
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<z.infer<
    typeof legalDeadlineRow
  > | null>(null);
  const [ruleNumber, setRule] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const rules = useCapiroQuery("legiwatch.research.rules", {
    query: { ...scope, ruleNumber },
  });
  const deadlines = useCapiroQuery("legiwatch.research.deadlines", {
    query: { ...scope, ...(from ? { from } : {}), ...(to ? { to } : {}) },
  });
  return (
    <div className={styles.form}>
      <p className={styles.banner}>
        Official notices and source-stated dates. Notices do not establish
        adopted law; no legal deadline is calculated from incomplete source
        information.
      </p>
      <Field label="Rule number" htmlFor="law-rule">
        <TextInput
          id="law-rule"
          value={ruleNumber}
          maxLength={60}
          onChange={(event) => setRule(event.target.value)}
        />
      </Field>
      <StatusPanel
        loading={rules.loading}
        error={rules.error}
        onRetry={rules.reload}
      >
        {rules.data?.rows.map((rule) => (
          <Panel
            key={rule.id}
            title={
              rule.payload.title ?? rule.payload.ruleTitle ?? rule.notice_id
            }
            description={rule.payload.noticeType}
          >
            <p className={styles.briefText}>
              {rule.payload.description ?? rule.payload.text}
            </p>
            <SourceLink href={rule.source_url}>Official notice</SourceLink>
            <p className={styles.description}>
              Observed {rule.observed_at} · Revision {rule.content_hash}
            </p>
          </Panel>
        ))}
        {rules.data?.adopted.map((rule) => (
          <Panel key={rule.id} title={rule.title ?? "Retained adopted rule"}>
            <SourceLink href={rule.source_url}>Adopted rule source</SourceLink>
            {rule.sections?.map((section) => (
              <details key={section.locator}>
                <summary>{section.locator}</summary>
                <p className={styles.briefText}>{section.text}</p>
              </details>
            ))}
          </Panel>
        ))}
      </StatusPanel>
      <div className={styles.filters}>
        <Field label="Dates from" htmlFor="law-from">
          <TextInput
            type="date"
            id="law-from"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="Dates through" htmlFor="law-to">
          <TextInput
            type="date"
            id="law-to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
      </div>
      <StatusPanel
        loading={deadlines.loading}
        error={deadlines.error}
        onRetry={deadlines.reload}
      >
        {deadlines.data?.rows.length === 0 && (
          <p>No retained source dates match this range.</p>
        )}
        {deadlines.data?.rows.map((deadline) => (
          <Panel
            key={deadline.id}
            title={`${deadline.date_only?.slice(0, 10) ?? "Date not resolved"} · ${deadline.kind?.replaceAll("_", " ") ?? "Published date"}`}
          >
            <blockquote>{deadline.raw_wording}</blockquote>
            <p>
              {deadline.precision} · {deadline.basis}
              {deadline.canceled ? " · Canceled" : ""}
            </p>
            <SourceLink href={deadline.source_url}>
              Review official notice
            </SourceLink>
            {canEdit && scope.folderId && (
              <ActionButton
                disabled={deadline.canceled}
                onClick={() => setSelected(deadline)}
              >
                Create deadline draft
              </ActionButton>
            )}
          </Panel>
        ))}
      </StatusPanel>
      {selected && scope.folderId && (
        <DeadlineDraft
          deadline={selected}
          scope={{ ...scope, folderId: scope.folderId }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
