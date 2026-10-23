import { HeaderFrame } from "./HeaderFrame";
import { ModeLink } from "./ModeLink";
import Link from "next/link";
import { ScopedLink } from "./ScopedLink";
import { ModuleAsset } from "./ModuleAsset";
import { ModuleSidebarToggle } from "./ModuleSidebarVisibility";
import { AccountProfileControl } from "./AccountProfileControl";
import styles from "./module-shell.module.css";

export function ModuleHeader({
  activeMode = "modules",
  settings = false,
  readOnlyPreview = false,
}: {
  portfolioUrl?: string;
  activeMode?: "meri" | "modules";
  settings?: boolean;
  readOnlyPreview?: boolean;
}) {
  return (
    <HeaderFrame
      mobileModeRow
      className={styles.header}
      brand={
        <div className={styles.brand}>
          <Link href="/" className={styles.wordmark} aria-label="Capiro Home">
            <img
              src="/design/modules/shared/imgCapiroWordmark.png"
              width="77"
              height="26"
              alt="Capiro"
            />
          </Link>
          <ModuleSidebarToggle
            controls={settings ? "settings-navigation" : "module-navigation"}
          />
        </div>
      }
      modes={
        <nav className={styles.modes} aria-label="Product modes">
          <ModeLink
            mode="meri"
            aria-label="Meri"
            aria-current={activeMode === "meri" ? "page" : undefined}
            className={activeMode === "meri" ? styles.selectedMode : undefined}
          >
            <ModuleAsset name="meri" />
          </ModeLink>
          <ModeLink mode="portfolio" aria-label="Portfolio">
            <ModuleAsset name="portfolio" />
          </ModeLink>
          <ModeLink
            mode="modules"
            aria-label="Modules"
            aria-current={activeMode === "modules" ? "page" : undefined}
            className={
              activeMode === "modules" ? styles.selectedMode : undefined
            }
          >
            <ModuleAsset name="modules" />
          </ModeLink>
        </nav>
      }
      actions={
        readOnlyPreview ? undefined : (
          <nav className={styles.globalActions} aria-label="Workspace actions">
            <Link href="/?log=1" aria-label="Quick log">
              <ModuleAsset name="quickLog" />
            </Link>
            <ScopedLink href="/calendar" aria-label="Master calendar">
              <ModuleAsset name="calendar" />
            </ScopedLink>
            <ScopedLink
              href="/modules/intelligence"
              aria-label="Search intelligence"
            >
              <ModuleAsset name="search" />
            </ScopedLink>
            <button
              type="button"
              disabled
              aria-label="Updates — unavailable"
              title="Notifications integration is pending"
            >
              <ModuleAsset name="updates" />
            </button>
            <AccountProfileControl />
          </nav>
        )
      }
    />
  );
}
