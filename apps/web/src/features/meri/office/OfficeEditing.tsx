"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@capiro/ui/button";
import type { LibraryVersion } from "../../../shared/meri-documents/library-access";
import { OfficeEditor } from "./OfficeEditor";

const officeMimes = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const Editing = createContext<((version: LibraryVersion) => void) | null>(null);

/** Above the library session: refreshing its reads must not unmount a live editor. */
export function OfficeEditing({
  enabled,
  account,
  children,
}: {
  enabled: boolean;
  account: { tenantId: string; actorId: string };
  children: ReactNode;
}) {
  const [selected, select] = useState<LibraryVersion | null>(null);
  return (
    <Editing.Provider value={enabled ? select : null}>
      {children}
      {enabled && selected && (
        <OfficeEditor
          key={selected.versionId}
          account={account}
          version={selected}
          onClose={() => select(null)}
        />
      )}
    </Editing.Provider>
  );
}

export function OfficeEditButton({
  version,
  disabled,
}: {
  version: LibraryVersion;
  disabled?: boolean;
}) {
  const edit = useContext(Editing);
  if (!edit || !officeMimes.has(version.mimeType)) return null;
  return (
    <Button variant="outline" disabled={disabled} onClick={() => edit(version)}>
      Edit private copy
    </Button>
  );
}
