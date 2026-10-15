"use client";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { MeriDialog } from "../../ui/MeriDialog";
import { CommandPalette, type PaletteView } from "./CommandPalette";
import ui from "../../ui/meri-ui.module.css";
import styles from "./conversation.module.css";

export type { PaletteView } from "./CommandPalette";

/** 01.05 Search and command palette: opens with ⌘K / Ctrl+K over local fixture results. */
export function CommandPaletteScreen({ view }: { view: PaletteView }) {
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey))
        return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);
  return (
    <div className={ui.page}>
      <div className={styles.paletteHeading}>
        <h1 className="sr-only">Search your Meri workspace</h1>
        {open ? null : (
          <button
            type="button"
            className={ui.outline}
            ref={trigger}
            aria-haspopup="dialog"
            aria-keyshortcuts="Meta+K Control+K"
            onClick={() => setOpen(true)}
          >
            <Search aria-hidden /> Search your Meri workspace
            <kbd className={styles.kbd}>⌘K</kbd>
          </button>
        )}
        <span className={ui.wordmark} role="img" aria-label="Meri" />
      </div>
      <MeriDialog
        open={open}
        onOpenChange={setOpen}
        returnFocus={trigger}
        title="Search your Meri workspace"
        description="⌘K / Ctrl+K · Use arrows to choose · Enter to open"
        placement="top"
        hint
      >
        <CommandPalette view={view} />
      </MeriDialog>
    </div>
  );
}
