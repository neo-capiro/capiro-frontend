import { Button } from "@capiro/ui/button";
import Link from "next/link";
import { ScopedLink } from "./ScopedLink";
import { ModeLink } from "./ModeLink";
import { productModes } from "../session/client-route";
import { DesignIcon } from "./DesignIcon";
import { HeaderFrame } from "./HeaderFrame";
import styles from "./shell.module.css";

const actions = [
  { label: "Quick log", icon: "quick-log", href: "/?log=1" },
  { label: "Master calendar", icon: "calendar", href: "/calendar" },
  { label: "Search", icon: "search", href: "/modules/intelligence" },
  { label: "Updates", icon: "updates" },
];

export function Header({
  assetSet = "home",
}: {
  assetSet?: "home" | "cited-answer";
}) {
  return (
    <HeaderFrame
      className={styles.header}
      brand={
        <Link href="/" className={styles.brand} aria-label="Capiro Home">
          <img
            src="/design/home/wordmark.png"
            width="77"
            height="26"
            alt="Capiro"
          />
        </Link>
      }
      modes={
        <nav className={styles.modes} aria-label="Product modes">
          {productModes.map((mode) => (
            <Button
              key={mode.id}
              asChild
              variant="ghost"
              className={`${styles.mode} ${mode.id === "meri" ? styles.currentMode : ""}`}
            >
              <ModeLink
                mode={mode.id}
                aria-label={mode.label}
                aria-current={mode.id === "meri" ? "page" : undefined}
                title={mode.label}
              >
                <DesignIcon name={`mode-${mode.id}`} assetSet={assetSet} />
              </ModeLink>
            </Button>
          ))}
        </nav>
      }
      actions={
        <div className={styles.globalActions}>
          {actions.map((action) =>
            action.href ? (
              <Button
                key={action.label}
                asChild
                variant="ghost"
                className={styles.action}
              >
                <ScopedLink href={action.href} aria-label={action.label}>
                  <DesignIcon name={action.icon} assetSet={assetSet} />
                </ScopedLink>
              </Button>
            ) : (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                className={styles.action}
                disabled
                aria-label={`${action.label} — unavailable`}
              >
                <DesignIcon name={action.icon} assetSet={assetSet} />
              </Button>
            ),
          )}
          <Button asChild variant="ghost" className={styles.action}>
            <Link href="/settings/personal" aria-label="Account settings">
              <DesignIcon name="profile" assetSet={assetSet} />
            </Link>
          </Button>
        </div>
      }
    />
  );
}
