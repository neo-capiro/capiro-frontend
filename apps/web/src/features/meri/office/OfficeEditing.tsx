"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@capiro/ui/button";
import type { OfficeDocument } from "@capiro/meri-contracts/office-application";
import { OfficeEditor } from "./OfficeEditor";

const officeMimes = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
/** What the editor needs of a version: a library row or an applied Meri proposal both supply it. */
export type OfficeTarget = Readonly<{
  versionId: string;
  filename?: string | undefined;
  mimeType?: string | undefined;
  binding: Readonly<{ conversationId: string }>;
  scopes: readonly Readonly<{ kind: string; resourceId: string }>[];
  /** Shown in the editor so the person knows which version they are looking at and where it came from. */
  note?: string | undefined;
}>;
export const isOfficeTarget = (version: OfficeTarget) =>
  version.mimeType !== undefined && officeMimes.has(version.mimeType);
const Editing = createContext<((version: OfficeTarget) => void) | null>(null);
/** The editor opener, or null when Office editing is not enabled for this deployment or account. */
export const useOfficeOpen = () => useContext(Editing);

/** Above the library or chat session: refreshing its reads must not unmount a live editor. */
export function OfficeEditing({
  enabled,
  account,
  onPublished,
  children,
}: {
  enabled: boolean;
  account: { tenantId: string; actorId: string } | null;
  /** A new immutable version was published from this editor; the host may refresh its history. */
  onPublished?: ((document: OfficeDocument) => void) | undefined;
  children: ReactNode;
}) {
  const [selected, select] = useState<OfficeTarget | null>(null);
  const active = enabled && account !== null;
  return (
    <Editing.Provider value={active ? select : null}>
      {children}
      {active && selected && (
        <OfficeEditor
          key={selected.versionId}
          account={account}
          version={selected}
          onClose={() => select(null)}
          {...(onPublished ? { onPublished } : {})}
        />
      )}
    </Editing.Provider>
  );
}

export function OfficeEditButton({
  version,
  disabled,
}: {
  version: OfficeTarget;
  disabled?: boolean;
}) {
  const edit = useOfficeOpen();
  if (!edit || !isOfficeTarget(version)) return null;
  return (
    <Button variant="outline" disabled={disabled} onClick={() => edit(version)}>
      Edit private copy
    </Button>
  );
}

/** Reopen the version Meri published, with its provenance shown in the editor. Nothing when Office is off. */
export function OfficeOpenVersionButton({
  version,
}: {
  version: OfficeTarget;
}) {
  const edit = useOfficeOpen();
  if (!edit || !isOfficeTarget(version)) return null;
  return (
    <Button variant="outline" onClick={() => edit(version)}>
      Open the new version in the editor
    </Button>
  );
}
