"use client";
import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useCommittees } from "./directory-queries";
import type { DirectoryKind } from "./directory-contracts";
import { CommitteePicker } from "./committee/CommitteePicker";
import { DirectoryResults } from "./DirectoryResults";
import type { GovernmentTarget } from "./target-contracts";
export function AddTargetDialog({
  clientId,
  targets,
  onClose,
  committee = false,
}: {
  clientId: string;
  targets: GovernmentTarget[];
  onClose: () => void;
  committee?: boolean;
}) {
  const [kind, setKind] = useState<DirectoryKind | "all">(
    committee ? "committee" : "all",
  );
  const [query, setQuery] = useState("");
  const [committeeId, setCommitteeId] = useState("");
  const committees = useCommittees(kind === "committee");
  const busy =
    useIsMutating({ mutationKey: ["client-target-write", clientId] }) > 0;
  return (
    <Dialog
      open
      wide
      title="Add relationship"
      description="Search the directory and add a government target for this client."
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <form
        className="toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(
            String(new FormData(event.currentTarget).get("q") ?? "").trim(),
          );
        }}
      >
        <label>
          Search the directory
          <input name="q" maxLength={200} autoFocus disabled={busy} />
        </label>
        <button className="button" disabled={busy}>
          Search
        </button>
      </form>
      <nav className="row" aria-label="Directory type">
        {(
          [
            ["all", "All"],
            ["congress", "Members"],
            ["staff", "Congressional staff"],
            ["state", "State"],
            ["committee", "Committee staff"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className="button"
            aria-pressed={kind === value}
            disabled={busy}
            onClick={() => setKind(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {kind === "committee" && (
        <>
          <QueryState
            pending={committees.isPending}
            error={committees.error}
            retry={() => void committees.refetch()}
          />
          <CommitteePicker
            committees={committees.data ?? []}
            value={committeeId}
            disabled={
              busy ||
              !committees.isSuccess ||
              committees.isFetching ||
              Boolean(committees.error)
            }
            onChange={setCommitteeId}
          />
        </>
      )}
      {query || (kind === "committee" && committeeId) ? (
        <div className="stack">
          {(kind === "all"
            ? (["congress", "staff", "state"] as const)
            : [kind]
          ).map((source) => (
            <DirectoryResults
              key={`${source}:${query}:${committeeId}`}
              kind={source}
              query={query}
              clientId={clientId}
              targets={targets}
              committeeId={committeeId || undefined}
            />
          ))}
        </div>
      ) : (
        <p className="empty">
          Type a name to search the directory
          {kind === "committee" && ", or select a committee"}.
        </p>
      )}
      <div className="formActions">
        <button className="button" disabled={busy} onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  );
}
