"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { readVersion, type BriefScope } from "./api";
import type { BriefVersion, CurrentBrief } from "./contracts";
import { BriefDocument } from "./BriefDocument";
import { BriefHistory } from "./BriefHistory";
import { BriefEditor } from "./BriefEditor";
import { BriefSource } from "./BriefSource";
import { BriefRefresh } from "./BriefRefresh";
import { WorkspaceCopyLink } from "./WorkspaceCopyLink";
import styles from "./brief.module.css";

export function BriefViewer({
  scope,
  data,
  onClose,
}: {
  scope: BriefScope;
  data: CurrentBrief;
  onClose: () => void;
}) {
  const api = useApi();
  const [selected, setSelected] = useState<{
    id: string;
    versionNumber: number;
  }>();
  const [panel, setPanel] = useState<"document" | "history" | "refresh">(
    "document",
  );
  const [editing, setEditing] = useState<BriefVersion>();
  const [source, setSource] = useState<number>();
  const historical = useQuery({
    queryKey: [
      "prospect-brief-version",
      scope.tenantId,
      scope.prospectId,
      selected?.id,
    ],
    enabled: !!selected,
    queryFn: ({ signal }) => {
      if (!selected) throw new Error("Select a saved version.");
      return readVersion(
        api,
        scope.prospectId,
        selected.versionNumber,
        selected.id,
        signal,
      );
    },
  });
  const version = selected
    ? historical.isSuccess && !historical.error
      ? historical.data
      : undefined
    : data.currentVersion;
  const current = !selected || selected.id === data.currentVersion?.id;
  const editable = current && data.brief?.status === "draft" && !!version;
  if (!version && source !== undefined) setSource(undefined);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={data.brief?.title ?? "Saved prospect brief"}
      description="Saved versions and source citations. Workspace copies retain their original Core version."
      className={styles.viewer}
    >
      <nav className="row" aria-label="Brief views">
        <button
          className="button"
          aria-pressed={panel === "document"}
          onClick={() => setPanel("document")}
        >
          Document
        </button>
        <button
          className="button"
          aria-pressed={panel === "history"}
          onClick={() => setPanel("history")}
        >
          Version history
        </button>
        <button
          className="button"
          aria-pressed={panel === "refresh"}
          disabled={!data.currentVersion}
          onClick={() => setPanel("refresh")}
        >
          Compare current dossier
        </button>
        {editable && (
          <button
            className="button"
            onClick={() => setEditing(version ?? undefined)}
          >
            Edit sections
          </button>
        )}
        {selected && (
          <button className="button" onClick={() => setSelected(undefined)}>
            Return to current version
          </button>
        )}
      </nav>
      <WorkspaceCopyLink scope={scope} brief={data.brief} version={version} />
      {panel === "history" ? (
        <BriefHistory
          scope={scope}
          onSelect={(entry) => {
            setSelected(entry);
            setPanel("document");
          }}
        />
      ) : panel === "refresh" && data.currentVersion ? (
        <BriefRefresh
          prospectId={scope.prospectId}
          versionNumber={data.currentVersion.versionNumber}
        />
      ) : (
        <>
          <QueryState
            pending={!!selected && historical.isPending}
            error={selected ? historical.error : null}
            retry={() => void historical.refetch()}
          />
          {version ? (
            <BriefDocument
              title={data.brief?.title ?? "Saved brief"}
              version={version}
              onSource={setSource}
            />
          ) : (
            (!selected || !historical.isPending) && (
              <p>No saved version is available.</p>
            )
          )}
        </>
      )}
      {editing && (
        <BriefEditor
          scope={scope}
          title={data.brief?.title ?? ""}
          version={editing}
          available={editable}
          onClose={() =>
            setEditing((active) => (active === editing ? undefined : active))
          }
        />
      )}
      {source !== undefined && version && (
        <BriefSource
          prospectId={scope.prospectId}
          version={version}
          index={source}
          current={current}
          onClose={() => setSource(undefined)}
        />
      )}
    </Dialog>
  );
}
