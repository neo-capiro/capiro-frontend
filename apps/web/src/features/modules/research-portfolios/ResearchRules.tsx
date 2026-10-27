"use client";
import { useEffect, useState } from "react";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import {
  blankRule,
  readableRule,
  ResearchRuleEditor,
} from "./ResearchRuleEditor";
import { researchPortfolioHref } from "./research-navigation";
import styles from "./research.module.css";
export function ResearchRules({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const params = { id: portfolio.id };
  const rules = useCapiroQuery("research.rules", { params });
  const templates = useCapiroQuery("research.templates", {});
  const preview = useCapiroMutation("research.rules.preview");
  const publish = useCapiroMutation("research.rules.publish");
  const [expression, setExpression] = useState(blankRule);
  const [mode, setMode] = useState<"rules" | "hybrid">("hybrid");
  const [autoAdd, setAutoAdd] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [candidateIds, setCandidateIds] = useState<string[]>(
    portfolio.members.map((member) => member.id),
  );
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const busy = preview.pending || publish.pending;
  const candidates = portfolio.members.filter((member) =>
    candidateIds.includes(member.id),
  );
  const template = templates.data
    ?.flatMap((item) => item.versions)
    .find((item) => item.id === templateId);
  const draftIdentity = JSON.stringify([
    expression,
    mode,
    autoAdd,
    templateId,
    candidateIds,
    portfolio.revision,
  ]);
  const [previewIdentity, setPreviewIdentity] = useState("");
  const currentPreview =
    previewIdentity === draftIdentity ? preview.data : undefined;
  const [now, setNow] = useState(() => Date.now());
  const expiry = currentPreview?.expiresAt;
  useEffect(() => {
    if (!expiry) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(Date.parse(expiry) - Date.now() + 1, 2147483647)),
    );
    return () => clearTimeout(timer);
  }, [expiry]);
  async function evaluate() {
    if (!editable || candidates.length > 200) return;
    try {
      await preview.run({
        params,
        body: {
          expectedRevision: portfolio.revision,
          schemaVersion: 1,
          expression,
          readableExpression: readableRule(expression),
          mode,
          qualificationPolicy: {
            ...(template?.qualificationPolicy ?? {}),
            autoAdd,
          },
          taxonomyVersionId: template?.taxonomyVersionId,
          templateVersionId: template?.id,
          candidates: candidates.map((member) => ({
            targetKind: member.targetKind,
            targetId: member.targetId,
            label: member.label,
            facts: {},
          })),
        },
      });
      setPreviewIdentity(draftIdentity);
    } catch {
      /* The mutation displays its error; no write is retried. */
    }
  }
  async function save() {
    if (
      !editable ||
      !currentPreview ||
      Date.parse(currentPreview.expiresAt) <= Date.now()
    )
      return;
    try {
      await publish.run({
        params,
        body: {
          expectedRevision: portfolio.revision,
          idempotencyKey: crypto.randomUUID(),
          previewId: currentPreview.previewId,
          previewHash: currentPreview.previewHash,
        },
      });
      preview.reset();
      rules.reload();
      onReload();
    } catch {
      /* Retain the preview for inspection. */
    }
  }
  return (
    <div className={styles.stack}>
      <Panel
        title="Published rules"
        description="Versions retain their readable expression and the preview that was published."
      >
        <StatusPanel
          loading={rules.loading}
          error={rules.error}
          onRetry={rules.reload}
        />
        {(rules.data ?? []).map((rule) => (
          <div className={styles.content} key={rule.id}>
            <strong>
              Version {rule.version} · {rule.mode}
            </strong>
            <p>{rule.readableExpression}</p>
            {rule.recompute && (
              <a
                href={`${researchPortfolioHref({ portfolioId: portfolio.id, view: "operations" })}&operationId=${encodeURIComponent(rule.recompute.operationId)}`}
              >
                Recompute: {rule.recompute.status}
              </a>
            )}
          </div>
        ))}
        {!rules.loading && !rules.data?.length && (
          <p className={styles.content}>No published rules.</p>
        )}
      </Panel>
      <Panel
        title="Preview a rule"
        description="Core resolves the selected subjects from its current sources. Unknown evidence stays unknown. Review the membership changes before publishing."
      >
        <div className={`${styles.content} ${styles.form}`}>
          <StatusPanel
            error={templates.error || preview.error || publish.error}
          />
          <label>
            Template{" "}
            <select
              disabled={!editable || busy}
              value={templateId}
              onChange={(e) => {
                const selected = templates.data
                  ?.flatMap((item) => item.versions)
                  .find((item) => item.id === e.target.value);
                setTemplateId(e.target.value);
                if (selected) {
                  setExpression(selected.expression);
                  setMode(selected.mode === "rules" ? "rules" : "hybrid");
                  setAutoAdd(selected.qualificationPolicy.autoAdd === true);
                }
              }}
            >
              <option value="">Custom rule</option>
              {templates.data
                ?.filter((item) => !item.archivedAt)
                .flatMap((item) =>
                  item.versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {item.name} · v{version.version}
                    </option>
                  )),
                )}
            </select>
          </label>
          <ResearchRuleEditor
            value={expression}
            onChange={setExpression}
            disabled={!editable || busy}
          />
          <p>{readableRule(expression)}</p>
          <label>
            Mode{" "}
            <select
              disabled={!editable || busy}
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="hybrid">Rules and manual membership</option>
              <option value="rules">Rules</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              disabled={!editable || busy}
              checked={autoAdd}
              onChange={(e) => setAutoAdd(e.target.checked)}
            />{" "}
            Include qualified matches automatically
          </label>
          <label>
            Subjects to preview (up to 200)
            <select
              multiple
              size={Math.min(8, Math.max(2, portfolio.members.length))}
              disabled={!editable || busy}
              value={candidateIds}
              onChange={(e) =>
                setCandidateIds(
                  Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
            >
              {portfolio.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label || member.targetId} · {member.targetKind}
                </option>
              ))}
            </select>
          </label>
          <ActionButton
            disabled={
              !editable || busy || !candidates.length || candidates.length > 200
            }
            onClick={() => void evaluate()}
          >
            Preview membership changes
          </ActionButton>
          {currentPreview && (
            <>
              <p role="status">
                {currentPreview.complete ? "Complete" : "Partial"} preview ·
                expires {new Date(currentPreview.expiresAt).toLocaleString()}
              </p>
              <DataTable
                rows={currentPreview.items}
                rowKey={(item) => `${item.targetKind}:${item.targetId}`}
                caption="Rule preview outcomes"
                columns={[
                  {
                    key: "target",
                    label: "Subject",
                    render: (item) => item.label || item.targetId,
                  },
                  {
                    key: "result",
                    label: "Result",
                    render: (item) => item.result,
                  },
                  {
                    key: "change",
                    label: "Change",
                    render: (item) => item.disposition,
                  },
                  {
                    key: "reason",
                    label: "Reasons",
                    render: (item) => item.reasons.join("; "),
                  },
                ]}
              />
              <ActionButton
                primary
                disabled={
                  !editable ||
                  busy ||
                  Date.parse(currentPreview.expiresAt) <= now
                }
                onClick={() => void save()}
              >
                Publish reviewed rule
              </ActionButton>
            </>
          )}
          {publish.data && (
            <p role="status">
              Rule published at portfolio revision{" "}
              {publish.data.resultingRevision}.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}
