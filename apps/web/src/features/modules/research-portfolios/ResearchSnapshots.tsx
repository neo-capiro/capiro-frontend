"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Field,
  Modal,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
export function ResearchSnapshots({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const api = useCapiro();
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("research.snapshots", {
    params: { id: portfolio.id },
  });
  async function create() {
    if (!editable) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.request("research.snapshots.create", {
        params: { id: portfolio.id },
        body: {
          name,
          expectedRevision: portfolio.revision,
          operationKey: crypto.randomUUID(),
        },
      });
      setOpen(false);
      setName("");
      query.reload();
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create snapshot");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Snapshots"
      description="Captured membership and financial basis are immutable."
      actions={
        <ActionButton
          primary
          disabled={!editable}
          onClick={() => setOpen(true)}
        >
          Create snapshot
        </ActionButton>
      }
    >
      <StatusPanel
        loading={query.loading}
        error={query.error || error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data || []}
          rowKey={(r) => r.id}
          caption="Research portfolio snapshots"
          columns={[
            { key: "name", label: "Snapshot", render: (r) => r.name },
            {
              key: "revision",
              label: "Revision",
              render: (r) => r.portfolioRevision,
            },
            {
              key: "captured",
              label: "Captured",
              render: (r) => new Date(r.capturedAt).toLocaleString(),
            },
            {
              key: "hash",
              label: "Content hash",
              render: (r) => <code>{r.contentHash.slice(0, 16)}…</code>,
            },
          ]}
        />
      </StatusPanel>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create snapshot"
        footer={
          <ActionButton
            primary
            disabled={!editable || busy || !name.trim()}
            onClick={create}
          >
            Capture snapshot
          </ActionButton>
        }
      >
        <Field label="Snapshot name" htmlFor="snapshot-name">
          <TextInput
            id="snapshot-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={240}
          />
        </Field>
        {error && <p role="alert">{error}</p>}
      </Modal>
    </Panel>
  );
}
