"use client";
import { Command, CommandInput, CommandList } from "@capiro/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@capiro/ui/dialog";
import { MotionSurface } from "@capiro/ui/motion";
import { useIdentity } from "../portfolio/auth/identity";
import { useClientEntry } from "./useClientEntry";
import { usePaletteDialog } from "./usePaletteDialog";
import {
  PaletteResults,
  PaletteSearchStatus,
  usePaletteSearch,
} from "./PaletteResults";
import styles from "./command-palette.module.css";

export const openMeriPalette = () =>
  window.dispatchEvent(new Event("meri:open-command-palette"));

/** Core title search and the canonical client roster remain the read owners.
 * Keyed signed-in lifetime retires results; selection never submits a message. */
export function MeriCommandPalette() {
  const identity = useIdentity();
  const account =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  if (!account?.tenant?.id) return null;
  return (
    <ScopedMeriCommandPalette key={`${account.tenant.id}:${account.user.id}`} />
  );
}
function ScopedMeriCommandPalette() {
  const dialog = usePaletteDialog();
  const results = usePaletteSearch(dialog.search, dialog.open);
  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <DialogContent
        className={styles.dialog}
        onCloseAutoFocus={dialog.restoreFocus}
      >
        <MotionSurface>
          <DialogTitle className={styles.title}>
            Search and commands
          </DialogTitle>
          <DialogDescription className={styles.hint}>
            Search your chat titles or choose a client. ↑ ↓ to move · Enter to
            choose · Esc to close.
          </DialogDescription>
          <Command shouldFilter={false} className={styles.command}>
            <CommandInput
              placeholder="Search chats, clients and commands"
              value={dialog.search}
              onValueChange={dialog.setSearch}
              maxLength={200}
            />
            <CommandList>
              <PaletteResults
                search={dialog.search}
                chats={results.chats}
                roster={results.roster}
                navigate={dialog.navigate}
                chooseClient={dialog.setClient}
              />
            </CommandList>
          </Command>
          <PaletteSearchStatus {...results} />
          {dialog.client && (
            <ClientHandoff
              key={dialog.client.id}
              client={dialog.client}
              close={() => dialog.setOpen(false)}
            />
          )}
        </MotionSurface>
      </DialogContent>
    </Dialog>
  );
}
function ClientHandoff({
  client,
  close,
}: {
  client: { id: string; name: string };
  close: () => void;
}) {
  const entry = useClientEntry(client.id, true, "command-palette");
  return (
    <div className={styles.handoff}>
      <strong>{client.name}</strong>
      <p>{entry.reason}</p>
      <button
        disabled={!entry.ready}
        onClick={() => {
          entry.open();
          close();
        }}
      >
        Open client chat
      </button>
      <p>Your message stays yours to write and send.</p>
    </div>
  );
}
