"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type {
  ResearchDetail,
  ResearchMember,
} from "../../../shared/capiro/operations/research-schemas";
import {
  ActionButton,
  Badge,
  DataTable,
  Field,
  Modal,
  Panel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchMembers({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const api = useCapiro();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] =
    useState<ResearchMember["targetKind"]>("program_element");
  const [targetId, setTargetId] = useState("");
  const [label, setLabel] = useState("");
  const [decision, setDecision] = useState<ResearchMember>();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  async function add() {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("research.members.add", {
        params: { id: portfolio.id },
        body: {
          expectedRevision: portfolio.revision,
          idempotencyKey: crypto.randomUUID(),
          targetKind: kind,
          targetId,
          label: label || null,
        },
      });
      setAdding(false);
      setTargetId("");
      setLabel("");
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add member");
    } finally {
      setBusy(false);
    }
  }
  async function decide() {
    if (!decision) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.request("research.members.decide", {
        params: { id: portfolio.id },
        body: {
          expectedRevision: portfolio.revision,
          idempotencyKey: crypto.randomUUID(),
          decisions: [
            {
              memberId: decision.id,
              disposition:
                decision.disposition === "included" ? "excluded" : "included",
              reason,
            },
          ],
        },
      });
      setDecision(undefined);
      setReason("");
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply decision");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Panel
        title="Members"
        actions={
          <ActionButton
            primary
            disabled={!editable}
            onClick={() => setAdding(true)}
          >
            + Add member
          </ActionButton>
        }
      >
        <DataTable
          rows={portfolio.members}
          rowKey={(r) => r.id}
          caption="Research portfolio members"
          columns={[
            {
              key: "label",
              label: "Member",
              render: (r) => <strong>{r.label || r.targetId}</strong>,
            },
            {
              key: "kind",
              label: "Type",
              render: (r) => r.targetKind.replaceAll("_", " "),
            },
            {
              key: "origin",
              label: "Origin",
              render: (r) => r.origin || "Not provided",
            },
            {
              key: "status",
              label: "Disposition",
              render: (r) => <Badge>{r.disposition}</Badge>,
            },
            { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
            {
              key: "action",
              label: "Decision",
              render: (r) => (
                <ActionButton
                  disabled={!editable || busy || r.disposition === "unresolved"}
                  onClick={() => {
                    setDecision(r);
                    setReason("");
                  }}
                >
                  {r.disposition === "included" ? "Exclude" : "Include"}
                </ActionButton>
              ),
            },
          ]}
        />
      </Panel>
      {error && (
        <p role="alert">
          {error}{" "}
          <ActionButton onClick={onReload}>Reload portfolio</ActionButton>
        </p>
      )}
      <Modal
        open={adding}
        onOpenChange={setAdding}
        title="Add portfolio member"
        footer={
          <ActionButton
            primary
            disabled={busy || !targetId.trim()}
            onClick={add}
          >
            Add member
          </ActionButton>
        }
      >
        <div className={styles.form}>
          <Field label="Type" htmlFor="research-kind">
            <select
              id="research-kind"
              className={styles.select}
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              {[
                "program",
                "program_element",
                "project",
                "budget_line",
                "award",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Source identifier" htmlFor="research-target">
            <TextInput
              id="research-target"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              maxLength={300}
            />
          </Field>
          <Field label="Label" htmlFor="research-label">
            <TextInput
              id="research-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={500}
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={!!decision}
        onOpenChange={(v) => {
          if (!v) setDecision(undefined);
        }}
        title={
          decision?.disposition === "included"
            ? "Exclude member"
            : "Include member"
        }
        footer={
          <ActionButton
            primary
            disabled={busy || !reason.trim()}
            onClick={decide}
          >
            Confirm decision
          </ActionButton>
        }
      >
        <p>{decision?.label || decision?.targetId}</p>
        <Field label="Reason" htmlFor="research-reason">
          <TextArea
            id="research-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={4000}
          />
        </Field>
      </Modal>
    </>
  );
}
