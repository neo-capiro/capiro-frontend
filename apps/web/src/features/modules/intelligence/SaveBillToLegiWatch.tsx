"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { ExplorerRecord } from "../../../shared/capiro/operations/intelligence-explorer";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
} from "../../../shared/module-ui";
export function SaveBillToLegiWatch({ record }: { record: ExplorerRecord }) {
  const api = useCapiro();
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const folders = useCapiroQuery("legiwatch.folders", {}, { enabled: open });
  const supported =
    !!record.billType && record.billNumber != null && record.congress != null;
  async function save() {
    if (!supported || !folder) return;
    setBusy(true);
    setError(undefined);
    try {
      const resolved = await api.request("legiwatch.folder.resolve", {
        body: {
          folderIds: [folder],
          jurisdiction: "US",
          sessionKey: String(record.congress),
          billNumbers: `${record.billType!.toUpperCase()}${record.billNumber}`,
        },
      });
      const match = resolved.find((r) => r.status === "resolved" && r.bill);
      if (!match?.bill)
        throw new Error(
          resolved[0]?.reason ||
            "This official bill reference could not be resolved.",
        );
      const receipt = await api.request("legiwatch.folder.bulk", {
        params: { id: folder },
        body: { billIds: [match.bill.id], action: "add" },
      });
      const failed = receipt.results.find(
        (r) => !["added", "already_present"].includes(r.status),
      );
      if (failed) throw new Error(`Save outcome: ${failed.status}`);
      setSaved(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save bill");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ActionButton
        disabled={!supported || busy}
        title={
          supported
            ? undefined
            : "Choose a federal bill with an official bill number and Congress."
        }
        onClick={() => setOpen(true)}
      >
        {saved ? "Saved to LegiWatch" : "Save to LegiWatch"}
      </ActionButton>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Save bill to LegiWatch"
        description="Resolve the official bill reference into a tracking folder. This does not enable alerts."
        footer={
          <ActionButton primary disabled={busy || !folder} onClick={save}>
            Save bill
          </ActionButton>
        }
      >
        <StatusPanel
          loading={folders.loading}
          error={folders.error}
          onRetry={folders.reload}
        >
          <p>
            {record.billType?.toUpperCase()} {record.billNumber} · Congress{" "}
            {record.congress}
          </p>
          <Field label="Folder" htmlFor="bill-save-folder">
            <select
              id="bill-save-folder"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              <option value="">Choose folder</option>
              {folders.data
                ?.filter(
                  (f) => f.canEdit && !f.archived && f.jurisdiction === "US",
                )
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </Field>
          {error && <p role="alert">{error}</p>}
        </StatusPanel>
      </Modal>
    </>
  );
}
