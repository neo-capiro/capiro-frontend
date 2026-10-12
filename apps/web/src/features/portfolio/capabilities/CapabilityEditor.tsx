"use client";
import { useRef, useState } from "react";
import { Tabs } from "radix-ui";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { EntityDocuments } from "@/features/portfolio/files/public";
import type { Capability } from "./contracts";
import { useCapabilityMutation } from "./mutations";
import { CapabilityForm } from "./CapabilityForm";
import styles from "./capability-editor.module.css";

export function CapabilityEditor({
  clientId,
  capability,
  open,
  onClose,
}: {
  clientId: string;
  capability?: Capability;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("profile");
  const [remove, setRemove] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const profileTab = useRef<HTMLButtonElement>(null);
  const mutation = useCapabilityMutation(
    clientId,
    capability?.id,
    open,
    onClose,
  );
  const saving = mutation.isPending && mutation.variables?.type === "save";
  const form = (
    <CapabilityForm
      capability={capability}
      disabled={!mutation.canWrite || mutation.isPending}
      saving={saving}
      pending={mutation.isPending}
      error={mutation.variables?.type === "save" ? mutation.error : undefined}
      onSave={(body) => mutation.mutate({ type: "save", body })}
      onRemove={() => setRemove(true)}
      onCancel={onClose}
    />
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !mutation.isPending) onClose();
      }}
      onOpenAutoFocus={(event) => {
        opener.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        event.preventDefault();
        if (capability) profileTab.current?.focus();
        else if (event.target instanceof HTMLElement)
          event.target
            .querySelector<HTMLInputElement>('input[name="name"]')
            ?.focus();
      }}
      onCloseAutoFocus={(event) => {
        if (opener.current?.isConnected) {
          event.preventDefault();
          opener.current.focus();
        }
      }}
      title={capability ? `Capability: ${capability.name}` : "New capability"}
      className={`${styles.dialog} ${capability ? styles.saved : ""}`}
    >
      {capability ? (
        <Tabs.Root value={tab} onValueChange={setTab} className={styles.tabs}>
          <Tabs.List
            aria-label="Capability sections"
            className={styles.tabList}
          >
            <Tabs.Trigger
              value="profile"
              ref={profileTab}
              className={styles.tab}
            >
              Profile
            </Tabs.Trigger>
            <Tabs.Trigger value="documents" className={styles.tab}>
              Documents
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="profile" forceMount className={styles.tabPanel}>
            {form}
          </Tabs.Content>
          <Tabs.Content value="documents" className={styles.tabPanel}>
            <div className={styles.documents}>
              <EntityDocuments
                clientId={clientId}
                source={`capability:${capability.id}`}
                description="Documents added here are scoped to this capability and also appear in the client’s Files tab."
                emptyMessage="No documents yet for this capability."
              />
            </div>
          </Tabs.Content>
        </Tabs.Root>
      ) : (
        form
      )}
      <Dialog
        open={remove}
        onOpenChange={(value) => {
          if (!mutation.isPending) setRemove(value);
        }}
        title="Remove capability"
        description="Remove this capability from the client profile?"
      >
        <QueryState
          error={
            mutation.variables?.type === "remove" ? mutation.error : undefined
          }
        />
        <button
          className="button primary"
          disabled={!mutation.canWrite || mutation.isPending}
          onClick={() => {
            if (capability) mutation.mutate({ type: "remove" });
          }}
        >
          Confirm remove
        </button>
      </Dialog>
    </Dialog>
  );
}
