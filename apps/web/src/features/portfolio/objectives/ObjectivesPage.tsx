"use client";
import { useDeleteObjective } from "./mutations";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { AdvocacyHistory } from "@/features/portfolio/advocacy/public";
import {
  useMemberOptions,
  memberName,
} from "@/features/portfolio/index/public";
import { useObjectives } from "./queries";
import { objectiveTitle, type Objective } from "./contracts";
import { ObjectiveEditor } from "./ObjectiveEditor";
import { ObjectiveList, ObjectiveStats } from "./ObjectiveList";
import { NewObjectivePage } from "./NewObjectivePage";
import { ObjectiveOperationalPage } from "./operational/ObjectiveOperationalPage";
import styles from "./objectives.module.css";
export function ObjectivesPage({ clientId }: { clientId: string }) {
  const query = useObjectives(clientId);
  const members = useMemberOptions();
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [deleting, setDeleting] = useState<Objective>();
  const [readScope, setReadScope] = useState({ clientId, error: query.error });
  if (readScope.clientId !== clientId || readScope.error !== query.error) {
    setReadScope({ clientId, error: query.error });
    setDeleting(undefined);
  }
  const records = query.isSuccess && !query.error ? query.data : undefined;
  const selected = records?.find((o) => o.id === params.get("objective"));
  const operational = records?.find((o) => o.id === params.get("operational"));
  const creating = params.has("new");
  const search = params.toString();
  useEffect(() => {
    if (!query.error) return;
    const next = new URLSearchParams(search);
    if (!next.has("objective") && !next.has("new") && !next.has("operational"))
      return;
    next.delete("objective");
    next.delete("new");
    next.delete("operational");
    router.replace(`/portfolio/${clientId}/objectives?${next}`, {
      scroll: false,
    });
  }, [clientId, query.error, router, search]);
  const remove = useDeleteObjective(
    clientId,
    () => setDeleting(undefined),
    Boolean(records && deleting),
  );
  const ownerNames = members.data
    ? new Map(members.data.map((member) => [member.id, memberName(member)]))
    : undefined;
  function navigate(key?: string, value?: string) {
    const next = new URLSearchParams(params);
    next.delete("objective");
    next.delete("new");
    next.delete("operational");
    if (key && value) next.set(key, value);
    router.replace(`/portfolio/${clientId}/objectives?${next}`, {
      scroll: false,
    });
  }
  if (operational) {
    const editing = selected?.id === operational.id;
    const edit = (open: boolean) => {
      const next = new URLSearchParams(params);
      if (open) next.set("objective", operational.id);
      else next.delete("objective");
      router.replace(`/portfolio/${clientId}/objectives?${next}`, {
        scroll: false,
      });
    };
    return (
      <div className="page">
        <ObjectiveOperationalPage
          key={`${clientId}:${operational.id}:${operational.version}`}
          objective={operational}
          onBack={() => navigate()}
          onEdit={() => edit(true)}
          onReloadObjective={() => void query.refetch()}
        />
        <ObjectiveEditor
          key={`operational-editor:${clientId}:${operational.id}`}
          clientId={clientId}
          objective={operational}
          open={editing}
          onOpenChange={edit}
        />
      </div>
    );
  }
  if (creating && records)
    return (
      <NewObjectivePage
        key={clientId}
        clientId={clientId}
        onClose={() => navigate()}
        onSaved={(objective) => navigate("objective", objective.id)}
      />
    );
  return (
    <div className="page">
      <header className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <h1>Objectives</h1>
          <span
            className={styles.readinessInfo}
            title="Objectives capture outcomes, review readiness and linked work."
            aria-hidden="true"
          >
            i
          </span>
        </div>
        <button
          className={`button primary ${styles.newObjective}`}
          disabled={!records || query.isFetching}
          onClick={() => navigate("new", "1")}
        >
          New objective
        </button>
      </header>
      {records && records.length > 0 && <ObjectiveStats records={records} />}
      <div className={styles.columns}>
        <AdvocacyHistory clientId={clientId} />
        <div className={styles.catalogColumn}>
          <QueryState
            pending={query.isPending}
            error={query.error}
            retry={() => void query.refetch()}
          />
          {records && (
            <ObjectiveList
              records={records}
              filter={filter}
              onFilter={setFilter}
              busy={query.isFetching}
              ownerNames={ownerNames}
              onEdit={(id) => navigate("objective", id)}
              onWork={(id) => navigate("operational", id)}
              onDelete={setDeleting}
            />
          )}
          {params.has("objective") && query.isSuccess && !selected && (
            <p role="alert">
              This objective is unavailable or has been removed.
            </p>
          )}
          {params.has("operational") && query.isSuccess && !operational && (
            <p role="alert">
              This objective operational page is unavailable or has been
              removed.
            </p>
          )}
        </div>
      </div>
      <ObjectiveEditor
        key={`${clientId}:${selected?.id ?? "closed"}`}
        clientId={clientId}
        objective={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) navigate();
        }}
      />
      <Dialog
        open={Boolean(records && deleting)}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleting(undefined);
        }}
        title="Delete objective"
        description="The objective will be removed from current objectives; its audit history is retained."
      >
        <p>{deleting ? objectiveTitle(deleting) : "Untitled objective"}</p>
        <QueryState error={remove.error} />
        <div className="formActions">
          <button
            className="button"
            disabled={remove.isPending}
            onClick={() => setDeleting(undefined)}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={remove.isPending || !remove.canWrite}
            onClick={() => {
              if (deleting) remove.mutate(deleting);
            }}
          >
            Delete objective
          </button>
        </div>
      </Dialog>
    </div>
  );
}
