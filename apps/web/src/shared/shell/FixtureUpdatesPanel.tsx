"use client";
import { useRef } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@capiro/ui/dialog";
import overlay from "./fixture-overlays.module.css";

/** Designed update groups (Figma 3.4 Overlay · Updates panel); no live updates are read. */
const examples = [
  { group: "Run outcomes", example: "Research run completed · 10 Oct" },
  { group: "Decisions", example: "Memory proposal needs review" },
  { group: "Connections", example: "Research portal needs reconnect" },
] as const;

/** Fixture-mode Updates panel opened from the header bell. */
export function FixtureUpdatesPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // The panel opens from the header bell or a page control; focus returns to whichever opened it.
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${overlay.surface} ${overlay.panel}`}
        showCloseButton={false}
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          const target = opener.current;
          opener.current = null;
          if (target?.isConnected && target !== document.body) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <DialogTitle className={overlay.title}>Workspace updates</DialogTitle>
        <DialogDescription className={overlay.muted}>
          Designed examples · Current live updates are unavailable.
        </DialogDescription>
        <table className={overlay.table}>
          <caption className="sr-only">Grouped workspace updates</caption>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col">Example</th>
            </tr>
          </thead>
          <tbody>
            {examples.map((row) => (
              <tr key={row.group}>
                <td>{row.group}</td>
                <td>{row.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section className={overlay.notice} aria-label="You are all caught up">
          <h3>You are all caught up</h3>
          <p>Empty state when no new updates are available.</p>
        </section>
        <DialogClose className={overlay.item}>Close</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
