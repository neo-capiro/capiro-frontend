"use client";
import { useState } from "react";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import { researchBookmarkKinds } from "../../../shared/capiro/operations/research-workflow";
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
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import {
  researchPortfolioHref,
  type ResearchPortfolioView,
} from "./research-navigation";
import styles from "./research.module.css";
const destination: Partial<
  Record<(typeof researchBookmarkKinds)[number], ResearchPortfolioView>
> = {
  member: "members",
  snapshot: "snapshots",
  review: "reviews",
  import: "imports",
  output: "outputs",
};
export function ResearchBookmarks({
  portfolio,
}: {
  portfolio: ResearchDetail;
}) {
  const params = { id: portfolio.id };
  const query = useCapiroQuery("research.bookmarks", { params });
  const create = useCapiroMutation("research.bookmarks.create");
  const update = useCapiroMutation("research.bookmarks.update");
  const remove = useCapiroMutation("research.bookmarks.delete");
  const [kind, setKind] =
    useState<(typeof researchBookmarkKinds)[number]>("member");
  const [targetId, setTargetId] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<string>();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const busy = create.pending || update.pending || remove.pending;
  const archived = portfolio.lifecycle === "archived";
  async function save() {
    if (archived) return;
    try {
      if (editing)
        await update.run({
          params: { ...params, bookmarkId: editing },
          body: { label: label || null, note: note || null },
        });
      else
        await create.run({
          params,
          body: {
            idempotencyKey: key,
            targetKind: kind,
            targetId,
            label: label || null,
            note: note || null,
          },
        });
      setEditing(undefined);
      setTargetId("");
      setLabel("");
      setNote("");
      setKey(crypto.randomUUID());
      query.reload();
    } catch {
      /* Keep the form and operation key. */
    }
  }
  async function discard(bookmarkId: string) {
    if (archived) return;
    try {
      await remove.run({ params: { ...params, bookmarkId } });
      query.reload();
    } catch {
      /* Owner-authorized API result is shown. */
    }
  }
  return (
    <Panel
      title="My bookmarks"
      description="Personal bookmarks keep the original target ID, label and note. They never grant access to the underlying item."
    >
      <StatusPanel
        loading={query.loading}
        error={query.error || create.error || update.error || remove.error}
        onRetry={query.reload}
      />
      <DataTable
        rows={query.data ?? []}
        rowKey={(item) => item.id}
        caption="Personal research bookmarks"
        columns={[
          {
            key: "target",
            label: "Target",
            render: (item) => {
              const view = destination[item.targetKind];
              const href = view
                ? `${researchPortfolioHref({ portfolioId: portfolio.id, view })}&${item.targetKind === "import" ? "importJobId" : item.targetKind === "output" ? "outputId" : "targetId"}=${encodeURIComponent(item.targetId)}`
                : undefined;
              return href ? (
                <a href={href}>{item.label || item.targetId}</a>
              ) : (
                <span>
                  {item.label || item.targetId} · {item.targetKind}
                </span>
              );
            },
          },
          { key: "note", label: "Note", render: (item) => item.note || "—" },
          {
            key: "actions",
            label: "Actions",
            render: (item) => (
              <div className={styles.actions}>
                <ActionButton
                  disabled={archived || busy}
                  onClick={() => {
                    setEditing(item.id);
                    setKind(item.targetKind);
                    setTargetId(item.targetId);
                    setLabel(item.label ?? "");
                    setNote(item.note ?? "");
                  }}
                >
                  Edit bookmark
                </ActionButton>
                <ActionButton
                  disabled={archived || busy}
                  onClick={() => void discard(item.id)}
                >
                  Remove bookmark
                </ActionButton>
              </div>
            ),
          },
        ]}
      />
      <div className={`${styles.content} ${styles.form}`}>
        <label>
          Target type{" "}
          <select
            disabled={archived || busy || Boolean(editing)}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            {researchBookmarkKinds
              .filter((value) => value !== "other")
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
        <Field label="Target ID" htmlFor="bookmark-target">
          <TextInput
            id="bookmark-target"
            disabled={archived || busy || Boolean(editing)}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
        </Field>
        <Field label="Label" htmlFor="bookmark-label">
          <TextInput
            id="bookmark-label"
            disabled={archived || busy}
            maxLength={255}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>
        <Field label="Note" htmlFor="bookmark-note">
          <TextArea
            id="bookmark-note"
            disabled={archived || busy}
            maxLength={5000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <ActionButton
          disabled={archived || busy || !targetId.trim()}
          onClick={() => void save()}
        >
          {editing ? "Save bookmark" : "Add bookmark"}
        </ActionButton>
      </div>
    </Panel>
  );
}
