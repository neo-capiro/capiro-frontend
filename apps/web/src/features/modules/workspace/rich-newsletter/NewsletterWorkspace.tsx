"use client";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Eye,
  Layers,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Paintbrush,
  Redo2,
  Smartphone,
  Sparkles,
  Undo2,
} from "lucide-react";
import styles from "./workspace.module.css";

/** One presentation for rich campaigns and saved Workspace-format newsletters.
 * Persistence, admission and recovery remain with the format's existing owner. */
export function NewsletterWorkspace({
  name,
  nameLimit = 200,
  rename,
  status,
  close,
  closingDisabled,
  actions,
  children,
}: {
  name: string;
  nameLimit?: number;
  rename?: (value: string) => void;
  status: string;
  close: () => void;
  closingDisabled?: boolean;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.root} aria-label="Newsletter workspace">
      <header className={styles.header}>
        <button
          aria-label="Back to Workspace"
          disabled={closingDisabled}
          onClick={close}
        >
          <ArrowLeft size={20} />
        </button>
        <div className={styles.title}>
          <input
            aria-label="Newsletter name"
            value={name}
            maxLength={nameLimit}
            disabled={!rename}
            onChange={(event) => rename?.(event.target.value)}
          />
          <span role="status">{status}</span>
        </div>
        <div className={styles.headerActions}>{actions}</div>
      </header>
      {children}
    </section>
  );
}

export function NewsletterWorkbench({
  disabled,
  rail,
  selectRail,
  sidebar,
  mobile,
  setMobile,
  undo,
  redo,
  comments,
  preview,
  children,
}: {
  disabled: boolean;
  rail: string;
  selectRail: (value: string) => void;
  sidebar: ReactNode;
  mobile: boolean;
  setMobile: (value: boolean) => void;
  undo?: () => void;
  redo?: () => void;
  comments?: () => void;
  preview: () => void;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.workbench} disabled={disabled} inert={disabled}>
      <nav className={styles.rail} aria-label="Newsletter tools">
        {(
          [
            ["Blocks", LayoutGrid],
            ["Sections", Layers],
            ["Styles", Paintbrush],
            ["Optimize", Sparkles],
          ] as const
        ).map(([name, Icon]) => (
          <button
            key={name}
            aria-pressed={rail === name}
            onClick={() => selectRail(name)}
          >
            <Icon size={22} />
            <span>{name}</span>
          </button>
        ))}
      </nav>
      <aside className={styles.sidebar} aria-label="Newsletter settings">
        {sidebar}
      </aside>
      <main className={styles.canvasArea}>
        <div className={styles.canvasTools}>
          <div>
            <button
              aria-label="Desktop canvas"
              aria-pressed={!mobile}
              onClick={() => setMobile(false)}
            >
              <Monitor size={18} />
            </button>
            <button
              aria-label="Mobile canvas"
              aria-pressed={mobile}
              onClick={() => setMobile(true)}
            >
              <Smartphone size={18} />
            </button>
            <button aria-label="Undo" disabled={!undo} onClick={undo}>
              <Undo2 size={18} />
            </button>
            <button aria-label="Redo" disabled={!redo} onClick={redo}>
              <Redo2 size={18} />
            </button>
          </div>
          <div>
            <button disabled={!comments} onClick={comments}>
              <MessageSquare size={17} />
              Comments
            </button>
            <button onClick={preview}>
              <Eye size={17} />
              Preview
            </button>
          </div>
        </div>
        {children}
      </main>
    </fieldset>
  );
}
