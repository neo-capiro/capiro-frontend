"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { conversationSelection } from "../../../shared/meri-conversations/selection";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { Button } from "@capiro/ui/button";
import { useEffect, useState, type ReactNode } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  readClientEntry,
  retireEntry,
  type EntryScope,
  type MeriEntry,
} from "../../../shared/meri-entry/descriptor";
import { Notice } from "../ui/Notice";
import styles from "../ui/meri-ui.module.css";

/** Local IDs select an existing source read; they never establish access or send input. */
export function MeriEntryContext({
  account,
  children,
}: {
  account?: ConversationAccount;
  children: ReactNode;
}) {
  const params = useSearchParams(),
    selected = useSelectedClient();
  const entryId = params.get("entry");
  if (!entryId) return children;
  if (
    params.get("scope") === "general" ||
    conversationSelection(params).state !== "current"
  )
    return <EntryUnavailable />;
  if (
    !account ||
    selected.state !== "authorized-client" ||
    selected.client.status === "archived"
  )
    return children;
  const scope = { ...account, clientId: selected.client.id };
  return (
    <SavedEntry
      key={JSON.stringify([scope, entryId])}
      scope={scope}
      entryId={entryId}
    >
      {children}
    </SavedEntry>
  );
}

function SavedEntry({
  scope,
  entryId,
  children,
}: {
  scope: EntryScope;
  entryId: string;
  children: ReactNode;
}) {
  const [entry, setEntry] = useState<MeriEntry | null>();
  const { tenantId, actorId, clientId } = scope;
  useEffect(() => {
    let active = true;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const current = readClientEntry(
          { tenantId, actorId, clientId },
          entryId,
        );
        setEntry(current);
        if (
          current.source === "workspace-draft" ||
          current.source === "planner-task"
        )
          expiry = setTimeout(
            () => setEntry(null),
            Math.max(0, current.expiresAtMs - Date.now()),
          );
      } catch {
        setEntry(null);
      }
    });
    return () => {
      active = false;
      clearTimeout(expiry);
    };
  }, [tenantId, actorId, clientId, entryId]);
  if (entry === undefined) return <CheckingEntry />;
  if (entry === null)
    return <EntryUnavailable scope={scope} entryId={entryId} />;
  if (entry.source === "workspace-draft")
    return <WorkspaceEntry scope={scope} entry={entry} />;
  if (entry.source === "planner-task")
    return <PlannerEntry scope={scope} entry={entry} />;
  return children;
}

function WorkspaceEntry({
  scope,
  entry,
}: {
  scope: EntryScope;
  entry: MeriEntry & { source: "workspace-draft" };
}) {
  const query = useCapiroQuery("workspace.draft", {
    params: { id: entry.draftId },
  });
  if (query.loading) return <CheckingEntry />;
  const draft = query.data;
  if (
    query.error ||
    !draft ||
    draft.id !== entry.draftId ||
    draft.clientId !== scope.clientId ||
    draft.prospectId ||
    draft.clientAssociation === "held" ||
    (draft.tenantId !== undefined && draft.tenantId !== scope.tenantId)
  )
    return <EntryUnavailable scope={scope} entryId={entry.entryId} />;
  return (
    <AvailableEntry
      title={draft.docTitle}
      kind="Workspace draft"
      href={`/modules/workspace?${new URLSearchParams({ clientId: scope.clientId, draftId: draft.id })}`}
      reload={query.reload}
    />
  );
}

function PlannerEntry({
  scope,
  entry,
}: {
  scope: EntryScope;
  entry: MeriEntry & { source: "planner-task" };
}) {
  const query = useCapiroQuery("planner.task", {
    params: { id: entry.taskId },
  });
  if (query.loading) return <CheckingEntry />;
  const task = query.data;
  if (
    query.error ||
    !task ||
    task.id !== entry.taskId ||
    task.clientId !== scope.clientId ||
    task.archived
  )
    return <EntryUnavailable scope={scope} entryId={entry.entryId} />;
  return (
    <AvailableEntry
      title={task.name}
      kind="Planner task"
      href={`/modules/planner?${new URLSearchParams({ clientId: scope.clientId, task: task.id })}`}
      reload={query.reload}
    />
  );
}

function AvailableEntry({
  title,
  kind,
  href,
  reload,
}: {
  title: string;
  kind: string;
  href: string;
  reload: () => void;
}) {
  return (
    <div aria-label="Selected item" role="region">
      <Notice
        title={title}
        action={
          <div className={styles.row}>
            <Link className={styles.outline} href={href}>
              Open {kind.toLowerCase()}
            </Link>
            <Button
              variant="outline"
              className={styles.outline}
              onClick={reload}
            >
              Recheck access
            </Button>
            <Button
              className={styles.outline}
              style={{ opacity: 0.5 }}
              disabled
            >
              Ask Meri unavailable
            </Button>
          </div>
        }
      >
        {kind}. Ask Meri about this item is not available yet. Nothing has been
        sent.
      </Notice>
    </div>
  );
}

function CheckingEntry() {
  return (
    <div role="status">
      <Notice title="Checking selected item">
        Loading the item with your current access.
      </Notice>
    </div>
  );
}

export function EntryUnavailable({
  scope,
  entryId,
}: {
  scope?: EntryScope;
  entryId?: string;
}) {
  const tenantId = scope?.tenantId,
    actorId = scope?.actorId,
    clientId = scope?.clientId;
  useEffect(() => {
    if (!tenantId || !actorId || !clientId || !entryId) return;
    try {
      retireEntry({ tenantId, actorId, clientId }, entryId);
    } catch {
      /* Unreadable storage cannot restore an entry. */
    }
  }, [tenantId, actorId, clientId, entryId]);
  return (
    <Notice
      tone="danger"
      title="Selected item unavailable"
      action={
        <Link className={styles.outline} href="/">
          Open Portfolio
        </Link>
      }
    >
      This item could not be confirmed for your current account and client. Open
      it again from its source. Nothing has been sent.
    </Notice>
  );
}
