"use client";
import { useState } from "react";
import { ResearchReviewTools } from "./ResearchReviewTools";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  Panel,
  StatusPanel,
  Tabs,
  TextArea,
} from "../../../shared/module-ui";
type Decision = "include" | "exclude" | "defer" | "reopen" | "dispute";
export function ResearchReviews({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const api = useCapiro();
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const [lane, setLane] = useState<"mine" | "team" | "deferred" | "resolved">(
    "mine",
  );
  const [selected, setSelected] = useState<{
    id: string;
    revision: number;
    reason: string;
  }>();
  const [decision, setDecision] = useState<Decision>("include");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("research.reviews", {
    params: { id: portfolio.id },
    query: { lane },
  });
  async function decide() {
    if (!selected || !editable) return;
    setBusy(true);
    setError(undefined);
    try {
      const receipt = await api.request("research.reviews.decide", {
        params: { id: portfolio.id, reviewId: selected.id },
        body: {
          expectedRevision: selected.revision,
          expectedPortfolioRevision: portfolio.revision,
          idempotencyKey: crypto.randomUUID(),
          decisionType: decision,
          reason,
        },
      });
      const failed = receipt.outcomes.find((o) =>
        ["failed", "conflict"].includes(o.status),
      );
      if (failed)
        throw new Error(
          failed.message || "Review changed. Reload before deciding.",
        );
      setSelected(undefined);
      query.reload();
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save decision");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Reviews">
      <Tabs
        items={["mine", "team", "deferred", "resolved"].map((id) => ({
          id,
          label: id.charAt(0).toUpperCase() + id.slice(1),
        }))}
        value={lane}
        onChange={(id) => setLane(id as typeof lane)}
      />
      <StatusPanel
        loading={query.loading}
        error={query.error || error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data || []}
          rowKey={(r) => r.id}
          caption="Research portfolio review queue"
          columns={[
            { key: "target", label: "Target", render: (r) => r.targetId },
            { key: "reason", label: "Reason", render: (r) => r.reason },
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge>{r.status}</Badge>,
            },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <ActionButton
                  disabled={portfolio.lifecycle === "archived"}
                  onClick={() => {
                    setSelected(r);
                    setReason("");
                  }}
                >
                  Review
                </ActionButton>
              ),
            },
          ]}
        />
      </StatusPanel>
      <Modal
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(undefined);
        }}
        title="Review decision"
        footer={
          <ActionButton
            primary
            disabled={!editable || busy || !reason.trim()}
            onClick={decide}
          >
            Save decision
          </ActionButton>
        }
      >
        <p>{selected?.reason}</p>
        {selected && (
          <ResearchReviewTools
            key={selected.id}
            portfolio={portfolio}
            review={
              query.data?.find((item) => item.id === selected.id) ?? selected
            }
            onReload={() => {
              query.reload();
              onReload();
            }}
          />
        )}
        <Field label="Decision" htmlFor="review-decision">
          <select
            id="review-decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value as Decision)}
          >
            {["include", "exclude", "defer", "reopen", "dispute"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Reason" htmlFor="review-reason">
          <TextArea
            id="review-reason"
            maxLength={4000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {error && <p role="alert">{error}</p>}
      </Modal>
    </Panel>
  );
}
