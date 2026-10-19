"use client";

import { PanelLeft } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import styles from "./module-shell.module.css";

type SidebarVisibility = {
  expanded: boolean;
  toggle: () => void;
};

const SidebarVisibilityContext = createContext<SidebarVisibility | null>(null);

/** One local control serves the Modules rail and the Settings rail. */
export function ModuleSidebarVisibility({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <SidebarVisibilityContext.Provider
      value={{ expanded, toggle: () => setExpanded((value) => !value) }}
    >
      {children}
    </SidebarVisibilityContext.Provider>
  );
}

function useSidebarVisibility() {
  const state = useContext(SidebarVisibilityContext);
  if (!state) throw new Error("Module sidebar control requires ModuleShell");
  return state;
}

export function ModuleSidebarToggle({ controls }: { controls: string }) {
  const { expanded, toggle } = useSidebarVisibility();
  return (
    <button
      type="button"
      className={styles.sidebarToggle}
      aria-label="Toggle sidebar"
      aria-controls={controls}
      aria-expanded={expanded}
      onClick={toggle}
    >
      <PanelLeft size={18} aria-hidden="true" />
    </button>
  );
}

/** Server-rendered route content remains outside the client module graph. */
export function ModuleSidebarWorkspace({ children }: { children: ReactNode }) {
  const { expanded } = useSidebarVisibility();
  return (
    <div
      className={`${styles.body} ${expanded ? "" : styles.sidebarCollapsed}`}
    >
      {children}
    </div>
  );
}
