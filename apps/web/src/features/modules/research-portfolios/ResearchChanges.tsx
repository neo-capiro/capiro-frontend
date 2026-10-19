"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
export function ResearchChanges({ id }: { id: string }) {
  const api = useCapiro();
  const [cursor, setCursor] = useState<string>();
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const query = useCapiroQuery("research.changes", {
    params: { id },
    query: { cursor, limit: 25 },
  });
  async function state(
    eventId: string,
    revision: number | undefined,
    action: "acknowledged" | "dismissed" | "undo",
  ) {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("research.changes.state", {
        params: { id, eventId },
        body: { action, expectedRevision: revision },
      });
      query.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update change");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Changes">
      <StatusPanel
        loading={query.loading}
        error={query.error || error}
        onRetry={query.reload}
      >
        <DataTable
          rows={query.data?.items || []}
          rowKey={(r) => r.id}
          caption="Research portfolio changes"
          columns={[
            {
              key: "kind",
              label: "Change",
              render: (r) => r.eventKind.replaceAll("_", " "),
            },
            {
              key: "revision",
              label: "Revision",
              render: (r) => r.aggregateRevision,
            },
            {
              key: "date",
              label: "When",
              render: (r) => new Date(r.occurredAt).toLocaleString(),
            },
            {
              key: "state",
              label: "State",
              render: (r) => (
                <Badge>
                  {r.state?.dismissedAt
                    ? "Dismissed"
                    : r.state?.acknowledgedAt
                      ? "Acknowledged"
                      : "New"}
                </Badge>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <>
                  <ActionButton
                    disabled={busy}
                    onClick={() =>
                      state(r.id, r.state?.revision, "acknowledged")
                    }
                  >
                    Acknowledge
                  </ActionButton>
                  <ActionButton
                    disabled={busy}
                    onClick={() =>
                      state(
                        r.id,
                        r.state?.revision,
                        r.state?.dismissedAt ? "undo" : "dismissed",
                      )
                    }
                  >
                    {r.state?.dismissedAt ? "Undo" : "Dismiss"}
                  </ActionButton>
                </>
              ),
            },
          ]}
        />
        <ActionButton
          disabled={!history.length}
          onClick={() => {
            setCursor(history[history.length - 1]);
            setHistory(history.slice(0, -1));
          }}
        >
          Previous
        </ActionButton>
        <ActionButton
          disabled={!query.data?.nextCursor}
          onClick={() => {
            setHistory([...history, cursor]);
            setCursor(query.data?.nextCursor || undefined);
          }}
        >
          Next
        </ActionButton>
      </StatusPanel>
    </Panel>
  );
}
