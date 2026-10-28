import type { ReactNode } from "react";
import { ModuleBreadcrumb } from "./ModuleBreadcrumb";
import { ModuleHeader } from "./ModuleHeader";
import { ModuleNavigation } from "./ModuleNavigation";
import {
  ModuleSidebarVisibility,
  ModuleSidebarWorkspace,
} from "./ModuleSidebarVisibility";
import type { ModuleSlug } from "./module-catalog";
import styles from "./module-shell.module.css";

export function ModuleShell({
  children,
  active = "hub",
  settings = false,
  portfolioUrl,
  readOnlyPreview = false,
}: {
  children: ReactNode;
  active?: ModuleSlug | "hub";
  settings?: boolean;
  portfolioUrl?: string;
  readOnlyPreview?: boolean;
}) {
  return (
    <ModuleSidebarVisibility>
      <div className={styles.shell}>
        <a href="#main-content" className={styles.skip}>
          Skip to content
        </a>
        <ModuleHeader
          portfolioUrl={portfolioUrl}
          settings={settings}
          readOnlyPreview={readOnlyPreview}
        />
        <ModuleSidebarWorkspace>
          {!settings && (
            <ModuleNavigation
              active={active}
              readOnlyPreview={readOnlyPreview}
            />
          )}
          <main
            className={
              /* Directory keeps the default `.main` inset its approved frame is drawn to;
                 the narrower `.hubMain` variant is for the hub/landscape grid pages. */
              settings
                ? styles.settingsMain
                : `${styles.main} ${active === "calendar" ? styles.calendarMain : ""} ${active === "engagement" ? styles.engagementMain : ""} ${active === "strategies" ? styles.strategiesMain : ""} ${["hub", "intelligence", "research-portfolios"].includes(active) ? styles.hubMain : ""}`
            }
            id="main-content"
          >
            {!settings &&
              active !== "hub" &&
              active !== "calendar" &&
              active !== "strategies" && <ModuleBreadcrumb active={active} />}
            {children}
          </main>
        </ModuleSidebarWorkspace>
      </div>
    </ModuleSidebarVisibility>
  );
}
