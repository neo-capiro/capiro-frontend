"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useMatters, useMatter } from "./queries";
import { MatterEditor } from "./MatterEditor";
import { RecordDialog } from "./RecordDialog";
import { MatterDetail } from "./MatterDetail";
import { CorrectionDialog, type CorrectionContext } from "./CorrectionDialog";
import { UnassignedRecords } from "./UnassignedRecords";
import { useAdvocacyAccess } from "./access";
import { canAdminister } from "@/shared/portfolio/auth/identity";
import { AdvocacyBrowser } from "./AdvocacyBrowser";
import { AdvocacyReadState } from "./AdvocacyReadState";
import { EditMatterDialog } from "./EditMatterDialog";
import { captureMatterEdit, type MatterEditReview } from "./matter-edit-scope";
import { currentAdvocacyActor, useAdvocacyRevision } from "./read-state";
import styles from "./advocacy.module.css";

export function AdvocacyHistory({ clientId }: { clientId: string }) {
  const { identity } = useAdvocacyAccess();
  const scope = JSON.stringify([
    clientId,
    identity.data?.tenant?.id,
    identity.data?.user.id,
  ]);
  return <ClientAdvocacyHistory key={scope} clientId={clientId} />;
}
function ClientAdvocacyHistory({ clientId }: { clientId: string }) {
  const { identity, canRead: accessCanRead } = useAdvocacyAccess();
  const cache = useAdvocacyRevision(clientId);
  const actor = currentAdvocacyActor(cache);
  const canRead = accessCanRead && Boolean(actor);
  const canEdit = canRead && canAdminister(actor?.role);
  const matters = useMatters(clientId, canRead);
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(() =>
    params.get("matter"),
  );
  const detail = useMatter(clientId, selected, canRead);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MatterEditReview>();
  const [addRecord, setAddRecord] = useState(false);
  const [correction, setCorrection] = useState<CorrectionContext>();
  const [notice, setNotice] = useState("");
  const current = canRead && !detail.error ? detail.data : undefined;
  return (
    <section
      className={`card stack ${styles.history}`}
      aria-label="Advocacy history"
    >
      <header className="row between">
        <div>
          <h2>Advocacy history</h2>
        </div>
        <button
          className="button primary"
          disabled={!canEdit}
          onClick={() => setCreating(true)}
        >
          <Plus size={14} aria-hidden="true" />
          New matter
        </button>
      </header>
      <p className="muted">
        Advocacy records and linked events for this client.
      </p>
      <QueryState
        pending={identity.isPending || identity.isFetching}
        error={identity.error}
        retry={() => void identity.refetch()}
      />
      {!identity.isPending &&
        !identity.isFetching &&
        !identity.error &&
        !canRead && (
          <p className="status">This account cannot access advocacy history.</p>
        )}
      {notice && (
        <p className="status" role="status">
          {notice}
        </p>
      )}
      {canRead && (
        <>
          <AdvocacyBrowser clientId={clientId} onSelect={setSelected} />
          <UnassignedRecords
            clientId={clientId}
            canEdit={canEdit}
            onCorrect={setCorrection}
          />
        </>
      )}
      <MatterEditor
        clientId={clientId}
        open={creating}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
          }
        }}
      />
      {editing && (
        <EditMatterDialog
          key={`${clientId}:${editing.matter.id}`}
          review={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(message) => {
            setEditing(undefined);
            setNotice(message);
          }}
        />
      )}
      <Dialog
        open={Boolean(selected) && !correction && !editing}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={current?.title ?? "Advocacy matter"}
        className={styles.detail}
      >
        {canRead ? (
          <>
            <AdvocacyReadState
              label="matter details"
              current={detail.isCurrent}
              pending={detail.isPending || detail.isFetching}
              error={detail.error}
              retry={() => void detail.refetch()}
            />
            {current && (
              <MatterDetail
                matter={current}
                canEdit={canEdit && matters.isCurrent}
                onEdit={() => {
                  try {
                    setEditing(captureMatterEdit(cache, clientId, current));
                  } catch (error) {
                    setNotice(
                      error instanceof Error
                        ? error.message
                        : "Reload current advocacy details before editing.",
                    );
                  }
                }}
                onAdd={() => setAddRecord(true)}
                onCorrect={setCorrection}
              />
            )}
          </>
        ) : (
          <p className="status">Current advocacy access is unavailable.</p>
        )}
      </Dialog>
      {addRecord && (
        <RecordDialog
          clientId={clientId}
          matterId={selected}
          onClose={() => setAddRecord(false)}
        />
      )}
      {correction && (
        <CorrectionDialog
          clientId={clientId}
          context={correction}
          matters={!matters.error ? (matters.data ?? []) : []}
          onClose={() => setCorrection(undefined)}
          onSaved={() => {
            setCorrection(undefined);
            setNotice("Updated history reflects this correction.");
          }}
        />
      )}
    </section>
  );
}
