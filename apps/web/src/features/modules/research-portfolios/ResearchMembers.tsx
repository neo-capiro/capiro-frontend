"use client";
import { useState } from "react";
import type { z } from "zod";
import type {
  ResearchDetail,
  ResearchMember,
  researchReceipt,
} from "../../../shared/capiro/operations/research-schemas";
import {
  ActionButton,
  Badge,
  DataTable,
  Panel,
} from "../../../shared/module-ui";
import { MemberDiscovery } from "./members/MemberDiscovery";
import { MemberDecision } from "./members/MemberDecision";
import { unresolvedMember } from "./members/member-discovery";
import styles from "./research.module.css";

export function ResearchMembers({
  portfolio,
  onReload,
}: {
  portfolio: ResearchDetail;
  onReload: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [resolving, setResolving] = useState<ResearchMember>();
  const [selected, setSelected] = useState<string[]>([]);
  const [decision, setDecision] = useState<{
    members: ResearchMember[];
    disposition: "included" | "excluded";
  }>();
  const [receipt, setReceipt] = useState<z.infer<typeof researchReceipt>>();
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const chosen = portfolio.members.filter((member) =>
    selected.includes(member.id),
  );
  function saved(next: z.infer<typeof researchReceipt>) {
    setReceipt(next);
    setAdding(false);
    setResolving(undefined);
    setDecision(undefined);
    setSelected([]);
    onReload();
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
        <div className={styles.toolbar}>
          <span>{chosen.length} selected · up to 100 per decision</span>
          <ActionButton
            disabled={
              !editable || !chosen.length || chosen.some(unresolvedMember)
            }
            onClick={() =>
              setDecision({ members: chosen, disposition: "included" })
            }
          >
            Include selected
          </ActionButton>
          <ActionButton
            disabled={!editable || !chosen.length}
            onClick={() =>
              setDecision({ members: chosen, disposition: "excluded" })
            }
          >
            Exclude selected
          </ActionButton>
          <ActionButton
            disabled={!selected.length}
            onClick={() => setSelected([])}
          >
            Clear selection
          </ActionButton>
        </div>
        <DataTable
          rows={portfolio.members}
          rowKey={(row) => row.id}
          caption="Research portfolio members"
          columns={[
            {
              key: "select",
              label: "Select",
              render: (row) => (
                <input
                  type="checkbox"
                  aria-label={`Select member ${row.label || row.targetId}`}
                  checked={selected.includes(row.id)}
                  disabled={
                    !editable ||
                    (!selected.includes(row.id) && selected.length >= 100)
                  }
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, row.id]
                        : selected.filter((id) => id !== row.id),
                    )
                  }
                />
              ),
            },
            {
              key: "label",
              label: "Member",
              render: (row) => <strong>{row.label || row.targetId}</strong>,
            },
            {
              key: "kind",
              label: "Type",
              render: (row) => row.targetKind.replaceAll("_", " "),
            },
            {
              key: "origin",
              label: "Origin",
              render: (row) => row.origin || "Not provided",
            },
            {
              key: "status",
              label: "Disposition",
              render: (row) => (
                <>
                  <Badge>{row.disposition}</Badge>
                  {unresolvedMember(row) &&
                    row.disposition !== "unresolved" && (
                      <p>Resolution required before inclusion</p>
                    )}
                </>
              ),
            },
            {
              key: "reason",
              label: "Reason",
              render: (row) => row.reason || "—",
            },
            {
              key: "action",
              label: "Decision",
              render: (row) =>
                unresolvedMember(row) ? (
                  <ActionButton
                    disabled={!editable}
                    onClick={() => setResolving(row)}
                  >
                    Resolve
                  </ActionButton>
                ) : (
                  <ActionButton
                    disabled={!editable}
                    onClick={() =>
                      setDecision({
                        members: [row],
                        disposition:
                          row.disposition === "included"
                            ? "excluded"
                            : "included",
                      })
                    }
                  >
                    {row.disposition === "included" ? "Exclude" : "Include"}
                  </ActionButton>
                ),
            },
          ]}
        />
      </Panel>
      {receipt && (
        <Panel
          title="Member decision receipt"
          description={`Portfolio revision ${receipt.resultingRevision} · ${receipt.replayed ? "Replayed receipt" : "Confirmed"}`}
        >
          <DataTable
            caption="Member operation outcomes"
            rows={receipt.outcomes}
            rowKey={(row) => `${row.targetType}:${row.id ?? row.targetId}`}
            columns={[
              {
                key: "member",
                label: "Member",
                render: (row) =>
                  portfolio.members.find((member) => member.id === row.id)
                    ?.label || row.targetId,
              },
              { key: "status", label: "Result", render: (row) => row.status },
              {
                key: "message",
                label: "Detail",
                render: (row) => row.message || "—",
              },
            ]}
          />
        </Panel>
      )}
      {(adding || resolving) && (
        <MemberDiscovery
          key={`${portfolio.id}:${resolving?.id ?? "add"}`}
          portfolio={portfolio}
          resolving={resolving}
          onClose={() => {
            setAdding(false);
            setResolving(undefined);
          }}
          onSaved={saved}
          onReload={onReload}
        />
      )}
      {decision && (
        <MemberDecision
          key={`${portfolio.id}:${decision.disposition}:${decision.members.map((member) => member.id).join(",")}`}
          portfolio={portfolio}
          members={decision.members}
          disposition={decision.disposition}
          onClose={() => setDecision(undefined)}
          onSaved={saved}
          onReload={onReload}
        />
      )}
    </>
  );
}
