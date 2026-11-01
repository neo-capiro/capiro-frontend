"use client";

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
import { LibraryClientFilter } from "./LibraryClientFilter";
import { useLibraryQuery } from "./library-query";

const documentStatusLabels = new Map([
  ["draft", "Draft"],
  ["generating", "Generating"],
  ["generated", "Generated"],
  ["partial", "Partial"],
  ["delivered", "Delivered"],
  ["complete", "Complete"],
]);

function documentTone(status: string) {
  if (["complete", "generated", "delivered"].includes(status)) return "success";
  if (["draft", "partial"].includes(status)) return "warning";
  return "neutral";
}

export function WorkflowCards({
  onStart,
  clientId,
}: {
  clientId?: string;
  onStart: (
    view: "hillday" | "newsletter" | "rich-newsletter" | "templates",
  ) => void;
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
            <ActionButton
              onClick={() =>
                onStart(clientId ? "newsletter" : "rich-newsletter")
              }
            >
              Start
            </ActionButton>
            <ActionButton onClick={() => onStart("newsletter")}>
              Template gallery
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
  const { query, setFilters, setCursor } = useLibraryQuery(clientId);
  const documents = useCapiroQuery("workspace.documents", { query });
  const rows = documents.data?.items ?? [];
  return (
    <>
      <div className={styles.filters}>
        <div
          className={styles.pills}
          role="group"
          aria-label="Document ownership"
        >
          {(
            [
              ["all", "Everyone"],
              ["mine", "Mine"],
              ["shared", "Shared with me"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={query.scope === id ? styles.active : ""}
              aria-pressed={query.scope === id}
              onClick={() => setFilters({ scope: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <TextInput
          aria-label="Search documents"
          placeholder="Search documents"
          value={query.q ?? ""}
          maxLength={200}
          onChange={(event) => setFilters({ q: event.target.value })}
        />
        {clientId ? (
          <SelectInput
            aria-label="Filter documents by client"
            value={clientId}
            disabled
            onValueChange={(id) => setFilters({ clientId: id })}
            options={[{ value: clientId, label: "Client · Current selection" }]}
          />
        ) : (
          <LibraryClientFilter
            value={query.clientId}
            onChange={(id) => setFilters({ clientId: id })}
          />
        )}
        <SelectInput
          aria-label="Filter documents by type"
          value={query.kind ?? "all"}
          onValueChange={(kind) =>
            setFilters({ kind: kind as "all" | "hillday" | "draft" })
          }
          options={[
            { value: "all", label: "Type · All" },
            { value: "hillday", label: "Hill Day" },
            { value: "draft", label: "Documents (includes newsletters)" },
          ]}
        />
        <SelectInput
          aria-label="Filter documents by status"
          value={query.status ?? ""}
          onValueChange={(status) =>
            setFilters({ status: status || undefined })
          }
          options={[
            { value: "", label: "Status · Any" },
            ...Array.from(documentStatusLabels, ([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>
      <StatusPanel
        loading={documents.loading}
        error={documents.error}
        onRetry={documents.reload}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => `${row.kind}:${row.id}`}
          caption="Workspace documents"
          emptyMessage="No documents on this page."
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
                <Badge tone={documentTone(row.status)}>
                  {documentStatusLabels.get(row.status) ?? row.status}
                </Badge>
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
          <span className={styles.footnote}>
            {rows.length} documents on this page
          </span>
          {documents.data?.nextCursor && (
            <ActionButton
              onClick={() => setCursor(documents.data?.nextCursor ?? undefined)}
            >
              Load older
            </ActionButton>
          )}
          {query.cursor && (
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
