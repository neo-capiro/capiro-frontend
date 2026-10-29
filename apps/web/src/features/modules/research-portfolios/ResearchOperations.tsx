"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import { researchPortfolioHref } from "./research-navigation";
import styles from "./research.module.css";
export function ResearchOperations({
  portfolio,
}: {
  portfolio: ResearchDetail;
}) {
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [input, setInput] = useState(search.get("operationId") ?? "");
  const id = search.get("operationId") ?? "";
  function open() {
    const next = new URLSearchParams(search);
    next.set("operationId", input.trim());
    router.replace(`${pathname}?${next}`);
  }
  return (
    <Panel
      title="Operation status"
      description="Open the durable operation ID from a rule, import, output or filing receipt. Refresh or reconcile an uncertain result before deciding whether to retry."
    >
      <div className={`${styles.content} ${styles.form}`}>
        <Field label="Operation ID" htmlFor="research-operation-id">
          <TextInput
            id="research-operation-id"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Field>
        <ActionButton disabled={!input.trim()} onClick={open}>
          Open operation
        </ActionButton>
        {id && (
          <OperationStatus
            key={`${portfolio.id}:${id}`}
            portfolio={portfolio}
            id={id}
          />
        )}
      </div>
    </Panel>
  );
}
function OperationStatus({
  portfolio,
  id,
}: {
  portfolio: ResearchDetail;
  id: string;
}) {
  const params = { id: portfolio.id, operationId: id };
  const query = useCapiroQuery("research.operations.detail", { params });
  const reconcile = useCapiroMutation("research.operations.reconcile");
  const [key, setKey] = useState("");
  const operation = query.data;
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  async function refresh() {
    if (!editable) return;
    try {
      await reconcile.run({ params, body: key ? { operationKey: key } : {} });
      query.reload();
    } catch {
      /* Preserve original receipt. */
    }
  }
  return (
    <>
      <StatusPanel
        loading={query.loading}
        error={query.error || reconcile.error}
        onRetry={query.reload}
      />
      {operation && (
        <>
          <p role="status">
            {operation.label ?? operation.kind} · {operation.status} ·{" "}
            {operation.domainStatus}
          </p>
          <p>{operation.lastError}</p>
          {operation.limitations.map((limitation) => (
            <p key={limitation}>{limitation}</p>
          ))}
          <p>
            Updated {new Date(operation.updatedAt).toLocaleString()} ·{" "}
            {operation.retryCount} retries
          </p>
          {operation.kind === "client_filing" && (
            <Field
              label="Original filing operation key"
              htmlFor="research-filing-key"
            >
              <TextInput
                id="research-filing-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <small>Use the original key from your filing receipt.</small>
            </Field>
          )}
          <div className={styles.actions}>
            <ActionButton onClick={query.reload}>Refresh status</ActionButton>
            <ActionButton
              disabled={
                !editable ||
                reconcile.pending ||
                (operation.kind === "client_filing" && !key)
              }
              onClick={() => void refresh()}
            >
              Reconcile operation
            </ActionButton>
          </div>
          {(operation.kind === "import" || operation.kind === "output") && (
            <a
              href={`${researchPortfolioHref({ portfolioId: portfolio.id, view: operation.kind === "import" ? "imports" : "outputs" })}&${operation.kind === "import" ? "importJobId" : "outputJobId"}=${encodeURIComponent(operation.id)}`}
            >
              Open {operation.kind} controls
            </a>
          )}
        </>
      )}
    </>
  );
}
