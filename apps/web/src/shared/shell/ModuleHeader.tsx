import Link from "next/link";
import { ModuleAsset } from "./ModuleAsset";
import styles from "./module-shell.module.css";

export function ModuleHeader({
  portfolioUrl,
  activeMode = "modules",
}: {
  portfolioUrl?: string;
  activeMode?: "meri" | "modules";
}) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Capiro Home">
        <img
          src="/design/modules/shared/imgCapiroWordmark.png"
          width="77"
          height="26"
          alt="Capiro"
        />
      </Link>
      <nav className={styles.modes} aria-label="Product modes">
        <Link
          href="/meri"
          aria-label="Meri"
          aria-current={activeMode === "meri" ? "page" : undefined}
          className={activeMode === "meri" ? styles.selectedMode : undefined}
        >
          <ModuleAsset name="meri" />
        </Link>
        {portfolioUrl ? (
          <a href={portfolioUrl} aria-label="Portfolio">
            <ModuleAsset name="portfolio" />
          </a>
        ) : (
          <button
            type="button"
            aria-label="Portfolio — connection pending"
            disabled
            title="Portfolio is being developed separately"
          >
            <ModuleAsset name="portfolio" />
          </button>
        )}
        <Link
          href="/modules"
          aria-label="Modules"
          aria-current={activeMode === "modules" ? "page" : undefined}
          className={activeMode === "modules" ? styles.selectedMode : undefined}
        >
          <ModuleAsset name="modules" />
        </Link>
      </nav>
      <nav className={styles.globalActions} aria-label="Workspace actions">
        <button
          type="button"
          disabled
          aria-label="Quick log — unavailable"
          title="Quick log belongs to the Portfolio integration"
        >
          <ModuleAsset name="quickLog" />
        </button>
        <Link href="/modules/calendar" aria-label="Master calendar">
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
    </header>
  );
}
