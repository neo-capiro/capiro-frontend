"use client";

import { useState } from "react";
import { type WorkspaceLibraryDocument } from "../../../shared/capiro/operations/workspace-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  DataTable,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./workspace.module.css";

function documentTone(status: string) {
  if (["complete", "generated", "delivered"].includes(status)) return "success";
  if (["draft", "partial"].includes(status)) return "warning";
  return "neutral";
}

export function WorkflowCards({
  onStart,
}: {
  onStart: (view: "hillday" | "newsletter" | "templates") => void;
}) {
  return (
    <div>
      <h2 className={styles.subheading}>Available workflows</h2>
      <div className={styles.workflows}>
        <article className={styles.workflow}>
          <h3>
            <span className={styles.iconTile}>
              <img src="/figma/modules/workspace-mail.svg" alt="" />
            </span>
            Newsletter
          </h3>
          <p>
            Create a polished newsletter from a template, then review it for
            Outreach.
          </p>
          <footer>
            <p>Template → Edit → Review</p>
            <ActionButton onClick={() => onStart("newsletter")}>
              Start
            </ActionButton>
          </footer>
        </article>
        <article className={styles.workflow}>
          <h3>
            <span className={styles.iconTile}>
              <img src="/figma/modules/workspace-calendar.svg" alt="" />
            </span>
            Hill Day Schedule
          </h3>
          <p>
            Build a client schedule from meetings, supporting context, and a
            branded template.
          </p>
          <footer>
            <p>Meetings → Context → Schedule</p>
            <ActionButton onClick={() => onStart("hillday")}>
              Start
            </ActionButton>
          </footer>
        </article>
      </div>
    </div>
  );
}

export function DocumentsLibrary({
  onOpen,
  clientId,
}: {
  onOpen: (row: WorkspaceLibraryDocument) => void;
  clientId?: string;
}) {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const [template, setTemplate] = useState("");
  const [cursor, setCursor] = useState<string>();
  const documents = useCapiroQuery("workspace.documents", {
    query: { clientId, cursor, status: status || undefined, limit: 50 },
  });
  const me = useCapiroQuery("me.read", {});
  const needsIdentity = scope !== "all";
  const identityError = needsIdentity ? me.error : undefined;
  const error = documents.error ?? identityError;
  const loading =
    !error && (documents.loading || (needsIdentity && me.loading));
  const ownerId = me.data?.user.clerkUserId;
  const rows = (documents.data?.items ?? []).filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) &&
      (!clientId || row.clientAssociation !== "held") &&
      (!client ||
        (row.clientAssociation !== "held" && row.client === client)) &&
      (!template || row.kind === template) &&
      (scope === "all" ||
        (ownerId !== undefined &&
          (scope === "mine"
            ? row.owner.id === ownerId
            : row.kind === "draft" && row.owner.id !== ownerId))),
  );
  const clients = [
    ...new Set(
      (documents.data?.items ?? []).flatMap((row) =>
        row.client && row.clientAssociation !== "held" ? [row.client] : [],
      ),
    ),
  ];
  return (
    <>
      <div className={styles.filters}>
        <div
          className={styles.pills}
          role="group"
          aria-label="Document ownership"
        >
          {[
            ["all", "Everyone"],
            ["mine", "Mine"],
            ["shared", "Shared with me"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={scope === id ? styles.active : ""}
              aria-pressed={scope === id}
              onClick={() => setScope(id!)}
            >
              {label}
            </button>
          ))}
        </div>
        <TextInput
          aria-label="Search documents"
          placeholder="Search documents"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <SelectInput
          aria-label="Filter documents by client"
          value={client}
          onValueChange={setClient}
          options={[
            { value: "", label: "Client · All clients" },
            ...clients.map((name) => ({ value: name, label: name })),
          ]}
        />
        <SelectInput
          aria-label="Filter documents by template"
          value={template}
          onValueChange={setTemplate}
          options={[
            { value: "", label: "Template · All" },
            { value: "hillday", label: "Hill Day" },
            { value: "draft", label: "Documents" },
          ]}
        />
        <SelectInput
          aria-label="Filter documents by status"
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setCursor(undefined);
          }}
          options={[
            { value: "", label: "Status · Any" },
            ...[
              "draft",
              "generating",
              "generated",
              "partial",
              "delivered",
              "complete",
            ].map((state) => ({ value: state, label: state })),
          ]}
        />
      </div>
      <StatusPanel
        loading={loading}
        error={error}
        onRetry={() => {
          if (documents.error) documents.reload();
          if (identityError) me.reload();
        }}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          caption="Workspace documents"
          emptyMessage="No documents match these filters."
          columns={[
            {
              key: "document",
              label: "DOCUMENT",
              width: "43%",
              render: (row) => (
                <button className={styles.link} onClick={() => onOpen(row)}>
                  {row.name}
                  <span className={styles.secondary}>{row.blueprint}</span>
                </button>
              ),
            },
            {
              key: "client",
              label: "CLIENT",
              render: (row) =>
                row.clientAssociation === "held"
                  ? "Choose a client to continue"
                  : (row.client ?? "Firm"),
            },
            {
              key: "template",
              label: "TEMPLATE",
              render: (row) => row.blueprint,
            },
            {
              key: "owner",
              label: "OWNER",
              render: (row) => (
                <span className={styles.owner} title={row.owner.name}>
                  {row.owner.initials}
                </span>
              ),
            },
            {
              key: "status",
              label: "STATUS",
              render: (row) => (
                <Badge tone={documentTone(row.status)}>{row.status}</Badge>
              ),
            },
            {
              key: "updated",
              label: "UPDATED",
              render: (row) => new Date(row.updatedAt).toLocaleDateString(),
            },
          ]}
        />
        <div className={styles.actions}>
          <span className={styles.footnote}>{rows.length} documents</span>
          {documents.data?.nextCursor && (
            <ActionButton
              onClick={() => setCursor(documents.data?.nextCursor ?? undefined)}
            >
              Load older
            </ActionButton>
          )}
          {cursor && (
            <ActionButton onClick={() => setCursor(undefined)}>
              Newest documents
            </ActionButton>
          )}
        </div>
      </StatusPanel>
      <p className={styles.footnote}>
        Documents are visible to their owner and collaborators. Access is
        checked by the existing Workspace service.
      </p>
    </>
  );
}
