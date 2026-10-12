import { HeaderFrame } from "./HeaderFrame";
import { ModeLink } from "./ModeLink";
import Link from "next/link";
import { ModuleAsset } from "./ModuleAsset";
import styles from "./module-shell.module.css";

export function ModuleHeader({
  activeMode = "modules",
}: {
  portfolioUrl?: string;
  activeMode?: "meri" | "modules";
}) {
  return (
    <HeaderFrame
      className={styles.header}
      brand={
        <Link href="/" className={styles.brand} aria-label="Capiro Home">
          <img
            src="/design/modules/shared/imgCapiroWordmark.png"
            width="77"
            height="26"
            alt="Capiro"
          />
        </Link>
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
        <nav className={styles.globalActions} aria-label="Workspace actions">
          <button
            type="button"
            disabled
            aria-label="Quick log — unavailable"
            title="Quick log belongs to the Portfolio integration"
          >
            <ModuleAsset name="quickLog" />
          </button>
          <Link href="/calendar" aria-label="Master calendar">
            <ModuleAsset name="calendar" />
          </Link>
          <Link href="/modules/intelligence" aria-label="Search intelligence">
            <ModuleAsset name="search" />
          </Link>
          <button
            type="button"
            disabled
            aria-label="Updates — unavailable"
            title="Notifications integration is pending"
          >
            <ModuleAsset name="updates" />
          </button>
          <Link href="/settings/personal" aria-label="Account settings">
            <ModuleAsset name="profile" />
          </Link>
        </nav>
      }
    />
  );
}
