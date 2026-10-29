"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ResearchOutputDownload } from "./ResearchOutputDownload";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
const sections = ["analytics", "totals", "contributions", "sources"] as const;
export function ResearchOutputs({ portfolio }: { portfolio: ResearchDetail }) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const jobId = search.get("outputJobId") ?? "";
  function setJobId(id: string) {
    const next = new URLSearchParams(search);
    next.set("outputJobId", id);
    router.replace(`${pathname}?${next}`);
  }
  const [openId, setOpenId] = useState(jobId);
  const [snapshotId, setSnapshotId] = useState("");
  const [selected, setSelected] = useState<(typeof sections)[number][]>([
    ...sections,
  ]);
  const [appendix, setAppendix] = useState(true);
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const snapshots = useCapiroQuery("research.snapshots", {
    params: { id: portfolio.id },
  });
  const create = useCapiroMutation("research.outputs.create");
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  async function generate() {
    if (!editable) return;
    try {
      const job = await create.run({
        params: { id: portfolio.id },
        body: {
          operationKey,
          snapshotId: snapshotId || null,
          selectedSections: selected,
          includeSourceAppendix: appendix,
          format: "csv",
        },
      });
      setJobId(job.id);
      setOpenId(job.id);
      setOperationKey(crypto.randomUUID());
    } catch {
      /* Retain the exact operation identity for explicit retry. */
    }
  }
  return (
    <div className={styles.stack}>
      {search.get("outputId") && (
        <Panel
          title="Bookmarked output"
          description={`Saved artifact: ${search.get("outputId")}`}
        >
          <div className={styles.content}>
            <ResearchOutputDownload
              key={search.get("outputId")}
              portfolioId={portfolio.id}
              outputId={search.get("outputId")!}
            />
          </div>
        </Panel>
      )}
      <Panel
        title="Create output"
        description="Export compatible totals, contribution dispositions and source references as CSV. A snapshot preserves its captured basis; current results use the current portfolio."
      >
        <div className={`${styles.content} ${styles.form}`}>
          <fieldset
            disabled={!editable || create.pending || Boolean(create.error)}
          >
            <legend>Output contents</legend>
            <label>
              Data{" "}
              <select
                value={snapshotId}
                onChange={(e) => setSnapshotId(e.target.value)}
              >
                <option value="">Current portfolio</option>
                {snapshots.data?.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name} · revision {snapshot.portfolioRevision}
                  </option>
                ))}
              </select>
            </label>
            {sections.map((section) => (
              <label key={section}>
                <input
                  type="checkbox"
                  checked={selected.includes(section)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, section]
                        : selected.filter((value) => value !== section),
                    )
                  }
                />
                {section}
              </label>
            ))}
            <label>
              <input
                type="checkbox"
                checked={appendix}
                onChange={(e) => setAppendix(e.target.checked)}
              />
              Include source appendix
            </label>
          </fieldset>
          <StatusPanel error={create.error || snapshots.error} />
          {create.error && (
            <p>
              The result was not confirmed. Retry the same request to recover
              its receipt.
            </p>
          )}
          <ActionButton
            primary
            disabled={!editable || create.pending || !selected.length}
            onClick={() => void generate()}
          >
            {create.error ? "Check same output request" : "Generate CSV"}
          </ActionButton>
          <Field label="Open an output receipt" htmlFor="research-output-id">
            <TextInput
              id="research-output-id"
              value={openId}
              onChange={(e) => setOpenId(e.target.value)}
              placeholder="Output job ID"
            />
          </Field>
          <ActionButton
            disabled={!openId.trim()}
            onClick={() => setJobId(openId.trim())}
          >
            Open output
          </ActionButton>
        </div>
      </Panel>
      {jobId && (
        <OutputReceipt
          key={`${portfolio.id}:${jobId}`}
          portfolio={portfolio}
          jobId={jobId}
        />
      )}
    </div>
  );
}
function OutputReceipt({
  portfolio,
  jobId,
}: {
  portfolio: ResearchDetail;
  jobId: string;
}) {
  const params = { id: portfolio.id, jobId };
  const query = useCapiroQuery("research.outputs.job", { params });
  const cancel = useCapiroMutation("research.outputs.cancel");
  const retry = useCapiroMutation("research.outputs.retry");
  const reconcile = useCapiroMutation("research.outputs.reconcile");
  const filing = useCapiroMutation("research.outputs.file");
  const [clientId, setClientId] = useState("");
  const [filingKey] = useState(() => crypto.randomUUID());
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const busy =
    cancel.pending || retry.pending || reconcile.pending || filing.pending;
  const job = query.data;
  async function update(
    action: typeof cancel | typeof retry | typeof reconcile,
  ) {
    if (!editable) return;
    try {
      await action.run({ params });
      query.reload();
    } catch {
      /* Keep the receipt available. */
    }
  }
  async function save() {
    if (!editable || !job?.artifact || !clientId) return;
    try {
      await filing.run({
        params: { id: portfolio.id, outputId: job.artifact.id },
        body: { operationKey: filingKey, clientId },
      });
    } catch {
      /* Same operation key recovers this filing. */
    }
  }
  const saved = filing.data;
  return (
    <Panel
      title="Output receipt"
      description={`Keep this job ID to reopen it: ${jobId}`}
      actions={
        <ActionButton onClick={query.reload}>Refresh status</ActionButton>
      }
    >
      <StatusPanel
        loading={query.loading}
        error={
          query.error ||
          cancel.error ||
          retry.error ||
          reconcile.error ||
          filing.error
        }
        onRetry={query.reload}
      />
      {job && (
        <>
          <p className={styles.content} role="status">
            {job.status} · {job.attemptCount} attempts
            {job.lastError ? ` · ${job.lastError}` : ""}
          </p>
          <div className={styles.actions}>
            <ActionButton
              disabled={
                !editable || busy || !["queued", "running"].includes(job.status)
              }
              onClick={() => void update(cancel)}
            >
              Cancel output
            </ActionButton>
            <ActionButton
              disabled={
                !editable ||
                busy ||
                !["failed", "partial", "cancelled"].includes(job.status)
              }
              onClick={() => void update(retry)}
            >
              Retry output
            </ActionButton>
            <ActionButton
              disabled={!editable || busy}
              onClick={() => void update(reconcile)}
            >
              Reconcile output
            </ActionButton>
          </div>
          {job.artifact && (
            <div className={`${styles.content} ${styles.form}`}>
              <p>
                {job.artifact.fileName} · {job.artifact.byteSize} bytes ·
                SHA-256 <code>{job.artifact.contentHash}</code>
              </p>
              <ResearchOutputDownload
                key={job.artifact.id}
                portfolioId={portfolio.id}
                outputId={job.artifact.id}
                disabled={busy}
              />
              <label>
                File with linked client{" "}
                <select
                  disabled={
                    !editable || busy || Boolean(saved) || Boolean(filing.error)
                  }
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="">Choose client</option>
                  {portfolio.clientLinks.map((client) => (
                    <option key={client.clientId} value={client.clientId}>
                      {client.clientName}
                    </option>
                  ))}
                </select>
              </label>
              <ActionButton
                disabled={!editable || busy || !clientId || Boolean(saved)}
                onClick={() => void save()}
              >
                {filing.error
                  ? "Check same filing request"
                  : "Save to Client Files"}
              </ActionButton>
              {saved && (
                <p role="status">
                  Saved {saved.attachmentName} ·{" "}
                  {saved.lifecycleStatus ?? "Processing"} · scan{" "}
                  {saved.scanStatus ?? "pending"}.{" "}
                  <a
                    href={`/portfolio/${encodeURIComponent(saved.clientId)}/files?file=${encodeURIComponent(saved.attachmentId)}`}
                  >
                    Open Client Files
                  </a>
                </p>
              )}
            </div>
          )}
          <DataTable
            rows={job.attempts}
            rowKey={(item) => item.id}
            caption="Output attempt history"
            columns={[
              { key: "action", label: "Action", render: (item) => item.action },
              {
                key: "outcome",
                label: "Outcome",
                render: (item) => item.outcome,
              },
              {
                key: "error",
                label: "Error",
                render: (item) => item.errorCode ?? "—",
              },
            ]}
          />
        </>
      )}
    </Panel>
  );
}
